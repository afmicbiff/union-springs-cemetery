import React from "react";
import { getCurrentMetrics, subscribeMetrics } from "@/components/gov/metrics";
import { base44 } from "@/api/base44Client";
import { filterEntity } from "@/components/gov/dataClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Code } from "lucide-react";

const AiAnalyticsPanel = React.lazy(() => import("@/components/gov/AiAnalyticsPanel.jsx"));
const PerformanceCharts = React.lazy(() => import("@/components/gov/PerformanceCharts.jsx"));

export default function PerformanceDashboard() {
  const [metrics, setMetrics] = React.useState(getCurrentMetrics());
  const [user, setUser] = React.useState(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState(null);
  const [aiResult, setAiResult] = React.useState(null);

  // Fallback: load latest persisted Web Vitals when local metrics are missing
  const { data: vitalsLatest } = useQuery({
    queryKey: ['webVitalsLatest'],
    queryFn: async ({ signal }) => {
      const [lcpArr, inpArr] = await Promise.all([
        filterEntity('WebVital', { name: 'LCP' }, { sort: '-created_date', limit: 1, select: ['value'], persist: true, ttlMs: 10 * 60_000 }, { signal }),
        filterEntity('WebVital', { name: 'INP' }, { sort: '-created_date', limit: 1, select: ['value'], persist: true, ttlMs: 10 * 60_000 }, { signal }),
      ]);
      return {
        lcp: Number(lcpArr?.[0]?.value) || null,
        inp: Number(inpArr?.[0]?.value) || null,
      };
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const lcpValue = typeof metrics.lcp === 'number' ? metrics.lcp : vitalsLatest?.lcp ?? undefined;
  const inpValue = typeof metrics.inp === 'number' ? metrics.inp : vitalsLatest?.inp ?? undefined;

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
    const unsub = subscribeMetrics(setMetrics);
    return () => unsub();
  }, []);

  const reload = () => setMetrics(getCurrentMetrics());
  const isAdmin = user?.role === "admin";

  const analyzeWithAI = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const flags = [];
      if (metrics.payloadBytes > 1.5 * 1024 * 1024) flags.push("Payload large");
      if (metrics.requestCount > 50) flags.push("Many requests");
      if (lcpValue > 2500) flags.push("LCP slow");
      if (metrics.cls > 0.1) flags.push("CLS high");
      if (inpValue > 200) flags.push("INP slow");

      const prompt = `You are an expert React performance engineer working on a Base44 (React + Tailwind + React Query) app.\n\nGovernance rules to enforce strictly:\n- Performance-first: minimize payload, defer non-critical work.\n- Data discipline: bounded queries, pagination, field selection, request cancellation.\n- Rendering discipline: memoization, avoid derived state, virtualize large lists.\n- Network: batch calls, dedupe, cache correctly.\n- Asset: lazy-load heavy assets.\n- Layout: prevent CLS.\n- Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms.\n\nGiven current metrics and flags, list prioritized issues with actionable fixes and minimal code snippets tailored to Base44 (use base44 SDK, @tanstack/react-query, AbortController signal from queryFn).\n\nMetrics JSON: ${JSON.stringify(metrics)}\nFlags: ${flags.join(", ") || "none"}\n\nOutput strict JSON: {\n  "global_prompt": string,\n  "issues": [{\n    "title": string,\n    "severity": "low"|"medium"|"high"|"critical",\n    "summary": string,\n    "root_cause": string,\n    "fixes": string[],\n    "code_suggestion": {"language":"js"|"jsx","snippet": string}\n  }]\n}`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            global_prompt: { type: "string" },
            issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  severity: { type: "string" },
                  summary: { type: "string" },
                  root_cause: { type: "string" },
                  fixes: { type: "array", items: { type: "string" } },
                  code_suggestion: {
                    type: "object",
                    properties: {
                      language: { type: "string" },
                      snippet: { type: "string" }
                    }
                  }
                },
                required: ["title", "severity", "summary", "fixes"]
              }
            }
          },
          required: ["issues"]
        }
      });

      const payload = res?.data ?? res;
      setAiResult(payload);
    } catch (e) {
      setAiError(e?.message || "AI analysis failed");
    } finally {
      setAiLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen w-full bg-stone-100 p-6">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Performance Dashboard</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-stone-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Restricted. Admins only.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const kb = (n) => (typeof n === "number" ? (n / 1024).toFixed(1) + " KB" : "-");
  const ms = (n) => (typeof n === "number" ? Math.round(n) + " ms" : "-");

  // Severity thresholds (green <=, yellow <=, else red)
  const thresholds = {
    loadTime: { green: 2000, yellow: 3500 },
    payloadBytes: { green: 1 * 1024 * 1024, yellow: 1.5 * 1024 * 1024 },
    requestCount: { green: 30, yellow: 50 },
    lcp: { green: 2500, yellow: 4000 },
    cls: { green: 0.1, yellow: 0.25 },
    inp: { green: 200, yellow: 300 },
  };
  const levelFor = (key, value) => {
    const t = thresholds[key];
    if (!t || typeof value !== "number") return "yellow";
    if (value <= t.green) return "green";
    if (value <= t.yellow) return "yellow";
    return "red";
  };
  const boxCls = (lvl) => ({
    green: "bg-green-50 border-green-200 text-green-900",
    yellow: "bg-amber-50 border-amber-200 text-amber-900",
    red: "bg-red-50 border-red-200 text-red-900",
  }[lvl] || "bg-stone-50 border-stone-200 text-stone-800");
  const dotCls = (lvl) => ({
    green: "bg-green-500",
    yellow: "bg-amber-500",
    red: "bg-red-500",
  }[lvl] || "bg-stone-400");
  const MetricTile = ({ label, value, lvl }) => (
    <div className={`rounded-md border p-3 ${boxCls(lvl)}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide">{label}</span>
        <span className={`w-2.5 h-2.5 rounded-full ${dotCls(lvl)}`} />
      </div>
      <div className="mt-1 font-mono text-base">{value}</div>
    </div>
  );

  const flags = [];
  if (metrics.payloadBytes > 1.5 * 1024 * 1024) flags.push("Payload large");
  if (metrics.requestCount > 50) flags.push("Many requests");
  if (metrics.lcp > 2500) flags.push("LCP slow");
  if (metrics.cls > 0.1) flags.push("CLS high");
  if (metrics.inp > 200) flags.push("INP slow");

  return (
    <div className="min-h-screen w-full bg-stone-100 p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-serif">Performance Dashboard</h1>
          <Button variant="outline" onClick={reload} className="gap-2"><RefreshCw className="w-4 h-4"/>Refresh</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Core Metrics</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <MetricTile label="Load Time" value={ms(metrics.loadTime)} lvl={levelFor('loadTime', metrics.loadTime)} />
              <MetricTile label="Payload" value={kb(metrics.payloadBytes)} lvl={levelFor('payloadBytes', metrics.payloadBytes)} />
              <MetricTile label="Requests" value={metrics.requestCount ?? '-'} lvl={levelFor('requestCount', Number(metrics.requestCount))} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Web Vitals</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <MetricTile label="LCP" value={ms(lcpValue)} lvl={levelFor('lcp', lcpValue)} />
              <MetricTile label="CLS" value={typeof metrics.cls === 'number' ? metrics.cls.toFixed(3) : '-'} lvl={levelFor('cls', Number(metrics.cls))} />
              <MetricTile label="INP" value={ms(inpValue)} lvl={levelFor('inp', inpValue)} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Risk Flags</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {flags.length === 0 ? (
              <div className="rounded-md border p-3 bg-green-50 border-green-200 text-green-800">All good. No current risks detected.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {flags.map((f, i) => {
                  const lvl = (() => {
                    if (f.includes('Payload')) return levelFor('payloadBytes', metrics.payloadBytes);
                    if (f.includes('Many requests')) return levelFor('requestCount', Number(metrics.requestCount));
                    if (f.includes('LCP')) return levelFor('lcp', lcpValue);
                    if (f.includes('CLS')) return levelFor('cls', Number(metrics.cls));
                    if (f.includes('INP')) return levelFor('inp', inpValue);
                    return 'yellow';
                  })();
                  return (
                    <span key={i} className={`px-2.5 py-1 rounded-full border text-xs ${boxCls(lvl)}`}>
                      <span className={`inline-block w-2 h-2 rounded-full mr-1 ${dotCls(lvl)}`}></span>
                      {f}
                    </span>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <React.Suspense fallback={<div className="rounded-md border p-4 bg-stone-50">Loading charts…</div>}>
          <PerformanceCharts />
        </React.Suspense>

        {/* Optimization Guide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-md border p-4 bg-red-50 border-red-200 text-red-900">
            <div className="flex items-center justify-between mb-1">
              <div className="font-semibold">Excessive Network Requests</div>
              <span className="text-xs px-2 py-0.5 rounded bg-white/60 border border-red-300">critical</span>
            </div>
            <ul className="list-disc pl-5 text-sm space-y-1 mb-3">
              <li>Batch concurrent queries with useQueries.</li>
              <li>Use stable query keys to dedupe in-flight requests.</li>
              <li>Share common data via context or top-level queries.</li>
            </ul>
            <div className="text-xs text-stone-700 bg-white rounded p-2 border">
              <div className="flex items-center gap-2 mb-1"><Code className="h-3 w-3" />useQueries example</div>
              <pre className="overflow-auto"><code>{`import { useQueries } from '@tanstack/react-query';

              const results = useQueries({
                queries: [
                  { queryKey: ['plots','page',1], queryFn: fetchPlotsPage1, staleTime: 60_000 },
                  { queryKey: ['invoices','recent'], queryFn: fetchRecentInvoices, staleTime: 60_000 }
                ],
              });`}</code></pre>
            </div>
          </div>

          <div className="rounded-md border p-4 bg-amber-50 border-amber-200 text-amber-900">
            <div className="flex items-center justify-between mb-1">
              <div className="font-semibold">Load Time Over Threshold</div>
              <span className="text-xs px-2 py-0.5 rounded bg-white/60 border border-amber-300">high</span>
            </div>
            <ul className="list-disc pl-5 text-sm space-y-1 mb-3">
              <li>Lazy-load non-critical components and images.</li>
              <li>Prefer modern formats (WebP/AVIF) where possible.</li>
            </ul>
            <div className="text-xs text-stone-700 bg-white rounded p-2 border">
              <div className="flex items-center gap-2 mb-1"><Code className="h-3 w-3" />Code-splitting</div>
              <pre className="overflow-auto"><code>{`const Heavy = React.lazy(() => import('../components/Heavy'));
              <React.Suspense fallback={<div>Loading…</div>}>
                <Heavy />
              </React.Suspense>
              // tip: lazy-load admin tabs & modals to cut TTI`}</code></pre>
            </div>
          </div>

          <div className="rounded-md border p-4 bg-sky-50 border-sky-200 text-sky-900">
            <div className="flex items-center justify-between mb-1">
              <div className="font-semibold">Payload Size Optimization</div>
              <span className="text-xs px-2 py-0.5 rounded bg-white/60 border border-sky-300">medium</span>
            </div>
            <ul className="list-disc pl-5 text-sm space-y-1 mb-3">
              <li>Select only needed fields.</li>
              <li>Paginate large lists.</li>
            </ul>
            <div className="text-xs text-stone-700 bg-white rounded p-2 border">
              <div className="flex items-center gap-2 mb-1"><Code className="h-3 w-3" />Field selection</div>
              <pre className="overflow-auto"><code>{`import { filterEntity } from '@/components/gov/dataClient';

              await filterEntity('Plot', {}, {
                sort: '-updated_date',
                limit: 50,
                select: ['id','section','plot_number','status']
              });`}</code></pre>
            </div>
          </div>
        </div>

        {/* AI Analytics (lazy-loaded to improve initial load) */}
        <React.Suspense fallback={<div className="rounded-md border p-4 bg-stone-50">Loading AI tools…</div>}>
          <AiAnalyticsPanel metrics={metrics} />
        </React.Suspense>
      </div>
    </div>
  );
}