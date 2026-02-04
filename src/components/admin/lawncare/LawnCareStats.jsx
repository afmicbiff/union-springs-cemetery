import React, { useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, CalendarDays } from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, isBefore } from "date-fns";

function toDateSafe(d) {
  if (!d) return null;
  return typeof d === "string" ? parseISO(d) : d;
}

function countByPeriod(schedules, period, today = new Date()) {
  const week = {
    start: startOfWeek(today, { weekStartsOn: 0 }),
    end: endOfWeek(today, { weekStartsOn: 0 })
  };
  const month = { start: startOfMonth(today), end: endOfMonth(today) };

  const range = period === "week" ? week : month;

  const upcoming = schedules.filter((s) => {
    const due = toDateSafe(s.next_due_date);
    return (
      due && isWithinInterval(due, { start: today, end: range.end }) && s.status !== "completed"
    );
  }).length;

  const overdue = schedules.filter((s) => {
    const due = toDateSafe(s.next_due_date);
    return (
      due && isWithinInterval(due, { start: range.start, end: today }) && isBefore(due, today) && s.status !== "completed"
    );
  }).length;

  const completed = schedules.filter((s) => {
    const comp = toDateSafe(s.last_completed_date);
    return comp && isWithinInterval(comp, { start: range.start, end: range.end });
  }).length;

  return { upcoming, overdue, completed };
}

const LawnCareStats = memo(function LawnCareStats({ schedules = [] }) {
  const { weekStats, monthStats } = useMemo(() => {
    const today = new Date();
    return {
      weekStats: countByPeriod(schedules, "week", today),
      monthStats: countByPeriod(schedules, "month", today)
    };
  }, [schedules]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lawn Care This Week & Month</CardTitle>
        <CardDescription>Snapshot of upcoming, overdue, and completed tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Week */}
          <div className="p-4 rounded-lg border bg-white">
            <div className="text-sm font-semibold text-stone-700 flex items-center gap-2 mb-3">
              <CalendarDays className="w-4 h-4 text-teal-700" /> Current Week
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded bg-teal-50">
                <div className="text-xs text-stone-500">Upcoming</div>
                <div className="text-2xl font-bold text-teal-800">{weekStats.upcoming}</div>
              </div>
              <div className="p-3 rounded bg-red-50">
                <div className="text-xs text-stone-500">Overdue</div>
                <div className="text-2xl font-bold text-red-700 flex items-center justify-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> {weekStats.overdue}
                </div>
              </div>
              <div className="p-3 rounded bg-green-50">
                <div className="text-xs text-stone-500">Completed</div>
                <div className="text-2xl font-bold text-green-700 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> {weekStats.completed}
                </div>
              </div>
            </div>
          </div>

          {/* Month */}
          <div className="p-4 rounded-lg border bg-white">
            <div className="text-sm font-semibold text-stone-700 flex items-center gap-2 mb-3">
              <CalendarDays className="w-4 h-4 text-teal-700" /> Current Month
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded bg-teal-50">
                <div className="text-xs text-stone-500">Upcoming</div>
                <div className="text-2xl font-bold text-teal-800">{monthStats.upcoming}</div>
              </div>
              <div className="p-3 rounded bg-red-50">
                <div className="text-xs text-stone-500">Overdue</div>
                <div className="text-2xl font-bold text-red-700 flex items-center justify-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> {monthStats.overdue}
                </div>
              </div>
              <div className="p-3 rounded bg-green-50">
                <div className="text-xs text-stone-500">Completed</div>
                <div className="text-2xl font-bold text-green-700 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> {monthStats.completed}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default LawnCareStats;