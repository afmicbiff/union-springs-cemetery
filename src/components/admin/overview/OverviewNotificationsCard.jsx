import React, { memo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Loader2 } from "lucide-react";
import { format } from "date-fns";

const OverviewNotificationsCard = memo(function OverviewNotificationsCard() {
  const { data: unread = [], isLoading } = useQuery({
    queryKey: ["overview-notifications"],
    queryFn: () => base44.entities.Notification.filter({ is_read: false }, "-created_at", 10),
    initialData: [],
    staleTime: 60 * 1000, // 1 min
    gcTime: 2 * 60 * 1000,
    refetchInterval: 60000, // Reduced from 30s to 60s for better mobile battery
    refetchOnWindowFocus: false,
    select: (all) => (all || []).filter(n => {
      const msg = (n.message || '').toLowerCase();
      return !msg.includes('performance regression') && !msg.includes('too many requests');
    }).slice(0, 3)
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bell className="h-4 w-4 text-stone-500" /> Notifications
          {!isLoading && unread.length > 0 && <Badge variant="destructive" className="ml-1 text-[10px]">{unread.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-stone-400" /></div>
        ) : unread.length === 0 ? (
          <p className="text-sm text-stone-500">No notifications.</p>
        ) : (
          <div className="space-y-2">
            {unread.map((n) => (
              <div key={n.id} className="text-sm">
                <div className="line-clamp-1">{n.message}</div>
                <div className="text-xs text-stone-500">{n.created_at ? format(new Date(n.created_at), "MMM d, h:mm a") : ""}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default OverviewNotificationsCard;