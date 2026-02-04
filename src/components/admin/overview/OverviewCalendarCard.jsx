import React, { useMemo, memo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Loader2 } from "lucide-react";
import { format, parseISO, isAfter } from "date-fns";

const OverviewCalendarCard = memo(function OverviewCalendarCard() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["overview-events"],
    queryFn: () => base44.entities.Event.list("-start_time", 50),
    initialData: [],
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const upcoming = useMemo(() => 
    (events || [])
      .filter((e) => e.start_time && isAfter(parseISO(e.start_time), new Date()))
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
      .slice(0, 3),
    [events]
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4 text-stone-500" /> Calendar
          {!isLoading && <Badge variant="outline" className="ml-1 text-[10px]">{upcoming.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-stone-400" /></div>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-stone-500">No upcoming events.</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((e) => (
              <div key={e.id} className="text-sm">
                <div className="font-medium line-clamp-1">{e.title}</div>
                <div className="text-xs text-stone-500">{format(parseISO(e.start_time), "MMM d, h:mm a")}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default OverviewCalendarCard;