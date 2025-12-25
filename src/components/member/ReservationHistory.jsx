import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, CreditCard, Plus } from "lucide-react";

const statusColor = (s) => ({
  "Pending": "bg-amber-100 text-amber-800",
  "Pending Review": "bg-amber-100 text-amber-800",
  "Confirmed": "bg-green-100 text-green-800",
  "Rejected": "bg-red-100 text-red-800"
})[s] || "bg-gray-100 text-gray-800";

const payColor = (s) => ({
  "Pending": "bg-amber-100 text-amber-800",
  "Paid": "bg-green-100 text-green-800",
  "Failed": "bg-red-100 text-red-800"
})[s] || "bg-gray-100 text-gray-800";

export default function ReservationHistory() {
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const q = useQuery({
    queryKey: ["my-reservations", user?.email],
    enabled: !!user?.email,
    queryFn: async () => base44.entities.NewPlotReservation.filter({ requester_email: user.email }, "-created_date", 100),
    initialData: []
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Plot Reservations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {q.isLoading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : q.data?.length === 0 ? (
          <div className="text-sm text-gray-500 flex items-center justify-between">
            <span>No reservations yet.</span>
            <a href={createPageUrl('ReservePlot')} className="inline-flex items-center gap-1 text-teal-700 underline">
              <Plus className="w-4 h-4" /> Reserve a Plot
            </a>
          </div>
        ) : (
          q.data.map((r) => (
            <div key={r.id} className="border rounded-md p-3 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-medium">Section {r.section || "-"} • Plot {r.plot_number || "-"}</div>
                <div className="text-xs text-gray-600">Requested: {r.requested_date || "-"}</div>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge className={statusColor(r.status)}>{r.status}</Badge>
                  <Badge className={payColor(r.payment_status)}>{r.payment_status || 'Pending'}</Badge>
                  {typeof r.donation_amount === 'number' && (
                    <Badge variant="outline">Amount: ${r.donation_amount}</Badge>
                  )}
                </div>
                {r.signed_documents?.length > 0 && (
                  <div className="mt-1 text-xs text-gray-600 flex flex-wrap gap-2">
                    {r.signed_documents.map((d) => (
                      <button
                        key={d.id || d.file_uri}
                        type="button"
                        onClick={async () => {
                          const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: d.file_uri, expires_in: 300 });
                          if (signed_url) window.open(signed_url, '_blank', 'noopener');
                        }}
                        className="inline-flex items-center gap-1 underline"
                      >
                        <ExternalLink className="w-3 h-3" /> {d.name || 'Signed Doc'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {r.payment_status !== 'Paid' && r.status !== 'Rejected' && (
                  <Button title="Pay via Stripe (setup pending)" variant="default" className="gap-1" disabled>
                    <CreditCard className="w-4 h-4" /> Pay Now
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

async function awaitSignedUrl(file_uri) {
  try {
    const { data } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 300 });
    return data?.signed_url || '#';
  } catch {
    return '#';
  }
}