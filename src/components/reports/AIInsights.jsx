import React, { memo, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2, AlertCircle, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";

const AIInsights = memo(function AIInsights({ params, summaryInput }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const run = useCallback(async () => {
    setLoading(true); 
    setError(null); 
    setResult(null);
    
    try {
      const prompt = `You are an analytics expert. Generate a concise executive summary, notable trends, and prioritized actions. If predictive report, forecast next 3 periods.
Return markdown sections with headers: Summary, Trends, Risks, Opportunities, Recommendations.
Params: ${JSON.stringify(params)}
Data: ${JSON.stringify(summaryInput)}`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
      });
      setResult(res?.data || res);
    } catch (e) {
      setError(e?.message || "AI analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [params, summaryInput]);

  return (
    <div className="bg-white border rounded-lg p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-sm sm:text-base">AI Insights</h3>
        <Button onClick={run} disabled={loading} className="gap-1.5 h-9 text-sm touch-manipulation">
          {loading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span className="hidden sm:inline">Analyzing…</span><span className="sm:hidden">Wait</span></>
          ) : (
            <><Wand2 className="w-3.5 h-3.5" /><span className="hidden sm:inline">Generate</span><span className="sm:hidden">AI</span></>
          )}
        </Button>
      </div>
      
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span className="text-sm text-red-600 flex-1">{error}</span>
          <Button variant="ghost" size="sm" onClick={run} className="h-7 text-xs">
            <RefreshCw className="w-3 h-3 mr-1" /> Retry
          </Button>
        </div>
      )}
      
      {result && (
        <div className="prose prose-sm max-w-none text-stone-700 prose-headings:text-stone-900 prose-headings:text-sm prose-headings:font-semibold prose-p:text-xs sm:prose-p:text-sm prose-li:text-xs sm:prose-li:text-sm">
          <ReactMarkdown>{typeof result === 'string' ? result : JSON.stringify(result)}</ReactMarkdown>
        </div>
      )}
      
      {!result && !error && !loading && (
        <p className="text-xs sm:text-sm text-stone-400 italic">Click Generate to create AI-powered insights from your report data.</p>
      )}
    </div>
  );
});

export default AIInsights;