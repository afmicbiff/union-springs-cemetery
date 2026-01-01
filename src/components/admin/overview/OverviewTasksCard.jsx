import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare } from "lucide-react";

export default function OverviewTasksCard() {
  const { data: tasks = [] } = useQuery({
    queryKey: ["overview-tasks"],
    queryFn: () => base44.entities.Task.filter({ is_archived: false }, "-created_date", 200),
    initialData: [],
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const pending = (tasks || []).filter((t) => t.status === "To Do" || t.status === "In Progress");
  const overdue = pending.filter((t) => t.due_date && new Date(t.due_date) < new Date());
  const top = pending
    .slice()
    .sort((a, b) => (a.due_date ? new Date(a.due_date).getTime() : Infinity) - (b.due_date ? new Date(b.due_date).getTime() : Infinity))
    .slice(0, 3);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-stone-500" /> Tasks
          <Badge variant="outline" className="ml-1 text-[10px]">{pending.length}</Badge>
          {overdue.length > 0 && (
            <Badge variant="destructive" className="ml-1 text-[10px]">{overdue.length} Overdue</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pending.length === 0 ? (
          <p className="text-sm text-stone-500">No pending tasks.</p>
        ) : (
          <div className="space-y-2">
            {top.map((t) => (
              <div key={t.id} className="text-sm">
                <div className="font-medium line-clamp-1">{t.title}</div>
                <div className="text-xs text-stone-500">
                  {t.due_date ? new Date(t.due_date).toLocaleDateString() : "No due date"}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}