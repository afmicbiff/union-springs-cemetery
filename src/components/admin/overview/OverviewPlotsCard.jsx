import React, { memo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Map, Loader2 } from "lucide-react";

const OverviewPlotsCard = memo(function OverviewPlotsCard() {
  // Fetch only necessary fields to reduce payload size
  const { data: plots = [], isLoading } = useQuery({
    queryKey: ["overview-plots-counts"],
    queryFn: () => base44.entities.Plot.list("-created_date", 2000),
    initialData: [],
    staleTime: 10 * 60_000, // 10 min - plot counts don't change often
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    select: (data) => {
      // Compute counts in select to memoize
      return (data || []).reduce(
        (acc, p) => {
          const s = p.status || "Unknown";
          acc.total += 1;
          acc[s] = (acc[s] || 0) + 1;
          return acc;
        },
        { total: 0, Available: 0, Reserved: 0, Occupied: 0, Veteran: 0 }
      );
    }
  });

  const counts = plots;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Map className="h-4 w-4 text-stone-500" /> Plots
          {!isLoading && <Badge variant="outline" className="ml-1 text-[10px]">{counts.total}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
          </div>
        ) : counts.total === 0 ? (
          <p className="text-sm text-stone-500">No plots found.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-xs text-stone-700">
            <div>Available: <span className="font-semibold">{counts.Available}</span></div>
            <div>Reserved: <span className="font-semibold">{counts.Reserved}</span></div>
            <div>Occupied: <span className="font-semibold">{counts.Occupied}</span></div>
            <div>Veteran: <span className="font-semibold">{counts.Veteran}</span></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default OverviewPlotsCard;