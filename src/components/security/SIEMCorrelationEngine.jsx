import React, { memo, useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Loader2, Plus, Play, Trash2, Link2, AlertTriangle, Brain, Shield,
  ChevronDown, ChevronUp, ExternalLink, Clock, TrendingUp, Eye, Zap,
  Network, Server, Globe, Users, Activity
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const SEV_COLORS = { critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#16a34a', info: '#64748b' };
const SEV_BG = { critical: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800', medium: 'bg-amber-100 text-amber-800', low: 'bg-emerald-100 text-emerald-800', info: 'bg-slate-100 text-slate-700' };
const STATUS_COLORS = { new: 'bg-blue-100 text-blue-700', investigating: 'bg-amber-100 text-amber-700', confirmed: 'bg-red-100 text-red-700', false_positive: 'bg-slate-100 text-slate-600', resolved: 'bg-emerald-100 text-emerald-700' };

// Fidelity Score Bar
const FidelityBar = memo(function FidelityBar({ score }) {
  const color = score >= 70 ? 'bg-red-500' : score >= 50 ? 'bg-orange-500' : score >= 30 ? 'bg-amber-500' : 'bg-slate-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] font-medium w-8">{score}%</span>
    </div>
  );
});

// Event Chain Timeline
const EventTimeline = memo(function EventTimeline({ events }) {
  if (!events?.length) return null;
  
  return (
    <div className="space-y-1 max-h-48 overflow-y-auto">
      {events.map((e, i) => (
        <div key={i} className="flex items-start gap-2 text-[10px]">
          <div className="w-14 shrink-0 text-stone-500">{format(new Date(e.timestamp), 'HH:mm:ss')}</div>
          <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0`} style={{ backgroundColor: SEV_COLORS[e.severity] || '#64748b' }} />
          <div className="flex-1 min-w-0">
            <span className="font-medium">{e.event_type}</span>
            <span className="text-stone-500 ml-1">({e.source})</span>
            {e.summary && <p className="text-stone-600 truncate">{e.summary}</p>}
          </div>
        </div>
      ))}
    </div>
  );
});

// Correlated Incident Card
const IncidentCard = memo(function IncidentCard({ incident, onView, onUpdateStatus }) {
  const sourceIcons = { security_events: Activity, endpoints: Server, endpoint_events: Network, threat_intel: Globe, blocked_ips: Shield };

  return (
    <div className={`p-3 border rounded-lg ${incident.severity === 'critical' ? 'border-red-300 bg-red-50' : 'bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link2 className="w-4 h-4 text-teal-600" />
            <span className="font-medium text-sm truncate">{incident.title}</span>
            <Badge className={`${SEV_BG[incident.severity]} text-[9px]`}>{incident.severity}</Badge>
            <Badge className={`${STATUS_COLORS[incident.status]} text-[9px]`}>{incident.status}</Badge>
          </div>
          
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <div className="flex items-center gap-0.5">
              {incident.sources_involved?.map((src, i) => {
                const Icon = sourceIcons[src] || Activity;
                return <Icon key={i} className="w-3 h-3 text-stone-500" title={src} />;
              })}
            </div>
            <span className="text-[10px] text-stone-500">{incident.sources_involved?.length || 0} sources</span>
            <span className="text-[10px] text-stone-500">•</span>
            <span className="text-[10px] text-stone-500">{incident.event_chain?.length || 0} events</span>
            {incident.time_span_minutes > 0 && (
              <>
                <span className="text-[10px] text-stone-500">•</span>
                <span className="text-[10px] text-stone-500">{incident.time_span_minutes}m span</span>
              </>
            )}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <span className="text-[9px] text-stone-500">Fidelity</span>
              <FidelityBar score={incident.fidelity_score || 0} />
            </div>
            <div>
              <span className="text-[9px] text-stone-500">Confidence</span>
              <FidelityBar score={incident.confidence_score || 0} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1 shrink-0">
          <Button variant="outline" size="sm" onClick={() => onView(incident)} className="h-6 text-[10px]">
            <Eye className="w-3 h-3 mr-1" /> Details
          </Button>
          <span className="text-[9px] text-stone-400 text-right">
            {incident.created_date ? formatDistanceToNow(new Date(incident.created_date), { addSuffix: true }) : ''}
          </span>
        </div>
      </div>

      {incident.threat_intel_matches?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          <Badge className="bg-red-100 text-red-700 text-[9px]">Threat Intel Match</Badge>
          {incident.threat_intel_matches[0].families?.slice(0, 2).map((f, i) => (
            <Badge key={i} className="bg-red-50 text-red-600 text-[9px]">{f}</Badge>
          ))}
        </div>
      )}
    </div>
  );
});

// Incident Detail Dialog
function IncidentDetailDialog({ incident, open, onOpenChange, onUpdateStatus }) {
  if (!incident) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm sm:text-base flex items-center gap-2">
            <Link2 className="w-4 h-4 text-teal-600" />
            Correlated Incident
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 text-sm">
          {/* Header Info */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${SEV_BG[incident.severity]}`}>{incident.severity}</Badge>
            <Badge variant="outline">{incident.correlation_type}: {incident.correlation_key}</Badge>
            <Badge variant="outline">{incident.sources_involved?.length} sources</Badge>
          </div>

          {/* Status Actions */}
          <div className="flex flex-wrap gap-1">
            {['new', 'investigating', 'confirmed', 'false_positive', 'resolved'].map(s => (
              <Button key={s} variant={incident.status === s ? 'default' : 'outline'} size="sm" onClick={() => onUpdateStatus(incident, s)} className="h-6 text-[10px] capitalize">{s.replace('_', ' ')}</Button>
            ))}
          </div>

          {/* Scores */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 bg-stone-50 rounded">
              <span className="text-[10px] text-stone-500">Fidelity Score</span>
              <FidelityBar score={incident.fidelity_score || 0} />
            </div>
            <div className="p-2 bg-stone-50 rounded">
              <span className="text-[10px] text-stone-500">Confidence Score</span>
              <FidelityBar score={incident.confidence_score || 0} />
            </div>
          </div>

          {/* Attack Narrative */}
          {incident.attack_narrative && (
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="text-xs font-medium flex items-center gap-1 mb-1"><Brain className="w-3.5 h-3.5 text-purple-500" /> AI Attack Narrative</h4>
              <p className="text-xs text-stone-700">{incident.attack_narrative}</p>
            </div>
          )}

          {/* Event Timeline */}
          <div>
            <h4 className="text-xs font-medium mb-2 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Event Timeline ({incident.event_chain?.length})</h4>
            <div className="border rounded-lg p-2 bg-stone-50">
              <EventTimeline events={incident.event_chain} />
            </div>
          </div>

          {/* Related Entities */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
            {incident.related_ips?.length > 0 && (
              <div className="p-2 bg-stone-50 rounded">
                <span className="font-medium">IPs ({incident.related_ips.length})</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {incident.related_ips.slice(0, 5).map((ip, i) => <Badge key={i} variant="outline" className="text-[9px] font-mono">{ip}</Badge>)}
                </div>
              </div>
            )}
            {incident.related_users?.length > 0 && (
              <div className="p-2 bg-stone-50 rounded">
                <span className="font-medium">Users ({incident.related_users.length})</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {incident.related_users.slice(0, 3).map((u, i) => <Badge key={i} variant="outline" className="text-[9px]">{u}</Badge>)}
                </div>
              </div>
            )}
            {incident.related_endpoints?.length > 0 && (
              <div className="p-2 bg-stone-50 rounded">
                <span className="font-medium">Endpoints ({incident.related_endpoints.length})</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {incident.related_endpoints.slice(0, 3).map((e, i) => <Badge key={i} variant="outline" className="text-[9px]">{e}</Badge>)}
                </div>
              </div>
            )}
          </div>

          {/* Threat Intel */}
          {incident.threat_intel_matches?.length > 0 && (
            <div className="p-2 bg-red-50 rounded border border-red-200">
              <h4 className="text-xs font-medium text-red-700 mb-1">Threat Intelligence Matches</h4>
              {incident.threat_intel_matches.map((t, i) => (
                <div key={i} className="text-[10px]">
                  <span className="font-mono">{t.indicator}</span> - {t.source}
                  {t.families?.length > 0 && <span className="text-red-600 ml-1">({t.families.join(', ')})</span>}
                </div>
              ))}
            </div>
          )}

          {/* MITRE */}
          {incident.mitre_techniques?.length > 0 && (
            <div>
              <h4 className="text-xs font-medium mb-1">MITRE ATT&CK</h4>
              <div className="flex flex-wrap gap-1">
                {incident.mitre_techniques.map((t, i) => (
                  <a key={i} href={`https://attack.mitre.org/techniques/${String(t).replace('.', '/')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[9px] hover:bg-purple-100">{t}<ExternalLink className="w-2 h-2" /></a>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Actions */}
          {incident.recommended_actions?.length > 0 && (
            <div>
              <h4 className="text-xs font-medium mb-1">Recommended Actions</h4>
              <ul className="list-disc list-inside text-[10px] text-stone-700 space-y-0.5">
                {incident.recommended_actions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Rule Editor Dialog
function RuleEditorDialog({ rule, open, onOpenChange, onSave }) {
  const [form, setForm] = useState({
    name: '', description: '', enabled: true, priority: 50, pattern_type: 'threshold',
    conditions: [], correlation_keys: ['ip_address'], time_window_minutes: 15,
    threshold: { count: 5 }, output_severity: 'high', mitre_techniques: []
  });
  const [mitreText, setMitreText] = useState('');

  React.useEffect(() => {
    if (rule) {
      setForm({ ...rule, threshold: rule.threshold || { count: 5 } });
      setMitreText(rule.mitre_techniques?.join(', ') || '');
    } else {
      setForm({
        name: '', description: '', enabled: true, priority: 50, pattern_type: 'threshold',
        conditions: [], correlation_keys: ['ip_address'], time_window_minutes: 15,
        threshold: { count: 5 }, output_severity: 'high', mitre_techniques: []
      });
      setMitreText('');
    }
  }, [rule, open]);

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    onSave({ ...form, mitre_techniques: mitreText.split(',').map(t => t.trim()).filter(Boolean) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-sm">Correlation Rule</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-sm" placeholder="Brute Force Attack" />
            </div>
            <div>
              <Label className="text-xs">Pattern Type</Label>
              <Select value={form.pattern_type} onValueChange={v => setForm(f => ({ ...f, pattern_type: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="threshold">Threshold</SelectItem>
                  <SelectItem value="sequence">Sequence</SelectItem>
                  <SelectItem value="aggregation">Aggregation</SelectItem>
                  <SelectItem value="multi_source">Multi-Source</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="h-14 text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Time Window (min)</Label>
              <Input type="number" value={form.time_window_minutes} onChange={e => setForm(f => ({ ...f, time_window_minutes: parseInt(e.target.value) || 15 }))} className="h-7 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Event Threshold</Label>
              <Input type="number" value={form.threshold?.count || ''} onChange={e => setForm(f => ({ ...f, threshold: { ...f.threshold, count: parseInt(e.target.value) || 0 } }))} className="h-7 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Output Severity</Label>
              <Select value={form.output_severity} onValueChange={v => setForm(f => ({ ...f, output_severity: v }))}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">MITRE ATT&CK</Label>
            <Input value={mitreText} onChange={e => setMitreText(e.target.value)} className="h-7 text-xs" placeholder="T1110, T1078" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs">Cancel</Button>
          <Button onClick={handleSave} className="h-8 text-xs">{rule ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main Component
function SIEMCorrelationEngine() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('incidents');
  const [editRule, setEditRule] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [viewIncident, setViewIncident] = useState(null);
  const [running, setRunning] = useState(false);

  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['correlation-rules'],
    queryFn: () => base44.entities.CorrelationRule.list('priority', 50),
    staleTime: 60_000,
  });

  const { data: incidents = [], isLoading: incidentsLoading } = useQuery({
    queryKey: ['correlated-incidents'],
    queryFn: () => base44.entities.CorrelatedIncident.list('-created_date', 100),
    staleTime: 30_000,
  });

  const stats = useMemo(() => {
    const s = { total: incidents.length, critical: 0, highFidelity: 0, confirmed: 0 };
    incidents.forEach(i => {
      if (i.severity === 'critical') s.critical++;
      if ((i.fidelity_score || 0) >= 70) s.highFidelity++;
      if (i.status === 'confirmed') s.confirmed++;
    });
    return s;
  }, [incidents]);

  const saveRuleMutation = useMutation({
    mutationFn: async (data) => editRule?.id ? base44.entities.CorrelationRule.update(editRule.id, data) : base44.entities.CorrelationRule.create(data),
    onSuccess: () => { toast.success('Rule saved'); qc.invalidateQueries({ queryKey: ['correlation-rules'] }); setEditorOpen(false); },
    onError: (e) => toast.error(e.message)
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id) => base44.entities.CorrelationRule.delete(id),
    onSuccess: () => { toast.success('Rule deleted'); qc.invalidateQueries({ queryKey: ['correlation-rules'] }); }
  });

  const updateIncidentMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.CorrelatedIncident.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['correlated-incidents'] })
  });

  const runEngine = useCallback(async () => {
    setRunning(true);
    try {
      const res = await base44.functions.invoke('siemCorrelationEngine', { time_window_hours: 2 });
      if (res?.data?.error) { toast.error(res.data.error); return; }
      toast.success(`Found ${res.data.incidents_found} incidents, saved ${res.data.incidents_saved}`);
      qc.invalidateQueries({ queryKey: ['correlated-incidents'] });
      qc.invalidateQueries({ queryKey: ['correlation-rules'] });
    } catch { toast.error('Engine failed'); }
    finally { setRunning(false); }
  }, [qc]);

  return (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base lg:text-lg flex items-center gap-2">
            <Link2 className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
            SIEM Correlation Engine
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">{stats.highFidelity} high fidelity</Badge>
            {stats.critical > 0 && <Badge className="bg-red-100 text-red-700 text-[10px]">{stats.critical} critical</Badge>}
            <Button size="sm" onClick={runEngine} disabled={running} className="h-7 text-xs gap-1">
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              Run Engine
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="p-2 bg-stone-50 rounded text-center">
            <div className="text-lg font-bold text-teal-600">{stats.total}</div>
            <div className="text-[10px] text-stone-500">Total</div>
          </div>
          <div className="p-2 bg-stone-50 rounded text-center">
            <div className="text-lg font-bold text-red-600">{stats.critical}</div>
            <div className="text-[10px] text-stone-500">Critical</div>
          </div>
          <div className="p-2 bg-stone-50 rounded text-center">
            <div className="text-lg font-bold text-orange-600">{stats.highFidelity}</div>
            <div className="text-[10px] text-stone-500">High Fidelity</div>
          </div>
          <div className="p-2 bg-stone-50 rounded text-center">
            <div className="text-lg font-bold text-emerald-600">{stats.confirmed}</div>
            <div className="text-[10px] text-stone-500">Confirmed</div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-8 mb-3">
            <TabsTrigger value="incidents" className="text-xs">Incidents ({incidents.length})</TabsTrigger>
            <TabsTrigger value="rules" className="text-xs">Rules ({rules.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="incidents" className="space-y-2">
            {incidentsLoading ? (
              <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : incidents.length === 0 ? (
              <p className="text-center py-6 text-stone-500 text-sm">No correlated incidents. Run the engine to analyze events.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {incidents.map(inc => (
                  <IncidentCard key={inc.id} incident={inc} onView={setViewIncident} onUpdateStatus={(i, s) => updateIncidentMutation.mutate({ id: i.id, status: s })} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rules" className="space-y-2">
            <Button size="sm" onClick={() => { setEditRule(null); setEditorOpen(true); }} className="h-7 text-xs gap-1 mb-2">
              <Plus className="w-3.5 h-3.5" /> Add Rule
            </Button>
            {rulesLoading ? (
              <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : rules.length === 0 ? (
              <p className="text-center py-6 text-stone-500 text-sm">No correlation rules. Create one to detect attack patterns.</p>
            ) : (
              <div className="space-y-2">
                {rules.map(rule => (
                  <div key={rule.id} className="p-2 border rounded-lg bg-white flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{rule.name}</span>
                        <Badge variant="outline" className="text-[9px]">{rule.pattern_type}</Badge>
                        <Badge className={`${SEV_BG[rule.output_severity]} text-[9px]`}>{rule.output_severity}</Badge>
                      </div>
                      <p className="text-[10px] text-stone-500">{rule.trigger_count || 0} triggers • {rule.time_window_minutes}m window</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditRule(rule); setEditorOpen(true); }} className="h-7 w-7"><Eye className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => confirm('Delete?') && deleteRuleMutation.mutate(rule.id)} className="h-7 w-7 text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <RuleEditorDialog rule={editRule} open={editorOpen} onOpenChange={setEditorOpen} onSave={saveRuleMutation.mutate} />
      <IncidentDetailDialog incident={viewIncident} open={!!viewIncident} onOpenChange={o => !o && setViewIncident(null)} onUpdateStatus={(i, s) => { updateIncidentMutation.mutate({ id: i.id, status: s }); setViewIncident({ ...i, status: s }); }} />
    </Card>
  );
}

export default memo(SIEMCorrelationEngine);