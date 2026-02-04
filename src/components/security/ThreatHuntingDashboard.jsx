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
import { toast } from 'sonner';
import {
  Loader2, Plus, Play, Trash2, Search, Target, AlertTriangle, Brain,
  ChevronDown, ChevronUp, ExternalLink, Filter, Clock, TrendingUp, Eye, Crosshair
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const SEV_COLORS = { critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#16a34a', info: '#64748b' };
const STATUS_COLORS = { new: 'bg-blue-100 text-blue-700', investigating: 'bg-amber-100 text-amber-700', confirmed_threat: 'bg-red-100 text-red-700', false_positive: 'bg-slate-100 text-slate-600', resolved: 'bg-emerald-100 text-emerald-700' };
const HUNT_STATUS_COLORS = { draft: 'bg-slate-100 text-slate-600', active: 'bg-emerald-100 text-emerald-700', completed: 'bg-blue-100 text-blue-700', archived: 'bg-stone-100 text-stone-500' };

// Hunt Card
const HuntCard = memo(function HuntCard({ hunt, onRun, onDelete, onView }) {
  const [running, setRunning] = useState(false);

  const handleRun = async () => {
    setRunning(true);
    await onRun(hunt);
    setRunning(false);
  };

  return (
    <div className="p-3 border rounded-lg bg-white hover:border-teal-300 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Crosshair className="w-4 h-4 text-teal-600" />
            <span className="font-medium text-sm">{hunt.name}</span>
            <Badge className={`${HUNT_STATUS_COLORS[hunt.status]} text-[9px]`}>{hunt.status}</Badge>
            <Badge variant="outline" className="text-[9px]">{hunt.hunt_type?.replace('_', ' ')}</Badge>
          </div>
          <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{hunt.hypothesis}</p>
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-stone-500">
            {hunt.last_run && <span><Clock className="w-3 h-3 inline mr-0.5" />{formatDistanceToNow(new Date(hunt.last_run), { addSuffix: true })}</span>}
            <span>{hunt.findings_count || 0} findings</span>
            {hunt.mitre_techniques?.length > 0 && <span>{hunt.mitre_techniques.length} MITRE techniques</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="outline" size="icon" onClick={() => onView(hunt)} className="h-7 w-7">
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button variant="default" size="icon" onClick={handleRun} disabled={running} className="h-7 w-7">
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(hunt)} className="h-7 w-7 text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
});

// Finding Card
const FindingCard = memo(function FindingCard({ finding, onUpdateStatus }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`p-3 border rounded-lg ${finding.status === 'confirmed_threat' ? 'border-red-300 bg-red-50' : 'bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {finding.finding_type === 'ai_insight' ? <Brain className="w-3.5 h-3.5 text-purple-500" /> : <AlertTriangle className="w-3.5 h-3.5" style={{ color: SEV_COLORS[finding.severity] }} />}
            <span className="text-xs font-medium">{finding.title}</span>
            <Badge style={{ backgroundColor: SEV_COLORS[finding.severity] + '20', color: SEV_COLORS[finding.severity] }} className="text-[9px]">{finding.severity}</Badge>
            <Badge className={`${STATUS_COLORS[finding.status]} text-[9px]`}>{finding.status}</Badge>
          </div>
          <p className="text-[10px] text-stone-600 mt-0.5 line-clamp-2">{finding.description}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="h-6 text-[10px]">
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
      </div>

      {expanded && (
        <div className="mt-2 pt-2 border-t space-y-2 text-[10px]">
          {/* Status Update */}
          <div className="flex flex-wrap gap-1">
            {['new', 'investigating', 'confirmed_threat', 'false_positive', 'resolved'].map(s => (
              <Button key={s} variant={finding.status === s ? 'default' : 'outline'} size="sm" onClick={() => onUpdateStatus(finding, s)} className="h-5 text-[9px] capitalize">{s.replace('_', ' ')}</Button>
            ))}
          </div>

          {/* Evidence */}
          {finding.evidence && (
            <div className="bg-stone-50 p-2 rounded">
              {finding.evidence.matched_events?.length > 0 && <p><strong>Events:</strong> {finding.evidence.matched_events.length} matched</p>}
              {finding.evidence.matched_endpoints?.length > 0 && <p><strong>Endpoints:</strong> {finding.evidence.matched_endpoints.length} matched</p>}
              {finding.evidence.deviation_score && <p><strong>Deviation:</strong> {finding.evidence.deviation_score.toFixed(2)}σ (baseline: {finding.evidence.baseline_value?.toFixed(1)}, observed: {finding.evidence.observed_value})</p>}
            </div>
          )}

          {/* Related IPs */}
          {finding.related_ips?.length > 0 && (
            <div>
              <strong>IPs:</strong>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {finding.related_ips.map((ip, i) => <Badge key={i} variant="outline" className="text-[9px] font-mono">{ip}</Badge>)}
              </div>
            </div>
          )}

          {/* MITRE */}
          {finding.mitre_techniques?.length > 0 && (
            <div>
              <strong>MITRE ATT&CK:</strong>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {finding.mitre_techniques.map((t, i) => (
                  <a key={i} href={`https://attack.mitre.org/techniques/${String(t).replace('.', '/')}`} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline flex items-center gap-0.5">{t}<ExternalLink className="w-2 h-2" /></a>
                ))}
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {finding.ai_analysis?.recommended_actions?.length > 0 && (
            <div>
              <strong>Recommended Actions:</strong>
              <ul className="list-disc list-inside mt-0.5 text-stone-600">
                {finding.ai_analysis.recommended_actions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Hunt Editor Dialog
function HuntEditorDialog({ hunt, open, onOpenChange, onSave }) {
  const [form, setForm] = useState({
    name: '', hypothesis: '', description: '', hunt_type: 'manual_query', status: 'draft',
    query_config: { data_source: 'security_events', filters: [], time_range_hours: 24, keywords: [], severity_min: '' },
    anomaly_config: { baseline_days: 7, deviation_threshold: 2.0 },
    mitre_techniques: [], tags: []
  });
  const [keywordsText, setKeywordsText] = useState('');
  const [mitreText, setMitreText] = useState('');
  const [filterField, setFilterField] = useState('');
  const [filterOp, setFilterOp] = useState('contains');
  const [filterValue, setFilterValue] = useState('');

  React.useEffect(() => {
    if (hunt) {
      setForm({
        name: hunt.name || '',
        hypothesis: hunt.hypothesis || '',
        description: hunt.description || '',
        hunt_type: hunt.hunt_type || 'manual_query',
        status: hunt.status || 'draft',
        query_config: hunt.query_config || { data_source: 'security_events', filters: [], time_range_hours: 24, keywords: [], severity_min: '' },
        anomaly_config: hunt.anomaly_config || { baseline_days: 7, deviation_threshold: 2.0 },
        mitre_techniques: hunt.mitre_techniques || [],
        tags: hunt.tags || []
      });
      setKeywordsText(hunt.query_config?.keywords?.join(', ') || '');
      setMitreText(hunt.mitre_techniques?.join(', ') || '');
    } else {
      setForm({
        name: '', hypothesis: '', description: '', hunt_type: 'manual_query', status: 'draft',
        query_config: { data_source: 'security_events', filters: [], time_range_hours: 24, keywords: [], severity_min: '' },
        anomaly_config: { baseline_days: 7, deviation_threshold: 2.0 },
        mitre_techniques: [], tags: []
      });
      setKeywordsText('');
      setMitreText('');
    }
  }, [hunt, open]);

  const addFilter = () => {
    if (!filterField.trim()) return;
    setForm(f => ({
      ...f,
      query_config: {
        ...f.query_config,
        filters: [...(f.query_config.filters || []), { field: filterField, operator: filterOp, value: filterValue }]
      }
    }));
    setFilterField('');
    setFilterValue('');
  };

  const removeFilter = (idx) => {
    setForm(f => ({
      ...f,
      query_config: { ...f.query_config, filters: f.query_config.filters.filter((_, i) => i !== idx) }
    }));
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.hypothesis.trim()) { toast.error('Name and hypothesis required'); return; }
    onSave({
      ...form,
      query_config: { ...form.query_config, keywords: keywordsText.split(',').map(k => k.trim()).filter(Boolean) },
      mitre_techniques: mitreText.split(',').map(t => t.trim()).filter(Boolean)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm sm:text-base">{hunt ? 'Edit Hunt' : 'Create Threat Hunt'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Hunt Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Lateral Movement Detection" className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Hunt Type</Label>
              <Select value={form.hunt_type} onValueChange={v => setForm(f => ({ ...f, hunt_type: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual_query">Manual Query</SelectItem>
                  <SelectItem value="anomaly_detection">Anomaly Detection</SelectItem>
                  <SelectItem value="ioc_sweep">IOC Sweep</SelectItem>
                  <SelectItem value="behavior_analysis">Behavior Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Hypothesis *</Label>
            <Textarea value={form.hypothesis} onChange={e => setForm(f => ({ ...f, hypothesis: e.target.value }))} placeholder="What threat are you hunting for?" className="h-16 text-sm" />
          </div>

          {/* Query Config */}
          <div className="border-t pt-3">
            <h4 className="text-xs font-medium mb-2">Query Configuration</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px]">Data Source</Label>
                <Select value={form.query_config.data_source} onValueChange={v => setForm(f => ({ ...f, query_config: { ...f.query_config, data_source: v } }))}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="security_events">Security Events</SelectItem>
                    <SelectItem value="endpoints">Endpoints</SelectItem>
                    <SelectItem value="endpoint_events">Endpoint Events</SelectItem>
                    <SelectItem value="all">All Sources</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">Time Range (hours)</Label>
                <Input type="number" value={form.query_config.time_range_hours} onChange={e => setForm(f => ({ ...f, query_config: { ...f.query_config, time_range_hours: parseInt(e.target.value) || 24 } }))} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">Min Severity</Label>
                <Select value={form.query_config.severity_min || ''} onValueChange={v => setForm(f => ({ ...f, query_config: { ...f.query_config, severity_min: v } }))}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Any</SelectItem>
                    <SelectItem value="low">Low+</SelectItem>
                    <SelectItem value="medium">Medium+</SelectItem>
                    <SelectItem value="high">High+</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filters */}
            <div className="mt-2">
              <Label className="text-[10px]">Filters</Label>
              <div className="flex gap-1 mt-1">
                <Input value={filterField} onChange={e => setFilterField(e.target.value)} placeholder="Field (e.g., ip_address)" className="h-7 text-xs flex-1" />
                <Select value={filterOp} onValueChange={setFilterOp}>
                  <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">equals</SelectItem>
                    <SelectItem value="contains">contains</SelectItem>
                    <SelectItem value="regex">regex</SelectItem>
                    <SelectItem value="gt">{">"}</SelectItem>
                    <SelectItem value="lt">{"<"}</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={filterValue} onChange={e => setFilterValue(e.target.value)} placeholder="Value" className="h-7 text-xs flex-1" />
                <Button size="sm" onClick={addFilter} className="h-7 text-xs">Add</Button>
              </div>
              {form.query_config.filters?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {form.query_config.filters.map((f, i) => (
                    <Badge key={i} variant="outline" className="text-[9px] gap-1">
                      {f.field} {f.operator} {f.value}
                      <button onClick={() => removeFilter(i)} className="ml-1 text-red-500">×</button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-2">
              <Label className="text-[10px]">Keywords (comma-separated)</Label>
              <Input value={keywordsText} onChange={e => setKeywordsText(e.target.value)} placeholder="brute force, sql injection, ransomware" className="h-7 text-xs" />
            </div>
          </div>

          {/* Anomaly Config */}
          {form.hunt_type === 'anomaly_detection' && (
            <div className="border-t pt-3">
              <h4 className="text-xs font-medium mb-2">Anomaly Detection Settings</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Baseline Days</Label>
                  <Input type="number" value={form.anomaly_config.baseline_days} onChange={e => setForm(f => ({ ...f, anomaly_config: { ...f.anomaly_config, baseline_days: parseInt(e.target.value) || 7 } }))} className="h-7 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">Deviation Threshold (σ)</Label>
                  <Input type="number" step="0.5" value={form.anomaly_config.deviation_threshold} onChange={e => setForm(f => ({ ...f, anomaly_config: { ...f.anomaly_config, deviation_threshold: parseFloat(e.target.value) || 2.0 } }))} className="h-7 text-xs" />
                </div>
              </div>
            </div>
          )}

          {/* MITRE */}
          <div>
            <Label className="text-xs">MITRE ATT&CK Techniques (comma-separated)</Label>
            <Input value={mitreText} onChange={e => setMitreText(e.target.value)} placeholder="T1078, T1059, T1021" className="h-7 text-xs" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs">Cancel</Button>
          <Button onClick={handleSave} className="h-8 text-xs">{hunt ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main Component
function ThreatHuntingDashboard() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('hunts');
  const [editHunt, setEditHunt] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedHunt, setSelectedHunt] = useState(null);

  // Fetch hunts
  const { data: hunts = [], isLoading: huntsLoading } = useQuery({
    queryKey: ['threat-hunts'],
    queryFn: () => base44.entities.ThreatHunt.list('-created_date', 50),
    staleTime: 60_000,
  });

  // Fetch findings
  const { data: findings = [], isLoading: findingsLoading } = useQuery({
    queryKey: ['hunt-findings', selectedHunt?.id],
    queryFn: () => selectedHunt ? base44.entities.HuntFinding.filter({ hunt_id: selectedHunt.id }, '-created_date', 100) : base44.entities.HuntFinding.list('-created_date', 100),
    staleTime: 30_000,
  });

  // Stats
  const stats = useMemo(() => {
    const s = { totalHunts: hunts.length, activeHunts: 0, totalFindings: findings.length, criticalFindings: 0, confirmedThreats: 0 };
    hunts.forEach(h => { if (h.status === 'active') s.activeHunts++; });
    findings.forEach(f => {
      if (f.severity === 'critical') s.criticalFindings++;
      if (f.status === 'confirmed_threat') s.confirmedThreats++;
    });
    return s;
  }, [hunts, findings]);

  // Chart data
  const findingsBySeverity = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach(f => { if (counts[f.severity] !== undefined) counts[f.severity]++; });
    return Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value, fill: SEV_COLORS[name] }));
  }, [findings]);

  const findingsByType = useMemo(() => {
    const counts = {};
    findings.forEach(f => { counts[f.finding_type] = (counts[f.finding_type] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace('_', ' '), value }));
  }, [findings]);

  // Mutations
  const saveHuntMutation = useMutation({
    mutationFn: async (data) => editHunt?.id ? base44.entities.ThreatHunt.update(editHunt.id, data) : base44.entities.ThreatHunt.create(data),
    onSuccess: () => { toast.success(editHunt ? 'Hunt updated' : 'Hunt created'); qc.invalidateQueries({ queryKey: ['threat-hunts'] }); setEditorOpen(false); setEditHunt(null); },
    onError: (e) => toast.error(e.message)
  });

  const deleteHuntMutation = useMutation({
    mutationFn: (id) => base44.entities.ThreatHunt.delete(id),
    onSuccess: () => { toast.success('Hunt deleted'); qc.invalidateQueries({ queryKey: ['threat-hunts'] }); }
  });

  const updateFindingMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.HuntFinding.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hunt-findings'] })
  });

  const runHunt = useCallback(async (hunt) => {
    try {
      const res = await base44.functions.invoke('executeThreatHunt', { hunt_id: hunt.id, run_anomaly_detection: true });
      if (res?.data?.error) { toast.error(res.data.error); return; }
      toast.success(`Hunt completed: ${res.data.findings_count} finding(s)`);
      qc.invalidateQueries({ queryKey: ['threat-hunts'] });
      qc.invalidateQueries({ queryKey: ['hunt-findings'] });
    } catch (e) { toast.error('Hunt execution failed'); }
  }, [qc]);

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base lg:text-lg flex items-center gap-2">
            <Crosshair className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
            Threat Hunting
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">{stats.activeHunts} active</Badge>
            {stats.confirmedThreats > 0 && <Badge className="bg-red-100 text-red-700 text-[10px]">{stats.confirmedThreats} threats</Badge>}
            <Button size="sm" onClick={() => { setEditHunt(null); setEditorOpen(true); }} className="h-7 text-xs gap-1">
              <Plus className="w-3.5 h-3.5" /> New Hunt
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="p-2 bg-stone-50 rounded text-center">
            <div className="text-lg font-bold text-teal-600">{stats.totalHunts}</div>
            <div className="text-[10px] text-stone-500">Total Hunts</div>
          </div>
          <div className="p-2 bg-stone-50 rounded text-center">
            <div className="text-lg font-bold text-blue-600">{stats.totalFindings}</div>
            <div className="text-[10px] text-stone-500">Findings</div>
          </div>
          <div className="p-2 bg-stone-50 rounded text-center">
            <div className="text-lg font-bold text-red-600">{stats.criticalFindings}</div>
            <div className="text-[10px] text-stone-500">Critical</div>
          </div>
          <div className="p-2 bg-stone-50 rounded text-center">
            <div className="text-lg font-bold text-orange-600">{stats.confirmedThreats}</div>
            <div className="text-[10px] text-stone-500">Confirmed</div>
          </div>
        </div>

        {/* Charts */}
        {findings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="bg-stone-50 p-2 rounded-lg">
              <h4 className="text-[10px] font-medium text-stone-500 mb-1">By Severity</h4>
              <ResponsiveContainer width="100%" height={100}>
                <PieChart>
                  <Pie data={findingsBySeverity} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={25} outerRadius={40}>
                    {findingsBySeverity.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-stone-50 p-2 rounded-lg">
              <h4 className="text-[10px] font-medium text-stone-500 mb-1">By Type</h4>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={findingsByType} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0d9488" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-8 mb-3">
            <TabsTrigger value="hunts" className="text-xs">Hunts ({hunts.length})</TabsTrigger>
            <TabsTrigger value="findings" className="text-xs">Findings ({findings.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="hunts" className="space-y-2">
            {huntsLoading ? (
              <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : hunts.length === 0 ? (
              <p className="text-center py-6 text-stone-500 text-sm">No threat hunts. Create one to start hunting.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {hunts.map(hunt => (
                  <HuntCard key={hunt.id} hunt={hunt} onRun={runHunt} onDelete={h => confirm(`Delete "${h.name}"?`) && deleteHuntMutation.mutate(h.id)} onView={h => { setSelectedHunt(h); setActiveTab('findings'); }} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="findings" className="space-y-2">
            {selectedHunt && (
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">{selectedHunt.name}</Badge>
                <Button variant="ghost" size="sm" onClick={() => setSelectedHunt(null)} className="h-6 text-[10px]">Show all</Button>
              </div>
            )}
            {findingsLoading ? (
              <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : findings.length === 0 ? (
              <p className="text-center py-6 text-stone-500 text-sm">No findings yet. Run a hunt to generate findings.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {findings.map(f => (
                  <FindingCard key={f.id} finding={f} onUpdateStatus={(finding, status) => updateFindingMutation.mutate({ id: finding.id, status })} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <HuntEditorDialog hunt={editHunt} open={editorOpen} onOpenChange={setEditorOpen} onSave={saveHuntMutation.mutate} />
    </Card>
  );
}

export default memo(ThreatHuntingDashboard);