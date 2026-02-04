import React, { useState, useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";

// Lazy load recharts for bundle optimization
const LazyChart = React.lazy(() => import("recharts").then(m => ({
  default: ({ data, activeAreas, selectedArea, COLORS }) => (
    <m.ResponsiveContainer width="100%" height="100%">
      <m.BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <m.CartesianGrid strokeDasharray="3 3" />
        <m.XAxis dataKey="name" />
        <m.YAxis allowDecimals={false} />
        <m.Tooltip />
        <m.Legend />
        {activeAreas.map((area, idx) => (
          <m.Bar key={area} dataKey={area} stackId={selectedArea === "top" ? "a" : undefined} fill={COLORS[idx % COLORS.length]} />
        ))}
      </m.BarChart>
    </m.ResponsiveContainer>
  )
})));

function toDateSafe(d) {
  if (!d) return null;
  return typeof d === "string" ? parseISO(d) : d;
}

const COLORS = ["#0f766e", "#16a34a", "#2563eb", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

const LawnCareHistoryChart = memo(function LawnCareHistoryChart({ schedules = [] }) {
  const [monthsBack, setMonthsBack] = useState("6");
  const [selectedArea, setSelectedArea] = useState("top");

  const { data, activeAreas, allAreas } = useMemo(() => {
    const months = parseInt(monthsBack, 10);
    const now = new Date();
    const monthsArr = Array.from({ length: months }).map((_, idx) => {
      const d = subMonths(now, months - 1 - idx);
      return { key: format(d, "yyyy-MM"), label: format(d, "MMM yyyy"), start: startOfMonth(d), end: endOfMonth(d) };
    });

    const completions = schedules
      .filter((s) => s.last_completed_date)
      .map((s) => ({ area: s.area || "(Unassigned)", date: toDateSafe(s.last_completed_date) }))
      .filter((r) => r.date);

    const areaCounts = completions.reduce((acc, r) => {
      acc[r.area] = (acc[r.area] || 0) + 1;
      return acc;
    }, {});

    const sortedAreas = Object.keys(areaCounts).sort((a, b) => areaCounts[b] - areaCounts[a]);
    const topAreas = sortedAreas.slice(0, 5);
    const allAreasArr = Array.from(new Set((schedules || []).map((s) => s.area || "(Unassigned)"))).sort();
    const active = selectedArea === "top" ? topAreas : [selectedArea];

    const chartData = monthsArr.map((m) => {
      const row = { name: m.label };
      active.forEach((area) => {
        const count = completions.filter(
          (r) => r.area === area && isWithinInterval(r.date, { start: m.start, end: m.end })
        ).length;
        row[area] = count;
      });
      return row;
    });

    return { data: chartData, activeAreas: active, allAreas: allAreasArr };
  }, [schedules, monthsBack, selectedArea]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance History</CardTitle>
        <CardDescription>Completions per area over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="w-full md:w-48">
            <Select value={monthsBack} onValueChange={setMonthsBack}>
              <SelectTrigger>
                <SelectValue placeholder="Months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Last 3 months</SelectItem>
                <SelectItem value="6">Last 6 months</SelectItem>
                <SelectItem value="12">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-64">
            <Select value={selectedArea} onValueChange={setSelectedArea}>
              <SelectTrigger>
                <SelectValue placeholder="Area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Top 5 areas</SelectItem>
                {allAreas.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="h-64 sm:h-72">
          <React.Suspense fallback={<div className="w-full h-full bg-gray-50 rounded animate-pulse flex items-center justify-center text-sm text-gray-400">Loading chart...</div>}>
            <LazyChart data={data} activeAreas={activeAreas} selectedArea={selectedArea} COLORS={COLORS} />
          </React.Suspense>
        </div>
      </CardContent>
    </Card>
  );
});

export default LawnCareHistoryChart;