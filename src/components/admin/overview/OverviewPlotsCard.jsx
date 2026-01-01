import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Map } from "lucide-react";

export default function OverviewPlotsCard() {
  const { data: plots = [] } = useQuery({
    queryKey: ["overview-plots"],
    queryFn: () => base44.entities.Plot.list({ limit: 1000 }),
    initialData: [],
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const counts = (plots || []).reduce(
    (acc, p) => {
      const s = p.status || "Unknown";
      acc.total += 1;
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    { total: 0 }
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Map className="h-4 w-4 text-stone-500" /> Plots
          <Badge variant="outline" className="ml-1 text-[10px]">{counts.total}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {counts.total === 0 ? (
          <p className="text-sm text-stone-500">No plots found.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-xs text-stone-700">
            <div>Available: <span className="font-semibold">{counts["Available"] || 0}</span></div>
            <div>Reserved: <span className="font-semibold">{counts["Reserved"] || 0}</span></div>
            <div>Occupied: <span className="font-semibold">{counts["Occupied"] || 0}</span></div>
            <div>Veteran: <span className="font-semibold">{counts["Veteran"] || 0}</span></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}