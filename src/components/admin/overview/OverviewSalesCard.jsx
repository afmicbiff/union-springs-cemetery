import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function OverviewSalesCard() {
  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ["overview-reservations"],
    queryFn: () => base44.entities.NewPlotReservation.list("-requested_date", 50),
    initialData: [],
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const pending = useMemo(() => 
    (reservations || []).filter((r) => r.status === "Pending" || r.status === "Pending Review").slice(0, 3),
    [reservations]
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-stone-500" /> Sales (Reservations)
          {!isLoading && <Badge variant="outline" className="ml-1 text-[10px]">{pending.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-stone-400" /></div>
        ) : pending.length === 0 ? (
          <p className="text-sm text-stone-500">No pending reservations.</p>
        ) : (
          <div className="space-y-2">
            {pending.map((r) => (
              <div key={r.id} className="text-sm">
                <div className="font-medium line-clamp-1">{r.requester_name || "Unknown"}</div>
                <div className="text-xs text-stone-500">{r.requested_date ? format(new Date(r.requested_date), "MMM d, yyyy") : ""} • {r.status}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}