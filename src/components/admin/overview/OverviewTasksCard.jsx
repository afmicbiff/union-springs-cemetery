import React, { useMemo, memo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Loader2 } from "lucide-react";

const OverviewTasksCard = memo(function OverviewTasksCard() {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["overview-tasks"],
    queryFn: () => base44.entities.Task.filter({ is_archived: false }, "-created_date", 100),
    initialData: [],
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const { pending, overdue, top } = useMemo(() => {
    const p = (tasks || []).filter((t) => t.status === "To Do" || t.status === "In Progress");
    const od = p.filter((t) => t.due_date && new Date(t.due_date) < new Date());
    const tp = p
      .slice()
      .sort((a, b) => (a.due_date ? new Date(a.due_date).getTime() : Infinity) - (b.due_date ? new Date(b.due_date).getTime() : Infinity))
      .slice(0, 3);
    return { pending: p, overdue: od, top: tp };
  }, [tasks]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-stone-500" /> Tasks
          {!isLoading && <Badge variant="outline" className="ml-1 text-[10px]">{pending.length}</Badge>}
          {!isLoading && overdue.length > 0 && <Badge variant="destructive" className="ml-1 text-[10px]">{overdue.length} Overdue</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-stone-400" /></div>
        ) : pending.length === 0 ? (
          <p className="text-sm text-stone-500">No pending tasks.</p>
        ) : (
          <div className="space-y-2">
            {top.map((t) => (
              <div key={t.id} className="text-sm">
                <div className="font-medium line-clamp-1">{t.title}</div>
                <div className="text-xs text-stone-500">{t.due_date ? new Date(t.due_date).toLocaleDateString() : "No due date"}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default OverviewTasksCard;