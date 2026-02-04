import React, { memo, useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Loader2, Plus, Pencil, Trash2, AlertTriangle, CheckCircle, Clock,
  Brain, FileText, ExternalLink, ChevronDown, ChevronUp, Target,
  Shield, Zap, Eye, Play
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const CATEGORIES = [
  { value: 'critical_incident', label: 'Critical Incident', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  { value: 'high_priority', label: 'High Priority', color: 'bg-orange-100 text-orange-800', icon: Zap },
  { value: 'requires_investigation', label: 'Requires Investigation', color: 'bg-amber-100 text-amber-800', icon: Eye },
  { value: 'monitor', label: 'Monitor', color: 'bg-blue-100 text-blue-800', icon: Target },
  { value: 'low_risk', label: 'Low Risk', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  { value: 'false_positive', label: 'False Positive', color: 'bg-slate-100 text-slate-700', icon: Shield }
];

const SEVERITY_OPTIONS = ['info', 'low', 'medium', 'high', 'critical'];
const STATUS_OPTIONS = ['new', 'acknowledged', 'investigating', 'resolved', 'escalated', 'closed'];

// Category Badge
const CategoryBadge = memo(function CategoryBadge({ category, size = 'default' }) {
  const cat = CATEGORIES.find(c => c.value === category) || CATEGORIES[2];
  const Icon = cat.icon;
  return (
    <Badge className={`${cat.color} ${size === 'sm' ? 'text-[9px] py-0' : 'text-[10px]'} gap-1`}>
      <Icon className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {cat.label}
    </Badge>
  );
});

// Triage Rule Card
const TriageRuleCard = memo(function TriageRuleCard({ rule, onEdit, onDelete, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const cond = rule.conditions || {};

  return (
    <div className={`p-3 border rounded-lg ${rule.enabled ? 'bg-white' : 'bg-stone-50 opacity-75'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{rule.name}</span>
            <CategoryBadge category={rule.category} size="sm" />
            <Switch checked={rule.enabled} onCheckedChange={() => onToggle(rule)} className="scale-75" />
          </div>
          {rule.description && (
            <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{rule.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-stone-400">P{rule.priority || 50}</span>
          <Button variant="ghost" size="icon" onClick={() => onEdit(rule)} className="h-7 w-7">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(rule)} className="h-7 w-7 text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="h-5 text-[10px] mt-1 p-0 gap-1">
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {rule.investigation_steps?.length || 0} steps • SLA: {rule.sla_minutes ? `${rule.sla_minutes}m` : 'None'}
      </Button>

      {expanded && (
        <div className="mt-2 pt-2 border-t text-[10px] space-y-2">
          <div className="flex flex-wrap gap-1">
            {cond.severity?.map(s => <Badge key={s} variant="outline" className="text-[9px]">{s}</Badge>)}
            {cond.threat_intel_match && <Badge className="bg-red-50 text-red-600 text-[9px]">Threat Intel</Badge>}
            {cond.endpoint_posture?.map(p => <Badge key={p} variant="outline" className="text-[9px]">{p}</Badge>)}
          </div>
          {rule.investigation_steps?.length > 0 && (
            <div>
              <span className="font-medium">Steps:</span>
              <ol className="list-decimal list-inside text-stone-600 mt-0.5">
                {rule.investigation_steps.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
                {rule.investigation_steps.length > 3 && <li className="text-stone-400">+{rule.investigation_steps.length - 3} more</li>}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Rule Editor Dialog
function RuleEditorDialog({ rule, open, onOpenChange, onSave }) {
  const [form, setForm] = useState({
    name: '', description: '', enabled: true, priority: 50, category: 'requires_investigation',
    conditions: { severity: [], event_types: [], threat_intel_match: false, endpoint_posture: [], keywords: [] },
    investigation_steps: [], documentation_links: [], sla_minutes: null
  });
  const [stepsText, setStepsText] = useState('');
  const [keywordsText, setKeywordsText] = useState('');

  React.useEffect(() => {
    if (rule) {
      setForm({
        name: rule.name || '',
        description: rule.description || '',
        enabled: rule.enabled !== false,
        priority: rule.priority || 50,
        category: rule.category || 'requires_investigation',
        conditions: rule.conditions || { severity: [], event_types: [], threat_intel_match: false, endpoint_posture: [], keywords: [] },
        investigation_steps: rule.investigation_steps || [],
        documentation_links: rule.documentation_links || [],
        sla_minutes: rule.sla_minutes || null
      });
      setStepsText(rule.investigation_steps?.join('\n') || '');
      setKeywordsText(rule.conditions?.keywords?.join(', ') || '');
    } else {
      setForm({
        name: '', description: '', enabled: true, priority: 50, category: 'requires_investigation',
        conditions: { severity: [], event_types: [], threat_intel_match: false, endpoint_posture: [], keywords: [] },
        investigation_steps: [], documentation_links: [], sla_minutes: null
      });
      setStepsText('');
      setKeywordsText('');
    }
  }, [rule, open]);

  const toggleSeverity = (sev) => {
    const current = form.conditions.severity || [];
    const updated = current.includes(sev) ? current.filter(s => s !== sev) : [...current, sev];
    setForm(f => ({ ...f, conditions: { ...f.conditions, severity: updated } }));
  };

  const togglePosture = (p) => {
    const current = form.conditions.endpoint_posture || [];
    const updated = current.includes(p) ? current.filter(x => x !== p) : [...current, p];
    setForm(f => ({ ...f, conditions: { ...f.conditions, endpoint_posture: updated } }));
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    onSave({
      ...form,
      investigation_steps: stepsText.split('\n').map(s => s.trim()).filter(Boolean),
      conditions: { ...form.conditions, keywords: keywordsText.split(',').map(k => k.trim()).filter(Boolean) }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm sm:text-base">{rule ? 'Edit Triage Rule' : 'Create Triage Rule'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 50 }))} className="h-8 text-sm" />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="h-14 text-sm" />
          </div>

          <div className="border-t pt-3">
            <Label className="text-xs font-medium">Trigger Conditions</Label>
            <div className="space-y-2 mt-2">
              <div>
                <span className="text-[10px] text-stone-500">Severity</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {SEVERITY_OPTIONS.map(s => (
                    <Badge key={s} className={`cursor-pointer text-[10px] ${form.conditions.severity?.includes(s) ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-500'}`} onClick={() => toggleSeverity(s)}>{s}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.conditions.threat_intel_match} onCheckedChange={v => setForm(f => ({ ...f, conditions: { ...f.conditions, threat_intel_match: v } }))} />
                <span className="text-xs">Threat intel match</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500">Endpoint Posture</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {['healthy', 'at_risk', 'compromised', 'unknown'].map(p => (
                    <Badge key={p} className={`cursor-pointer text-[10px] ${form.conditions.endpoint_posture?.includes(p) ? 'bg-purple-100 text-purple-700' : 'bg-stone-100 text-stone-500'}`} onClick={() => togglePosture(p)}>{p}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Keywords (comma-separated)</Label>
                <Input value={keywordsText} onChange={e => setKeywordsText(e.target.value)} placeholder="brute force, sql injection" className="h-7 text-xs" />
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Investigation Steps</Label>
              <div className="flex items-center gap-2">
                <Label className="text-xs">SLA (min)</Label>
                <Input type="number" value={form.sla_minutes || ''} onChange={e => setForm(f => ({ ...f, sla_minutes: e.target.value ? parseInt(e.target.value) : null }))} className="h-6 w-16 text-xs" />
              </div>
            </div>
            <Textarea value={stepsText} onChange={e => setStepsText(e.target.value)} placeholder="One step per line" className="h-24 text-xs mt-1" />
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

// Incident Card
const IncidentCard = memo(function IncidentCard({ incident, onView, onUpdateStatus }) {
  const isOverdue = incident.sla_due_at && new Date(incident.sla_due_at) < new Date() && !['resolved', 'closed'].includes(incident.status);

  return (
    <div className={`p-3 border rounded-lg bg-white ${isOverdue ? 'border-red-300' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <CategoryBadge category={incident.category} />
            <Badge variant="outline" className="text-[9px]">{incident.status}</Badge>
            {incident.triage_method === 'ai' && <Badge className="bg-purple-100 text-purple-700 text-[9px]"><Brain className="w-2.5 h-2.5 mr-0.5" />AI</Badge>}
            {isOverdue && <Badge className="bg-red-100 text-red-700 text-[9px]">SLA Overdue</Badge>}
          </div>
          <p className="text-xs text-stone-700 mt-1 line-clamp-1">{incident.event_snapshot?.message || incident.reasoning}</p>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-stone-500">
            <span>{incident.event_snapshot?.severity}</span>
            <span>{incident.event_snapshot?.ip_address || '-'}</span>
            {incident.confidence_score && <span>{incident.confidence_score}% confidence</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Button variant="outline" size="sm" onClick={() => onView(incident)} className="h-6 text-[10px]">
            <Eye className="w-3 h-3 mr-1" /> View
          </Button>
          <span className="text-[9px] text-stone-400">
            {incident.created_date ? formatDistanceToNow(new Date(incident.created_date), { addSuffix: true }) : ''}
          </span>
        </div>
      </div>
    </div>
  );
});

// Incident Detail Dialog
function IncidentDetailDialog({ incident, open, onOpenChange, onUpdateStatus }) {
  if (!incident) return null;

  const ai = incident.ai_analysis || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm sm:text-base flex items-center gap-2">
            <CategoryBadge category={incident.category} />
            Triaged Incident
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(s => (
              <Button key={s} variant={incident.status === s ? 'default' : 'outline'} size="sm" onClick={() => onUpdateStatus(incident, s)} className="h-7 text-xs capitalize">{s}</Button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 bg-stone-50 rounded"><span className="text-stone-500">Method:</span> <span className="font-medium capitalize">{incident.triage_method}</span></div>
            <div className="p-2 bg-stone-50 rounded"><span className="text-stone-500">Confidence:</span> <span className="font-medium">{incident.confidence_score}%</span></div>
            <div className="p-2 bg-stone-50 rounded"><span className="text-stone-500">Severity:</span> <span className="font-medium">{incident.event_snapshot?.severity}</span></div>
            <div className="p-2 bg-stone-50 rounded"><span className="text-stone-500">IP:</span> <span className="font-mono">{incident.event_snapshot?.ip_address || '-'}</span></div>
          </div>

          <div className="p-3 bg-stone-50 rounded-lg">
            <h4 className="text-xs font-medium mb-1">Reasoning</h4>
            <p className="text-xs text-stone-700">{incident.reasoning}</p>
          </div>

          {incident.investigation_steps?.length > 0 && (
            <div>
              <h4 className="text-xs font-medium mb-2 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Investigation Steps</h4>
              <ol className="list-decimal list-inside space-y-1 text-xs text-stone-700 bg-blue-50 p-3 rounded-lg">
                {incident.investigation_steps.map((step, i) => <li key={i}>{step}</li>)}
              </ol>
            </div>
          )}

          {ai.threat_assessment && (
            <div className="border-t pt-3">
              <h4 className="text-xs font-medium mb-2 flex items-center gap-1"><Brain className="w-3.5 h-3.5 text-purple-500" /> AI Analysis</h4>
              <div className="space-y-2 text-xs">
                <div><span className="font-medium">Threat Assessment:</span> <span className="text-stone-700">{ai.threat_assessment}</span></div>
                {ai.potential_impact && <div><span className="font-medium">Potential Impact:</span> <span className="text-stone-700">{ai.potential_impact}</span></div>}
                {ai.recommended_actions?.length > 0 && (
                  <div>
                    <span className="font-medium">Recommended Actions:</span>
                    <ul className="list-disc list-inside text-stone-700 mt-1">
                      {ai.recommended_actions.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                )}
                {ai.related_mitre_techniques?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="font-medium">MITRE ATT&CK:</span>
                    {ai.related_mitre_techniques.map((t, i) => (
                      <a key={i} href={`https://attack.mitre.org/techniques/${t.replace('.', '/')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5">
                        {t} <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {incident.documentation_links?.length > 0 && (
            <div>
              <h4 className="text-xs font-medium mb-1">Documentation</h4>
              <div className="flex flex-wrap gap-2">
                {incident.documentation_links.map((doc, i) => (
                  <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                    {doc.title} <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {incident.sla_due_at && (
            <div className="flex items-center gap-2 text-xs">
              <Clock className="w-3.5 h-3.5 text-stone-500" />
              <span>SLA Due: {format(new Date(incident.sla_due_at), 'MMM d, HH:mm')}</span>
              {new Date(incident.sla_due_at) < new Date() && !['resolved', 'closed'].includes(incident.status) && (
                <Badge className="bg-red-100 text-red-700 text-[9px]">Overdue</Badge>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main Component
function IncidentTriageManager({ events = [] }) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('incidents');
  const [editRule, setEditRule] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [viewIncident, setViewIncident] = useState(null);
  const [triaging, setTriaging] = useState(false);

  // Fetch rules
  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['triage-rules'],
    queryFn: () => base44.entities.TriageRule.list('priority', 100),
    staleTime: 60_000,
  });

  // Fetch incidents
  const { data: incidents = [], isLoading: incidentsLoading } = useQuery({
    queryKey: ['triaged-incidents'],
    queryFn: () => base44.entities.TriagedIncident.list('-created_date', 100),
    staleTime: 30_000,
  });

  // Save rule
  const saveRuleMutation = useMutation({
    mutationFn: async (data) => editRule?.id ? base44.entities.TriageRule.update(editRule.id, data) : base44.entities.TriageRule.create(data),
    onSuccess: () => { toast.success(editRule ? 'Rule updated' : 'Rule created'); qc.invalidateQueries({ queryKey: ['triage-rules'] }); setEditorOpen(false); },
    onError: (e) => toast.error(e.message)
  });

  // Delete rule
  const deleteRuleMutation = useMutation({
    mutationFn: (id) => base44.entities.TriageRule.delete(id),
    onSuccess: () => { toast.success('Rule deleted'); qc.invalidateQueries({ queryKey: ['triage-rules'] }); }
  });

  // Toggle rule
  const toggleRuleMutation = useMutation({
    mutationFn: (rule) => base44.entities.TriageRule.update(rule.id, { enabled: !rule.enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['triage-rules'] })
  });

  // Update incident status
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.TriagedIncident.update(id, { 
      status,
      ...(status === 'acknowledged' ? { acknowledged_at: new Date().toISOString() } : {}),
      ...(status === 'resolved' || status === 'closed' ? { resolved_at: new Date().toISOString() } : {})
    }),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['triaged-incidents'] }); }
  });

  // Triage untriaged events
  const triageUntriaged = useCallback(async () => {
    const triagedIds = new Set(incidents.map(i => i.security_event_id));
    const untriaged = events.filter(e => !triagedIds.has(e.id)).slice(0, 10);
    if (untriaged.length === 0) { toast.info('No untriaged events'); return; }

    setTriaging(true);
    let count = 0;
    for (const evt of untriaged) {
      try {
        await base44.functions.invoke('triageIncident', { event_id: evt.id });
        count++;
      } catch {}
    }
    setTriaging(false);
    toast.success(`Triaged ${count} event(s)`);
    qc.invalidateQueries({ queryKey: ['triaged-incidents'] });
  }, [events, incidents, qc]);

  // Stats
  const stats = useMemo(() => {
    const s = { total: incidents.length, new: 0, overdue: 0 };
    const now = Date.now();
    incidents.forEach(i => {
      if (i.status === 'new') s.new++;
      if (i.sla_due_at && new Date(i.sla_due_at).getTime() < now && !['resolved', 'closed'].includes(i.status)) s.overdue++;
    });
    return s;
  }, [incidents]);

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base lg:text-lg flex items-center gap-2">
            <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            Incident Triage
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px]">{stats.new} New</Badge>
            {stats.overdue > 0 && <Badge className="bg-red-100 text-red-700 text-[10px]">{stats.overdue} Overdue</Badge>}
            <Button size="sm" onClick={triageUntriaged} disabled={triaging} className="h-7 text-xs gap-1">
              {triaging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Auto-Triage
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-8 mb-3">
            <TabsTrigger value="incidents" className="text-xs">Incidents ({incidents.length})</TabsTrigger>
            <TabsTrigger value="rules" className="text-xs">Rules ({rules.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="incidents" className="space-y-2">
            {incidentsLoading ? (
              <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : incidents.length === 0 ? (
              <p className="text-center py-6 text-stone-500 text-sm">No triaged incidents. Click Auto-Triage to analyze events.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {incidents.slice(0, 20).map(inc => (
                  <IncidentCard key={inc.id} incident={inc} onView={setViewIncident} onUpdateStatus={(i, s) => updateStatusMutation.mutate({ id: i.id, status: s })} />
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
              <p className="text-center py-6 text-stone-500 text-sm">No triage rules. AI will be used for categorization.</p>
            ) : (
              <div className="space-y-2">
                {rules.map(rule => (
                  <TriageRuleCard key={rule.id} rule={rule} onEdit={r => { setEditRule(r); setEditorOpen(true); }} onDelete={r => confirm(`Delete "${r.name}"?`) && deleteRuleMutation.mutate(r.id)} onToggle={r => toggleRuleMutation.mutate(r)} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <RuleEditorDialog rule={editRule} open={editorOpen} onOpenChange={setEditorOpen} onSave={saveRuleMutation.mutate} />
      <IncidentDetailDialog incident={viewIncident} open={!!viewIncident} onOpenChange={o => !o && setViewIncident(null)} onUpdateStatus={(i, s) => { updateStatusMutation.mutate({ id: i.id, status: s }); setViewIncident({ ...i, status: s }); }} />
    </Card>
  );
}

export default memo(IncidentTriageManager);