import React, { memo, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Loader2, Check, AlertCircle, RefreshCw } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Safe date formatting helper
function safeFormatDate(dateStr, formatStr = "MMM d, h:mm a") {
  if (!dateStr) return "";
  try {
    const d = typeof dateStr === "string" ? parseISO(dateStr) : new Date(dateStr);
    return isValid(d) ? format(d, formatStr) : "";
  } catch {
    return "";
  }
}

// Memoized notification item
const NotificationItem = memo(function NotificationItem({ notification, onMarkRead }) {
  const typeColors = {
    alert: "border-l-red-500",
    info: "border-l-blue-500",
    task: "border-l-amber-500",
    message: "border-l-teal-500",
    document: "border-l-purple-500",
  };

  const borderClass = typeColors[notification.type] || "border-l-stone-300";

  return (
    <div className={`text-sm border-l-2 pl-2 py-1 ${borderClass} group`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-xs sm:text-sm text-stone-700">{notification.message}</div>
          <div className="text-[10px] sm:text-xs text-stone-400 mt-0.5">
            {safeFormatDate(notification.created_at || notification.created_date)}
          </div>
        </div>
        <button
          onClick={() => onMarkRead(notification.id)}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-stone-100 rounded transition-all shrink-0"
          title="Mark as read"
          aria-label="Mark as read"
        >
          <Check className="w-3 h-3 text-stone-400 hover:text-teal-600" />
        </button>
      </div>
    </div>
  );
});

const OverviewNotificationsCard = memo(function OverviewNotificationsCard() {
  const queryClient = useQueryClient();

  const { data: unread = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["overview-notifications"],
    queryFn: () => base44.entities.Notification.filter({ is_read: false }, "-created_at", 10),
    initialData: [],
    staleTime: 60 * 1000,
    gcTime: 2 * 60 * 1000,
    refetchInterval: 90000, // 90s for better mobile battery
    refetchOnWindowFocus: false,
    retry: 2,
    select: (all) =>
      (all || [])
        .filter((n) => {
          const msg = (n.message || "").toLowerCase();
          return !msg.includes("performance regression") && !msg.includes("too many requests");
        })
        .slice(0, 5),
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["overview-notifications"] }),
  });

  const handleMarkRead = useCallback(
    (id) => {
      markReadMutation.mutate(id);
    },
    [markReadMutation]
  );

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isError) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4 text-stone-500" /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-4 text-center">
            <AlertCircle className="w-6 h-6 text-red-400 mb-2" />
            <p className="text-xs text-stone-500 mb-2">Failed to load</p>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching} className="h-7 text-xs">
              {isFetching ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6">
        <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2">
          <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-stone-500" /> 
          <span>Notifications</span>
          {!isLoading && unread.length > 0 && (
            <Badge variant="destructive" className="ml-1 text-[9px] sm:text-[10px] h-4 sm:h-5 px-1 sm:px-1.5">
              {unread.length}
            </Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isFetching} className="h-6 w-6 sm:h-7 sm:w-7">
          <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
          </div>
        ) : unread.length === 0 ? (
          <div className="text-center py-4">
            <Bell className="w-6 h-6 mx-auto mb-2 text-stone-200" />
            <p className="text-xs sm:text-sm text-stone-500">No new notifications</p>
          </div>
        ) : (
          <div className="space-y-2">
            {unread.map((n) => (
              <NotificationItem key={n.id} notification={n} onMarkRead={handleMarkRead} />
            ))}
            {unread.length >= 5 && (
              <Link
                to={createPageUrl("Admin") + "?tab=notifications"}
                className="block text-center text-xs text-teal-600 hover:text-teal-700 pt-2 border-t border-stone-100"
              >
                View all notifications →
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default OverviewNotificationsCard;