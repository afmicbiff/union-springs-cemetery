import React, { memo, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Loader2, Brain, FileText, Target, Book, Sparkles, Copy, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const AIAnalystAssistant = memo(function AIAnalystAssistant({ 
  context, // { type: 'finding' | 'incident' | 'investigation' | 'hunt', data: object }
  findings = [],
  incidents = [],
  playbooks = [],
  hunts = [],
  onSuggestHunt,
  onSuggestPlaybook
}) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const [reportDraft, setReportDraft] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');

  const buildContextPrompt = useCallback(() => {
    let prompt = '';
    if (context?.type === 'finding' && context.data) {
      const f = context.data;
      prompt = `Hunt Finding: "${f.title}"\nSeverity: ${f.severity}\nType: ${f.finding_type}\nDescription: ${f.description || 'N/A'}\n`;
      if (f.evidence?.ioc) prompt += `IOC: ${f.evidence.ioc} (${f.evidence.ioc_type})\n`;
      if (f.related_ips?.length) prompt += `Related IPs: ${f.related_ips.slice(0, 5).join(', ')}\n`;
      if (f.mitre_techniques?.length) prompt += `MITRE: ${f.mitre_techniques.join(', ')}\n`;
    } else if (context?.type === 'incident' && context.data) {
      const i = context.data;
      prompt = `Correlated Incident: "${i.title}"\nSeverity: ${i.severity}\nSources: ${i.sources_involved?.join(', ')}\nFidelity: ${i.fidelity_score}%\nConfidence: ${i.confidence_score}%\n`;
      if (i.event_chain?.length) prompt += `Event Chain: ${i.event_chain.length} events over ${i.time_span_minutes} minutes\n`;
      if (i.attack_narrative) prompt += `Attack Narrative: ${i.attack_narrative}\n`;
      if (i.related_ips?.length) prompt += `IPs: ${i.related_ips.slice(0, 5).join(', ')}\n`;
    } else if (context?.type === 'investigation' && context.data) {
      const inv = context.data;
      const completed = inv.step_progress?.filter(s => s.status === 'completed').length || 0;
      prompt = `Active Investigation: "${inv.title}"\nPlaybook: ${inv.playbook_name}\nStatus: ${inv.status}\nProgress: ${completed}/${inv.step_progress?.length || 0} steps\n`;
      if (inv.iocs_collected?.length) prompt += `IOCs Collected: ${inv.iocs_collected.length}\n`;
    } else if (context?.type === 'hunt' && context.data) {
      const h = context.data;
      prompt = `Threat Hunt: "${h.name}"\nHypothesis: ${h.hypothesis}\nType: ${h.hunt_type}\nFindings: ${h.findings_count || 0}\n`;
    }
    
    // Add recent findings context
    if (findings.length > 0) {
      const critical = findings.filter(f => f.severity === 'critical').length;
      const confirmed = findings.filter(f => f.status === 'confirmed_threat').length;
      prompt += `\nRecent Findings Summary: ${findings.length} total, ${critical} critical, ${confirmed} confirmed threats\n`;
      prompt += `Top findings: ${findings.slice(0, 3).map(f => f.title).join('; ')}\n`;
    }
    
    return prompt;
  }, [context, findings]);

  const generateSummary = useCallback(async () => {
    setLoading(true);
    try {
      const contextPrompt = buildContextPrompt();
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a security analyst assistant. Create a concise executive summary of the following security context. Focus on: key risks, business impact, and urgency. Keep it under 200 words.

${contextPrompt}

Provide a clear, non-technical executive summary suitable for leadership.`,
        response_json_schema: {
          type: 'object',
          properties: {
            executive_summary: { type: 'string' },
            risk_level: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            key_points: { type: 'array', items: { type: 'string' } },
            recommended_priority: { type: 'string' }
          }
        }
      });
      setSummary(result);
    } catch (e) { toast.error('Failed to generate summary'); }
    finally { setLoading(false); }
  }, [buildContextPrompt]);

  const generateSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const contextPrompt = buildContextPrompt();
      const availableHunts = hunts.map(h => ({ name: h.name, type: h.hunt_type, hypothesis: h.hypothesis }));
      const availablePlaybooks = playbooks.map(p => ({ name: p.name, scenario: p.scenario_type, severity: p.severity }));
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a security analyst assistant. Based on the current security context, suggest relevant follow-up actions.

Current Context:
${contextPrompt}

Available Threat Hunts:
${JSON.stringify(availableHunts, null, 2)}

Available Playbooks:
${JSON.stringify(availablePlaybooks, null, 2)}

Suggest:
1. Which existing hunts would be valuable to run based on this context
2. Which playbooks might be relevant for investigation
3. New hunt ideas that could uncover related threats
4. Additional IOCs or indicators to search for`,
        response_json_schema: {
          type: 'object',
          properties: {
            recommended_hunts: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, reason: { type: 'string' } } } },
            recommended_playbooks: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, reason: { type: 'string' } } } },
            new_hunt_ideas: { type: 'array', items: { type: 'object', properties: { hypothesis: { type: 'string' }, hunt_type: { type: 'string' }, rationale: { type: 'string' } } } },
            iocs_to_search: { type: 'array', items: { type: 'string' } }
          }
        }
      });
      setSuggestions(result);
    } catch (e) { toast.error('Failed to generate suggestions'); }
    finally { setLoading(false); }
  }, [buildContextPrompt, hunts, playbooks]);

  const generateReport = useCallback(async () => {
    setLoading(true);
    try {
      const contextPrompt = buildContextPrompt();
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a security analyst assistant. Draft a formal incident report based on the following context. Include sections for: Executive Summary, Timeline, Technical Details, Impact Assessment, Recommendations, and Next Steps.

${contextPrompt}

${customPrompt ? `Additional analyst notes: ${customPrompt}` : ''}

Format the report in Markdown with clear sections and bullet points where appropriate.`
      });
      setReportDraft(result);
    } catch (e) { toast.error('Failed to generate report'); }
    finally { setLoading(false); }
  }, [buildContextPrompt, customPrompt]);

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(typeof text === 'string' ? text : JSON.stringify(text, null, 2));
    toast.success('Copied to clipboard');
  }, []);

  const handleOpen = useCallback(() => {
    setOpen(true);
    if (!summary) generateSummary();
  }, [summary, generateSummary]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen} className="h-7 text-xs gap-1">
        <Brain className="w-3.5 h-3.5 text-purple-500" />
        AI Analyst
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-500" />
              AI Analyst Assistant
              {context?.data && <Badge variant="outline" className="text-[9px] ml-2">{context.type}: {context.data.title || context.data.name}</Badge>}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="h-8 shrink-0">
              <TabsTrigger value="summary" className="text-xs gap-1"><FileText className="w-3 h-3" /> Summary</TabsTrigger>
              <TabsTrigger value="suggest" className="text-xs gap-1"><Sparkles className="w-3 h-3" /> Suggestions</TabsTrigger>
              <TabsTrigger value="report" className="text-xs gap-1"><Book className="w-3 h-3" /> Report</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-3">
              <TabsContent value="summary" className="mt-0 space-y-3">
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={generateSummary} disabled={loading} className="h-6 text-[10px]">
                    <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> Regenerate
                  </Button>
                </div>
                {loading && !summary ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-purple-500" /></div>
                ) : summary ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-purple-700">Executive Summary</span>
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(summary.executive_summary)} className="h-5 w-5"><Copy className="w-3 h-3" /></Button>
                      </div>
                      <p className="text-sm text-stone-700">{summary.executive_summary}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-stone-50 rounded">
                        <span className="text-[10px] text-stone-500">Risk Level</span>
                        <Badge className={`ml-2 text-[9px] ${summary.risk_level === 'critical' ? 'bg-red-100 text-red-700' : summary.risk_level === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>{summary.risk_level}</Badge>
                      </div>
                      <div className="p-2 bg-stone-50 rounded">
                        <span className="text-[10px] text-stone-500">Priority</span>
                        <span className="text-xs ml-2 font-medium">{summary.recommended_priority}</span>
                      </div>
                    </div>
                    {summary.key_points?.length > 0 && (
                      <div className="p-2 bg-stone-50 rounded">
                        <span className="text-[10px] text-stone-500 block mb-1">Key Points</span>
                        <ul className="text-xs text-stone-700 space-y-0.5 list-disc list-inside">
                          {summary.key_points.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-stone-500 text-sm py-4">Click regenerate to create a summary</p>
                )}
              </TabsContent>

              <TabsContent value="suggest" className="mt-0 space-y-3">
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={generateSuggestions} disabled={loading} className="h-6 text-[10px]">
                    <Sparkles className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> Generate
                  </Button>
                </div>
                {loading && !suggestions ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-purple-500" /></div>
                ) : suggestions ? (
                  <div className="space-y-3">
                    {suggestions.recommended_hunts?.length > 0 && (
                      <div className="p-2 bg-teal-50 rounded border border-teal-200">
                        <span className="text-xs font-medium text-teal-700 flex items-center gap-1"><Target className="w-3 h-3" /> Recommended Hunts</span>
                        <div className="mt-1 space-y-1">
                          {suggestions.recommended_hunts.map((h, i) => (
                            <div key={i} className="flex items-center justify-between text-xs p-1 bg-white rounded">
                              <div><span className="font-medium">{h.name}</span><span className="text-stone-500 ml-1">- {h.reason}</span></div>
                              {onSuggestHunt && <Button size="sm" variant="ghost" onClick={() => onSuggestHunt(h.name)} className="h-5 text-[9px]">Run</Button>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {suggestions.recommended_playbooks?.length > 0 && (
                      <div className="p-2 bg-blue-50 rounded border border-blue-200">
                        <span className="text-xs font-medium text-blue-700 flex items-center gap-1"><Book className="w-3 h-3" /> Recommended Playbooks</span>
                        <div className="mt-1 space-y-1">
                          {suggestions.recommended_playbooks.map((p, i) => (
                            <div key={i} className="flex items-center justify-between text-xs p-1 bg-white rounded">
                              <div><span className="font-medium">{p.name}</span><span className="text-stone-500 ml-1">- {p.reason}</span></div>
                              {onSuggestPlaybook && <Button size="sm" variant="ghost" onClick={() => onSuggestPlaybook(p.name)} className="h-5 text-[9px]">Start</Button>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {suggestions.new_hunt_ideas?.length > 0 && (
                      <div className="p-2 bg-purple-50 rounded border border-purple-200">
                        <span className="text-xs font-medium text-purple-700">New Hunt Ideas</span>
                        <div className="mt-1 space-y-1">
                          {suggestions.new_hunt_ideas.map((h, i) => (
                            <div key={i} className="text-xs p-1 bg-white rounded">
                              <span className="font-medium">{h.hypothesis}</span>
                              <Badge variant="outline" className="text-[8px] ml-1">{h.hunt_type}</Badge>
                              <p className="text-stone-500 text-[10px]">{h.rationale}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {suggestions.iocs_to_search?.length > 0 && (
                      <div className="p-2 bg-orange-50 rounded border border-orange-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-orange-700">IOCs to Search</span>
                          <Button variant="ghost" size="icon" onClick={() => copyToClipboard(suggestions.iocs_to_search.join('\n'))} className="h-5 w-5"><Copy className="w-3 h-3" /></Button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {suggestions.iocs_to_search.map((ioc, i) => <Badge key={i} variant="outline" className="text-[9px] font-mono">{ioc}</Badge>)}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-stone-500 text-sm py-4">Click generate to get AI suggestions</p>
                )}
              </TabsContent>

              <TabsContent value="report" className="mt-0 space-y-3">
                <div>
                  <Textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="Add additional notes or context for the report..." className="h-16 text-xs" />
                  <div className="flex justify-end mt-2">
                    <Button size="sm" onClick={generateReport} disabled={loading} className="h-7 text-xs gap-1">
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                      Generate Report
                    </Button>
                  </div>
                </div>
                {reportDraft && (
                  <div className="p-3 bg-stone-50 rounded border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium">Draft Report</span>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(reportDraft)} className="h-5 w-5"><Copy className="w-3 h-3" /></Button>
                    </div>
                    <div className="prose prose-sm prose-stone max-w-none text-xs">
                      <ReactMarkdown>{reportDraft}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
});

export default AIAnalystAssistant;