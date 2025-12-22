import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { format, parseISO, isAfter } from "date-fns";

export default function OverviewCalendarCard() {
  const { data: events = [] } = useQuery({
    queryKey: ["overview-events"],
    queryFn: () => base44.entities.Event.list("-created_date", 100),
    initialData: [],
  });

  const upcoming = (events || [])
    .filter((e) => e.start_time && isAfter(parseISO(e.start_time), new Date()))
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4 text-stone-500" /> Calendar
          <Badge variant="outline" className="ml-1 text-[10px]">
            {upcoming.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <p className="text-sm text-stone-500">No upcoming events.</p>
        ) : (
          <div className="space-y-2">
            {upcoming.slice(0, 3).map((e) => (
              <div key={e.id} className="text-sm">
                <div className="font-medium line-clamp-1">{e.title}</div>
                <div className="text-xs text-stone-500">
                  {format(parseISO(e.start_time), "MMM d, h:mm a")}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}