import React, { useMemo, memo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Loader2, AlertCircle } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";

// Safe date formatter
const formatSafeDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    return isValid(date) ? format(date, "MMM d, yyyy") : "";
  } catch {
    return "";
  }
};

const OverviewNewsCard = memo(function OverviewNewsCard() {
  const { data: announcements = [], isLoading, isError, error } = useQuery({
    queryKey: ["overview-announcements"],
    queryFn: () => base44.entities.Announcement.list("-date", 10),
    initialData: [],
    staleTime: 10 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const active = useMemo(() => {
    if (!Array.isArray(announcements)) return [];
    return announcements
      .filter((a) => a && a.is_active !== false && a.title)
      .slice(0, 3);
  }, [announcements]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-stone-500" /> News
          {!isLoading && !isError && <Badge variant="outline" className="ml-1 text-[10px]">{active.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2 text-xs text-red-600 py-2">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Failed to load news</span>
          </div>
        ) : active.length === 0 ? (
          <p className="text-sm text-stone-500">No active announcements.</p>
        ) : (
          <div className="space-y-2">
            {active.map((a) => (
              <div key={a.id} className="text-sm border-l-2 border-teal-200 pl-2">
                <div className="font-medium line-clamp-1 text-stone-800">{a.title}</div>
                <div className="text-xs text-stone-500">{formatSafeDate(a.date)}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default OverviewNewsCard;