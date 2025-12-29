import React from "react";
import { getCurrentMetrics, subscribeMetrics } from "@/components/gov/metrics";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function PerformanceDashboard() {
  const [metrics, setMetrics] = React.useState(getCurrentMetrics());
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
    const unsub = subscribeMetrics(setMetrics);
    return () => unsub();
  }, []);

  const reload = () => setMetrics(getCurrentMetrics());
  const isAdmin = user?.role === "admin";

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
      </div>
    </div>
  );
}