import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";
import { format } from "date-fns";

export default function OverviewNewsCard() {
  const { data: announcements = [] } = useQuery({
    queryKey: ["overview-announcements"],
    queryFn: () => base44.entities.Announcement.list("-created_date", 20),
    initialData: [],
  });

  const active = (announcements || []).filter((a) => a.is_active !== false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-stone-500" /> News
          <Badge variant="outline" className="ml-1 text-[10px]">{active.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {active.length === 0 ? (
          <p className="text-sm text-stone-500">No active announcements.</p>
        ) : (
          <div className="space-y-2">
            {active.slice(0, 3).map((a) => (
              <div key={a.id} className="text-sm">
                <div className="font-medium line-clamp-1">{a.title}</div>
                <div className="text-xs text-stone-500">
                  {a.date ? format(new Date(a.date), "MMM d, yyyy") : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}