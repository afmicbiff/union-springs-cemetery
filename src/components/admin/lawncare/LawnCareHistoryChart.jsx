import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";

function toDateSafe(d) {
  if (!d) return null;
  return typeof d === "string" ? parseISO(d) : d;
}

const COLORS = ["#0f766e", "#16a34a", "#2563eb", "#d97706", "#dc2626", "#7c3aed", "#0891b2"]; // teal/green/blue/orange/red/purple/cyan

export default function LawnCareHistoryChart({ schedules = [] }) {
  const [monthsBack, setMonthsBack] = React.useState("6");
  const [selectedArea, setSelectedArea] = React.useState("top"); // "top" or a specific area

  const months = parseInt(monthsBack, 10);
  const now = new Date();
  const monthsArr = Array.from({ length: months }).map((_, idx) => {
    const d = subMonths(now, months - 1 - idx);
    return { key: format(d, "yyyy-MM"), label: format(d, "MMM yyyy"), start: startOfMonth(d), end: endOfMonth(d) };
  });

  // Gather completion records by area and month using last_completed_date
  const completions = schedules
    .filter((s) => s.last_completed_date)
    .map((s) => ({ area: s.area || "(Unassigned)", date: toDateSafe(s.last_completed_date) }))
    .filter((r) => r.date);

  // Determine top areas if "top" selected
  const areaCounts = completions.reduce((acc, r) => {
    acc[r.area] = (acc[r.area] || 0) + 1;
    return acc;
  }, {});

  const sortedAreas = Object.keys(areaCounts).sort((a, b) => areaCounts[b] - areaCounts[a]);
  const topAreas = sortedAreas.slice(0, 5);
  const allAreas = Array.from(new Set((schedules || []).map((s) => s.area || "(Unassigned)"))).sort();

  const activeAreas = selectedArea === "top" ? topAreas : [selectedArea];

  // Build chart data
  const data = monthsArr.map((m) => {
    const row = { name: m.label };
    activeAreas.forEach((area) => {
      const count = completions.filter(
        (r) => r.area === area && isWithinInterval(r.date, { start: m.start, end: m.end })
      ).length;
      row[area] = count;
    });
    return row;
  });

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

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              {activeAreas.map((area, idx) => (
                <Bar key={area} dataKey={area} stackId={selectedArea === "top" ? "a" : undefined} fill={COLORS[idx % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}