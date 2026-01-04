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
const MAX_HISTORY_STORAGE = 1000;
const MAX_RENDER_POINTS = 300;
const FLUSH_INTERVAL_MS = 1000;
const SAVE_INTERVAL_MS = 2000;
const SAVE_EVERY = 20;

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
  const [live, setLive] = React.useState(true);
  const [inView, setInView] = React.useState(false);
  const containerRef = React.useRef(null);
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

  // Subscribe to metrics updates with throttling and merge
  React.useEffect(() => {
    if (!live) return;
    const bufferRef = { items: [] };
    let flushTimer = null;

    const flush = () => {
      if (bufferRef.items.length === 0) return;
      const last = bufferRef.items[bufferRef.items.length - 1];
      bufferRef.items = [];
      flushTimer = null;
      React.startTransition(() => {
        setSamples((prev) => {
          const next = [...prev, last];
          return next;
        });
      });
    };

    const unsub = subscribeMetrics?.((m) => {
      const entry = { ts: Date.now(), ...m };
      bufferRef.items.push(entry);
      if (!flushTimer) {
        flushTimer = setTimeout(flush, FLUSH_INTERVAL_MS);
      }
    });

    return () => {
      if (typeof unsub === "function") unsub();
      if (flushTimer) clearTimeout(flushTimer);
    };
  }, [live]);

  // Batch-persist history to localStorage
  const saveCounterRef = React.useRef(0);
  const lastSaveRef = React.useRef(Date.now());
  React.useEffect(() => {
    saveCounterRef.current += 1;
    const now = Date.now();
    if (saveCounterRef.current >= SAVE_EVERY || (now - lastSaveRef.current) >= SAVE_INTERVAL_MS) {
      saveHistory(samples);
      saveCounterRef.current = 0;
      lastSaveRef.current = now;
    }
  }, [samples]);

  // Lazy render charts only when in view
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        obs.disconnect();
      }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => { try { obs.disconnect(); } catch {} };
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
  const renderData = React.useMemo(() => (data.length > MAX_RENDER_POINTS ? data.slice(-MAX_RENDER_POINTS) : data), [data]);

  const clearHistory = () => {
    saveHistory([]);
    setSamples([]);
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Performance Trends</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant={live ? "secondary" : "outline"} size="sm" onClick={() => setLive(v => !v)}>
            {live ? "Live: On" : "Live: Off"}
          </Button>
          <Button variant="outline" size="sm" onClick={clearHistory}>Clear History</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        <div ref={containerRef}>
        {!hasData ? (
          <div className="text-sm text-stone-500">No samples yet. Browse the app to generate metrics.</div>
        ) : (
          inView ? (
            <>
            {/* Load Time & Requests */}
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <LineChart data={renderData} syncId="perf">
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
                <LineChart data={renderData} syncId="perf">
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
                <AreaChart data={renderData} syncId="perf">
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
                <BarChart data={renderData} syncId="perf">
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
                <LineChart data={renderData} syncId="perf">
                  <XAxis dataKey="time" hide />
                  <Brush dataKey="time" height={24} travellerWidth={8} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="text-sm text-stone-500">Charts will render when visible…</div>
        )}
        </div>
      </CardContent>
    </Card>
  );
}