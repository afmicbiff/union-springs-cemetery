import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";
import { format } from "date-fns";

export default function OverviewSalesCard() {
  const { data: reservations = [] } = useQuery({
    queryKey: ["overview-reservations"],
    queryFn: () => base44.entities.NewPlotReservation.list("-created_date", 100),
    initialData: [],
  });

  const pending = (reservations || []).filter(
    (r) => r.status === "Pending" || r.status === "Pending Review"
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-stone-500" /> Sales (Reservations)
          <Badge variant="outline" className="ml-1 text-[10px]">{pending.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pending.length === 0 ? (
          <p className="text-sm text-stone-500">No pending reservations.</p>
        ) : (
          <div className="space-y-2">
            {pending.slice(0, 3).map((r) => (
              <div key={r.id} className="text-sm">
                <div className="font-medium line-clamp-1">{r.requester_name || "Unknown"}</div>
                <div className="text-xs text-stone-500">
                  {r.requested_date ? format(new Date(r.requested_date), "MMM d, yyyy") : ""} • {r.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}