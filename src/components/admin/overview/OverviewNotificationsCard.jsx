import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { format } from "date-fns";

export default function OverviewNotificationsCard() {
  const { data: unread = [] } = useQuery({
    queryKey: ["overview-notifications"],
    queryFn: async () => {
      const all = await base44.entities.Notification.filter({ is_read: false }, "-created_at", 20);
      // Filter out performance regression / too many requests notifications
      return (all || []).filter(n => {
        const msg = (n.message || '').toLowerCase();
        return !msg.includes('performance regression') && !msg.includes('too many requests');
      });
    },
    initialData: [],
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bell className="h-4 w-4 text-stone-500" /> Notifications
          <Badge variant="destructive" className="ml-1 text-[10px]">{unread.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {unread.length === 0 ? (
          <p className="text-sm text-stone-500">No notifications.</p>
        ) : (
          <div className="space-y-2">
            {unread.slice(0, 3).map((n) => (
              <div key={n.id} className="text-sm">
                <div className="line-clamp-1">{n.message}</div>
                <div className="text-xs text-stone-500">
                  {n.created_at ? format(new Date(n.created_at), "MMM d, h:mm a") : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}