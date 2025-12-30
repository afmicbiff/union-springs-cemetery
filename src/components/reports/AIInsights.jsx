import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function AIInsights({ params, summaryInput }) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [result, setResult] = React.useState(null);

  const run = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const prompt = `You are an analytics expert for a Base44 (React + Tailwind + React Query) app.\n` +
        `Generate a concise executive summary, notable trends, and prioritized actions. If predictive report, forecast next 3 periods.\n` +
        `Return markdown sections with headers: Summary, Trends, Risks, Opportunities, Recommendations.` +
        `\nParams: ${JSON.stringify(params)}\nData: ${JSON.stringify(summaryInput)}`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
      });
      setResult(res?.data || res);
    } catch (e) {
      setError(e?.message || "AI failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">AI Insights</h3>
        <Button onClick={run} disabled={loading} className="gap-2">
          {loading ? (<><Loader2 className="w-4 h-4 animate-spin"/>Analyzing…</>) : (<><Wand2 className="w-4 h-4"/>Generate</>)}
        </Button>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {result && (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{typeof result === 'string' ? result : JSON.stringify(result)}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}