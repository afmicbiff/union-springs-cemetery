import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { addMonths, subMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from "lucide-react";

export default function ReservationCalendar() {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState(null);

  const { data: plots, isLoading } = useQuery({
    queryKey: ["pending-newplot-expiries"],
    queryFn: async () => {
      const rows = await base44.entities.NewPlot.filter({ status: "Pending Reservation" }, undefined, 1000);
      return (rows || []).filter(r => (r.reservation_expiry_date || "").trim() !== "");
    },
    initialData: [],
    refetchInterval: 60 * 1000,
  });

  const byDate = React.useMemo(() => {
    const map = {};
    plots.forEach((p) => {
      const key = (p.reservation_expiry_date || "").slice(0, 10);
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [plots]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const selectedKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const selectedItems = selectedKey ? (byDate[selectedKey] || []) : [];

  return (
    <div className="bg-white border rounded-md p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-teal-700" />
          <h4 className="font-semibold text-stone-900">Reservation Holds by Expiry</h4>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-sm font-medium w-32 text-center">{format(currentMonth, "MMMM yyyy")}</div>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-[11px] text-stone-500 mb-1">
        {"Sun,Mon,Tue,Wed,Thu,Fri,Sat".split(",").map((d) => (
          <div key={d} className="px-1 py-1 text-center">{d}</div>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-stone-500 p-6">Loading calendar…</div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const count = (byDate[key] || []).length;
            const isOther = !isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            return (
              <button
                key={key}
                onClick={() => setSelectedDate(day)}
                className={`min-h-[64px] rounded-md border p-1 text-left transition-colors ${
                  isSelected ? "border-teal-600 ring-2 ring-teal-200" : "border-stone-200"
                } ${isOther ? "bg-stone-50 text-stone-400" : "bg-white"}`}
              >
                <div className="text-[11px] font-medium">{format(day, "d")}</div>
                {count > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock className="w-3 h-3" /> {count} expiring
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        {selectedDate ? (
          <div>
            <div className="text-sm font-semibold text-stone-800 mb-2">{format(selectedDate, "PPP")} — {selectedItems.length} hold(s)</div>
            {selectedItems.length === 0 ? (
              <div className="text-sm text-stone-500">No holds expiring this day.</div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {selectedItems.map((p) => (
                  <a
                    key={p.id}
                    href={`${window.location.origin}/NewPlotDetails?id=${p.id}`}
                    className="block border rounded-md p-2 hover:bg-stone-50"
                  >
                    <div className="text-sm font-medium text-stone-900">Plot {p.plot_number || "-"} • Section {p.section || "-"}</div>
                    <div className="text-xs text-stone-600">Row: {p.row_number || "-"}</div>
                    <div className="text-xs text-stone-600">Expiry: {p.reservation_expiry_date}</div>
                  </a>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-stone-500">Select a day to view details.</div>
        )}
      </div>
    </div>
  );
}