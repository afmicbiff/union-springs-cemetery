import React from "react";
import { getCurrentMetrics, subscribeMetrics } from "@/components/gov/metrics";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Wand2, Loader2, Code, Lightbulb } from "lucide-react";

export default function PerformanceDashboard() {
  const [metrics, setMetrics] = React.useState(getCurrentMetrics());
  const [user, setUser] = React.useState(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState(null);
  const [aiResult, setAiResult] = React.useState(null);

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
      if (metrics.lcp > 2500) flags.push("LCP slow");
      if (metrics.cls > 0.1) flags.push("CLS high");
      if (metrics.inp > 200) flags.push("INP slow");

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
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Load Time</span><span className="font-mono">{ms(metrics.loadTime)}</span></div>
              <div className="flex justify-between"><span>Payload</span><span className="font-mono">{kb(metrics.payloadBytes)}</span></div>
              <div className="flex justify-between"><span>Requests</span><span className="font-mono">{metrics.requestCount ?? '-'}</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Web Vitals</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>LCP</span><span className="font-mono">{ms(metrics.lcp)}</span></div>
              <div className="flex justify-between"><span>CLS</span><span className="font-mono">{typeof metrics.cls === 'number' ? metrics.cls.toFixed(3) : '-'}</span></div>
              <div className="flex justify-between"><span>INP</span><span className="font-mono">{ms(metrics.inp)}</span></div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Risk Flags</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {flags.length === 0 ? (
              <div className="text-green-700">All good. No current risks detected.</div>
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                {flags.map((f, i) => (<li key={i}>{f}</li>))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* AI Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-teal-700" /> AI Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Button onClick={analyzeWithAI} disabled={aiLoading} className="gap-2">
                {aiLoading ? (<><Loader2 className="h-4 w-4 animate-spin"/>Analyzing…</>) : (<><Wand2 className="h-4 w-4"/>Run Analysis</>)}
              </Button>
              {aiError && <span className="text-red-600">{aiError}</span>}
            </div>
            {!aiLoading && aiResult && (
              <div className="space-y-4">
                {aiResult.global_prompt && (
                  <div className="p-3 rounded border bg-stone-50">
                    <div className="flex items-center gap-2 font-medium mb-2"><Lightbulb className="h-4 w-4"/>Actionable Prompt</div>
                    <pre className="text-xs whitespace-pre-wrap">{aiResult.global_prompt}</pre>
                  </div>
                )}
                {(aiResult.issues || []).map((iss, idx) => (
                  <div key={idx} className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">{iss.title}</div>
                      <span className="text-xs px-2 py-0.5 rounded bg-stone-100 border">{iss.severity}</span>
                    </div>
                    {iss.summary && <p className="text-stone-700 mb-2">{iss.summary}</p>}
                    {iss.root_cause && (
                      <div className="text-stone-600 text-xs mb-2"><span className="font-medium">Root cause:</span> {iss.root_cause}</div>
                    )}
                    {Array.isArray(iss.fixes) && iss.fixes.length > 0 && (
                      <ul className="list-disc pl-5 text-sm text-stone-700 space-y-1 mb-2">
                        {iss.fixes.map((f, i) => (<li key={i}>{f}</li>))}
                      </ul>
                    )}
                    {iss.code_suggestion?.snippet && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 text-xs text-stone-500 mb-1"><Code className="h-3 w-3"/>Suggested Code</div>
                        <pre className="bg-stone-900 text-stone-100 rounded p-3 overflow-auto text-xs"><code>{iss.code_suggestion.snippet}</code></pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}