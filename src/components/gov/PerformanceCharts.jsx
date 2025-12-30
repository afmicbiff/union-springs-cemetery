import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush,
  AreaChart,
  Area,
  BarChart,
  Bar
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentMetrics, subscribeMetrics } from "@/components/gov/metrics";

const STORAGE_KEY = "perfHistory";

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveHistory(samples) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(samples));
  } catch {}
}

export default function PerformanceCharts() {
  const [samples, setSamples] = React.useState(() => {
    const hist = loadHistory();
    const now = Date.now();
    const current = getCurrentMetrics?.() || {};
    if (hist.length === 0 && (current && Object.keys(current).length)) {
      const seed = [{ ts: now, ...current }];
      saveHistory(seed);
      return seed;
    }
    return hist;
  });

  // Subscribe to metrics updates and append to history
  React.useEffect(() => {
    const unsub = subscribeMetrics?.((m) => {
      const entry = { ts: Date.now(), ...m };
      setSamples((prev) => {
        const next = [...prev, entry].slice(-1000); // keep last 1000 points
        saveHistory(next);
        return next;
      });
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  const data = React.useMemo(() => {
    return (samples || []).map((s) => ({
      ts: s.ts,
      time: new Date(s.ts).toLocaleTimeString(),
      loadTime: Number(s.loadTime) || 0,
      lcp: Number(s.lcp) || 0,
      inp: Number(s.inp) || 0,
      cls: typeof s.cls === "number" ? s.cls : Number(s.cls) || 0,
      payloadKB: typeof s.payloadBytes === "number" ? +(s.payloadBytes / 1024).toFixed(1) : 0,
      requests: Number(s.requestCount) || 0,
    }));
  }, [samples]);

  const hasData = data.length > 0;

  const clearHistory = () => {
    saveHistory([]);
    setSamples([]);
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Performance Trends</CardTitle>
        <Button variant="outline" size="sm" onClick={clearHistory}>Clear History</Button>
      </CardHeader>
      <CardContent className="space-y-8">
        {!hasData ? (
          <div className="text-sm text-stone-500">No samples yet. Browse the app to generate metrics.</div>
        ) : (
          <>
            {/* Load Time & Requests */}
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <LineChart data={data} syncId="perf">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" minTickGap={24} />
                  <YAxis yAxisId="left" label={{ value: "ms", angle: -90, position: "insideLeft" }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: "req", angle: -90, position: "insideRight" }} />
                  <Tooltip formatter={(v, n) => [n === 'payloadKB' ? `${v} KB` : n === 'cls' ? v : `${v} ms`, n]} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="loadTime" name="Load Time" stroke="#0ea5e9" dot={false} strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="requests" name="Requests" stroke="#22c55e" dot={false} strokeWidth={2} />
                  <Brush dataKey="time" height={24} travellerWidth={8} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Web Vitals: LCP & INP */}
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <LineChart data={data} syncId="perf">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" minTickGap={24} />
                  <YAxis label={{ value: "ms", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="lcp" name="LCP" stroke="#ef4444" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="inp" name="INP" stroke="#f59e0b" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* CLS separate scale */}
            <div className="h-48 w-full">
              <ResponsiveContainer>
                <AreaChart data={data} syncId="perf">
                  <defs>
                    <linearGradient id="clsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" minTickGap={24} />
                  <YAxis domain={[0, 1]} tickFormatter={(v) => v.toFixed(2)} />
                  <Tooltip formatter={(v) => v.toFixed(3)} />
                  <Legend />
                  <Area type="monotone" dataKey="cls" name="CLS" stroke="#8b5cf6" fillOpacity={1} fill="url(#clsFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Payload (KB) */}
            <div className="h-48 w-full">
              <ResponsiveContainer>
                <BarChart data={data} syncId="perf">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" minTickGap={24} />
                  <YAxis label={{ value: "KB", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="payloadKB" name="Payload (KB)" fill="#06b6d4" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Shared zoom/brush at the end to control all charts */}
            <div className="h-20 w-full">
              <ResponsiveContainer>
                <LineChart data={data} syncId="perf">
                  <XAxis dataKey="time" hide />
                  <Brush dataKey="time" height={24} travellerWidth={8} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}