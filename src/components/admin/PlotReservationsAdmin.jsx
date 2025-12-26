import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Eye, Trash2, CheckCircle2, XCircle, Mail, DollarSign, ExternalLink, FileText, Edit3 } from "lucide-react";

function StatusBadge({ status }) {
  const map = {
    "Pending": "bg-amber-100 text-amber-800",
    "Pending Review": "bg-amber-100 text-amber-800",
    "Confirmed": "bg-green-100 text-green-800",
    "Rejected": "bg-red-100 text-red-800",
  };
  return <Badge className={map[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
}

export default function PlotReservationsAdmin() {
  const qc = useQueryClient();

  const reservations = useQuery({
    queryKey: ["all-new-plot-reservations"],
    queryFn: async () => await base44.entities.NewPlotReservation.filter({}, "-created_date", 500),
    initialData: [],
  });

  const approveMutation = useMutation({
    mutationFn: async (r) => {
      await base44.entities.NewPlotReservation.update(r.id, {
        status: "Confirmed",
        confirmed_date: new Date().toISOString().slice(0, 10),
      });
      if (r.new_plot_id) {
        await base44.entities.NewPlot.update(r.new_plot_id, { status: "Reserved" });
      }
      await base44.functions.invoke("notifyReservationEvent", {
        event: "status_change",
        status: "Confirmed",
        reservationId: r.id,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-new-plot-reservations"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ r, reason }) => {
      await base44.entities.NewPlotReservation.update(r.id, {
        status: "Rejected",
        rejection_reason: reason || "",
        rejected_date: new Date().toISOString().slice(0, 10),
      });
      if (r.new_plot_id) {
        await base44.entities.NewPlot.update(r.new_plot_id, { status: "Available" });
      }
      await base44.functions.invoke("notifyReservationEvent", {
        event: "status_change",
        status: "Rejected",
        reservationId: r.id,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-new-plot-reservations"] }),
  });

  const paymentMutation = useMutation({
    mutationFn: async ({ r, payment_status, payment_reference }) => {
      await base44.entities.NewPlotReservation.update(r.id, {
        payment_status,
        payment_reference: payment_reference || null,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-new-plot-reservations"] }),
  });

  const removeDocMutation = useMutation({
    mutationFn: async ({ r, docId }) => {
      const next = (r.signed_documents || []).filter((d) => d.id !== docId);
      await base44.entities.NewPlotReservation.update(r.id, { signed_documents: next });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-new-plot-reservations"] }),
  });

  const sendReminder = async (r) => {
    await base44.functions.invoke("notifyReservationEvent", {
      event: "payment_reminder",
      reservationId: r.id,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plot Reservation Requests</CardTitle>
        <CardDescription>Admin-only panel to approve/reject, manage payments, and access signed documents.</CardDescription>
      </CardHeader>
      <CardContent>
        {reservations.isLoading ? (
          <div className="text-sm text-gray-500">Loading reservations…</div>
        ) : reservations.data.length === 0 ? (
          <div className="text-sm text-gray-500">No reservation requests yet.</div>
        ) : (
          <div className="space-y-3">
            {reservations.data.map((r) => (
              <div key={r.id} className="border rounded-md p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="font-medium text-sm">
                      {r.requester_name || "Unknown"} <span className="text-gray-500">•</span> {r.requester_email}
                    </div>
                    <div className="text-xs text-gray-600">
                      Plot: {r.new_plot_id || "-"} • Requested: {r.requested_date || "-"}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <StatusBadge status={r.status} />
                      <Badge variant="outline">Payment: {r.payment_status || "Pending"}</Badge>
                      {typeof r.donation_amount === "number" && (
                        <Badge variant="outline">Amount: ${r.donation_amount}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => approveMutation.mutate(r)} disabled={r.status === "Confirmed"} className="gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      const reason = window.prompt("Reason for rejection (optional)") || "";
                      rejectMutation.mutate({ r, reason });
                    }} disabled={r.status === "Rejected"} className="gap-1">
                      <XCircle className="w-4 h-4" /> Reject
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => sendReminder(r)} className="gap-1">
                      <Mail className="w-4 h-4" /> Payment Reminder
                    </Button>
                  </div>
                </div>

                {/* Payment controls */}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                  <div>
                    <label className="text-xs text-gray-600">Payment Status</label>
                    <Select defaultValue={r.payment_status || "Pending"} onValueChange={(v) => paymentMutation.mutate({ r, payment_status: v, payment_reference: r.payment_reference })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Payment Reference</label>
                    <div className="flex gap-2">
                      <Input defaultValue={r.payment_reference || ""} placeholder="e.g. check #, txn id" id={`ref-${r.id}`} />
                      <Button size="sm" onClick={() => {
                        const el = document.getElementById(`ref-${r.id}`);
                        paymentMutation.mutate({ r, payment_status: r.payment_status || "Pending", payment_reference: el?.value || "" });
                      }}>Save</Button>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                {r.signed_documents?.length > 0 && (
                  <div className="mt-3 text-xs text-gray-700">
                    <div className="font-semibold mb-1">Signed Documents</div>
                    <div className="flex flex-wrap gap-2">
                      {r.signed_documents.map((d) => (
                        <div key={d.id} className="flex items-center gap-2 border rounded px-2 py-1">
                          <span className="truncate max-w-[12rem]" title={d.name || d.file_uri}>{d.name || "Signed Doc"}</span>
                          <Button size="icon" variant="ghost" onClick={async () => {
                            const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: d.file_uri, expires_in: 300 });
                            if (signed_url) window.open(signed_url, "_blank", "noopener");
                          }}>
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => removeDocMutation.mutate({ r, docId: d.id })}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}