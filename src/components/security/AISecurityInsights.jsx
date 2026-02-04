import React, { memo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Brain, AlertTriangle, Shield, Lightbulb, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

function AISecurityInsights({ events = [] }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateInsights = useCallback(async () => {
    if (events.length === 0) {
      toast.error('No events to analyze');
      return;
    }
    
    setLoading(true);
    try {
      const eventsForLLM = events.slice(0, 150).map(e => ({
        severity: e.severity,
        type: e.event_type,
        ip: e.ip_address,
        when: e.created_date,
        message: e.message?.slice(0, 100)
      }));

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze these security events and provide actionable insights. Focus on patterns, anomalies, and risks. Events: ${JSON.stringify(eventsForLLM)}`,
        add_context_from_internet: false,
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            top_risks: { type: 'array', items: { type: 'string' } },
            suspicious_ips: { type: 'array', items: { type: 'string' } },
            recommendations: { type: 'array', items: { type: 'string' } },
            threat_level: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }
          },
          required: ['summary', 'recommendations']
        }
      });
      setInsights(res);
    } catch (e) {
      toast.error('Failed to generate insights');
    } finally {
      setLoading(false);
    }
  }, [events]);

  const threatLevelColor = {
    low: 'bg-emerald-100 text-emerald-800',
    medium: 'bg-amber-100 text-amber-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  };

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base lg:text-lg flex items-center gap-2">
            <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            AI Security Insights
          </CardTitle>
          <Button 
            onClick={generateInsights} 
            disabled={loading || events.length === 0} 
            size="sm"
            className="h-7 sm:h-8 text-xs sm:text-sm gap-1.5"
          >
            {loading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing…</>
            ) : insights ? (
              <><RefreshCw className="w-3.5 h-3.5" /> Refresh</>
            ) : (
              <><Brain className="w-3.5 h-3.5" /> Generate</>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {!insights && !loading && (
          <p className="text-xs sm:text-sm text-stone-500">
            Click "Generate" to get AI-powered analysis of your security events.
          </p>
        )}

        {insights && (
          <div className="space-y-3 sm:space-y-4">
            {insights.threat_level && (
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-medium">Overall Threat Level:</span>
                <Badge className={threatLevelColor[insights.threat_level] || 'bg-stone-100'}>
                  {insights.threat_level?.toUpperCase()}
                </Badge>
              </div>
            )}

            {insights.summary && (
              <div className="p-2 sm:p-3 bg-stone-50 rounded-lg border">
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">{insights.summary}</p>
              </div>
            )}

            {Array.isArray(insights.top_risks) && insights.top_risks.length > 0 && (
              <div>
                <h4 className="text-xs sm:text-sm font-medium flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500" /> Top Risks
                </h4>
                <ul className="space-y-1 text-xs sm:text-sm text-stone-600">
                  {insights.top_risks.slice(0, 5).map((risk, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {Array.isArray(insights.suspicious_ips) && insights.suspicious_ips.length > 0 && (
              <div>
                <h4 className="text-xs sm:text-sm font-medium flex items-center gap-1.5 mb-2">
                  <Shield className="w-3.5 h-3.5 text-red-500" /> Suspicious IPs
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {insights.suspicious_ips.slice(0, 10).map((ip, i) => (
                    <Badge key={i} variant="outline" className="font-mono text-[10px] sm:text-xs">{ip}</Badge>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(insights.recommendations) && insights.recommendations.length > 0 && (
              <div>
                <h4 className="text-xs sm:text-sm font-medium flex items-center gap-1.5 mb-2">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Recommendations
                </h4>
                <ul className="space-y-1 text-xs sm:text-sm text-stone-600">
                  {insights.recommendations.slice(0, 5).map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-teal-500 mt-1">✓</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(AISecurityInsights);