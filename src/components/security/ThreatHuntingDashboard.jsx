import React, { memo, useState, useCallback, useMemo, lazy, Suspense } from 'react';
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
  Loader2, Plus, Play, Trash2, Search, Target, AlertTriangle, Brain, Edit2,
  ChevronDown, ChevronUp, ExternalLink, Filter, Clock, Eye, Crosshair, RefreshCw,
  Globe, Hash, FileText, Activity, CheckCircle, AlertOctagon
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import AIAnalystAssistant from './AIAnalystAssistant';

const SEV_COLORS = { critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#16a34a', info: '#64748b' };
const SEV_BG = { critical: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800', medium: 'bg-amber-100 text-amber-800', low: 'bg-emerald-100 text-emerald-800', info: 'bg-slate-100 text-slate-700' };
const STATUS_COLORS = { new: 'bg-blue-100 text-blue-700', investigating: 'bg-amber-100 text-amber-700', confirmed_threat: 'bg-red-100 text-red-700', false_positive: 'bg-slate-100 text-slate-600', resolved: 'bg-emerald-100 text-emerald-700' };
const HUNT_STATUS_COLORS = { draft: 'bg-slate-100 text-slate-600', active: 'bg-emerald-100 text-emerald-700', completed: 'bg-blue-100 text-blue-700', archived: 'bg-stone-100 text-stone-500' };
const IOC_TYPE_ICONS = { ip: Globe, domain: Globe, hash_md5: Hash, hash_sha1: Hash, hash_sha256: Hash, url: FileText, unknown: Target };
const IOC_TYPE_COLORS = { ip: 'bg-blue-100 text-blue-700', domain: 'bg-purple-100 text-purple-700', hash_md5: 'bg-orange-100 text-orange-700', hash_sha1: 'bg-orange-100 text-orange-700', hash_sha256: 'bg-orange-100 text-orange-700', url: 'bg-teal-100 text-teal-700', unknown: 'bg-stone-100 text-stone-600' };

// Stats Card
const StatCard = memo(function StatCard({ label, value, icon: Icon, color = 'text-teal-600' }) {
  return (
    <div className="p-3 bg-white border rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-xl font-bold ${color}`}>{value}</div>
          <div className="text-[10px] text-stone-500">{label}</div>
        </div>
        {Icon && <Icon className={`w-5 h-5 ${color} opacity-50`} />}
      </div>
    </div>
  );
});

// Hunt Card
const HuntCard = memo(function HuntCard({ hunt, onRun, onEdit, onDelete, onViewFindings, running }) {
  return (
    <div className="p-3 border rounded-lg bg-white hover:border-teal-300 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Crosshair className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="font-medium text-sm truncate">{hunt.name}</span>
            <Badge className={`${HUNT_STATUS_COLORS[hunt.status]} text-[9px]`}>{hunt.status}</Badge>
            <Badge variant="outline" className="text-[9px]">{hunt.hunt_type?.replace(/_/g, ' ')}</Badge>
          </div>
          <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{hunt.hypothesis}</p>
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-stone-500 flex-wrap">
            {hunt.last_run && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{formatDistanceToNow(new Date(hunt.last_run), { addSuffix: true })}</span>}
            <span className="flex items-center gap-0.5"><Target className="w-3 h-3" />{hunt.findings_count || 0} findings</span>
            {hunt.mitre_techniques?.length > 0 && (
              <span className="flex items-center gap-0.5"><AlertOctagon className="w-3 h-3" />{hunt.mitre_techniques.length} MITRE</span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => onViewFindings(hunt)} className="h-7 w-7" title="View Findings">
              <Eye className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => onEdit(hunt)} className="h-7 w-7" title="Edit">
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button variant="default" size="icon" onClick={() => onRun(hunt)} disabled={running === hunt.id} className="h-7 w-7" title="Run Hunt">
              {running === hunt.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onDelete(hunt)} className="h-6 text-[9px] text-red-500 hover:text-red-700">
            <Trash2 className="w-3 h-3 mr-1" /> Delete
          </Button>
        </div>
      </div>
    </div>
  );
});

// Finding Card with drill-down
const FindingCard = memo(function FindingCard({ finding, onUpdateStatus, onDelete, onSelectForAI }) {
  const [expanded, setExpanded] = useState(false);
  const evidence = finding.evidence || {};
  const isIOC = finding.finding_type === 'ioc_match';
  const Icon = isIOC ? (IOC_TYPE_ICONS[evidence.ioc_type] || Target) : (finding.finding_type === 'ai_insight' ? Brain : AlertTriangle);

  return (
    <div className={`p-3 border rounded-lg ${finding.severity === 'critical' ? 'border-red-300 bg-red-50' : finding.status === 'confirmed_threat' ? 'border-orange-300 bg-orange-50' : 'bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: SEV_COLORS[finding.severity] }} />
            <span className="text-xs font-medium truncate">{finding.title}</span>
            <Badge className={`${SEV_BG[finding.severity]} text-[9px]`}>{finding.severity}</Badge>
            <Badge className={`${STATUS_COLORS[finding.status]} text-[9px]`}>{finding.status?.replace('_', ' ')}</Badge>
            {isIOC && <Badge className={`${IOC_TYPE_COLORS[evidence.ioc_type]} text-[9px]`}>{evidence.ioc_type}</Badge>}
          </div>
          <p className="text-[10px] text-stone-600 mt-0.5 line-clamp-2">{finding.description}</p>
          {finding.hunt_name && <p className="text-[9px] text-stone-400 mt-0.5">Hunt: {finding.hunt_name}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onSelectForAI && <Button variant="ghost" size="sm" onClick={() => onSelectForAI(finding)} className="h-6 text-[10px]" title="AI Analysis"><Brain className="w-3 h-3 text-purple-500" /></Button>}
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="h-6 text-[10px]">
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-2 pt-2 border-t space-y-2 text-[10px]">
          {/* Status Update */}
          <div className="flex flex-wrap gap-1">
            {['new', 'investigating', 'confirmed_threat', 'false_positive', 'resolved'].map(s => (
              <Button key={s} variant={finding.status === s ? 'default' : 'outline'} size="sm" onClick={() => onUpdateStatus(finding.id, s)} className="h-5 text-[9px] capitalize">{s.replace('_', ' ')}</Button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => onDelete(finding.id)} className="h-5 text-[9px] text-red-500 ml-auto">
              <Trash2 className="w-2.5 h-2.5 mr-0.5" /> Delete
            </Button>
          </div>

          {/* IOC Details */}
          {isIOC && evidence.ioc && (
            <div className="p-2 bg-stone-50 rounded">
              <div className="font-mono text-xs break-all">{evidence.ioc}</div>
              {evidence.threat_intel && (
                <div className="mt-1 text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Threat Intel: {evidence.threat_intel.families?.join(', ') || 'Known threat'} (Score: {evidence.threat_intel.risk_score})
                </div>
              )}
            </div>
          )}

          {/* Evidence Details */}
          {evidence.details?.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1">
              <div className="font-medium">Match Details ({evidence.details.length})</div>
              {evidence.details.slice(0, 8).map((d, i) => (
                <div key={i} className="p-1.5 bg-stone-50 rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[8px]">{d.source}</Badge>
                    {d.event_type && <span>{d.event_type}</span>}
                    {d.severity && <Badge className={`${SEV_BG[d.severity]} text-[8px]`}>{d.severity}</Badge>}
                  </div>
                  {d.matches?.slice(0, 2).map((m, j) => (
                    <div key={j} className="text-stone-500 ml-2 truncate">• {m.field}: <span className="font-mono">{String(m.value).slice(0, 80)}</span></div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Anomaly Evidence */}
          {evidence.deviation_score && (
            <div className="p-2 bg-amber-50 rounded">
              <div className="font-medium">Anomaly Detected</div>
              <div>Deviation: <strong>{evidence.deviation_score.toFixed(2)}σ</strong></div>
              <div>Baseline: {evidence.baseline_value?.toFixed(1)} → Observed: {evidence.observed_value}</div>
            </div>
          )}

          {/* Related Entities */}
          <div className="flex flex-wrap gap-2">
            {finding.related_ips?.length > 0 && (
              <div>
                <span className="text-stone-500">IPs:</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {finding.related_ips.slice(0, 5).map((ip, i) => <Badge key={i} variant="outline" className="text-[9px] font-mono">{ip}</Badge>)}
                  {finding.related_ips.length > 5 && <span className="text-stone-400">+{finding.related_ips.length - 5}</span>}
                </div>
              </div>
            )}
            {finding.related_users?.length > 0 && (
              <div>
                <span className="text-stone-500">Users:</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {finding.related_users.slice(0, 3).map((u, i) => <Badge key={i} variant="outline" className="text-[9px]">{u}</Badge>)}
                </div>
              </div>
            )}
          </div>

          {/* MITRE */}
          {finding.mitre_techniques?.length > 0 && (
            <div>
              <span className="text-stone-500">MITRE ATT&CK:</span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {finding.mitre_techniques.map((t, i) => (
                  <a key={i} href={`https://attack.mitre.org/techniques/${String(t).replace('.', '/')}`} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline flex items-center gap-0.5">{t}<ExternalLink className="w-2 h-2" /></a>
                ))}
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {finding.ai_analysis?.recommended_actions?.length > 0 && (
            <div className="p-2 bg-purple-50 rounded">
              <div className="font-medium flex items-center gap-1"><Brain className="w-3 h-3 text-purple-500" /> Recommended Actions</div>
              <ul className="list-disc list-inside mt-0.5 text-stone-600">
                {finding.ai_analysis.recommended_actions.slice(0, 3).map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// IOC Sweep Panel (Inline)
const IOCSweepInline = memo(function IOCSweepInline({ onComplete }) {
  const [iocInput, setIOCInput] = useState('');
  const [timeRange, setTimeRange] = useState(72);
  const [sweeping, setSweeping] = useState(false);

  const handleSweep = async () => {
    const iocs = iocInput.split(/[\n,;]+/).map(i => i.trim()).filter(Boolean);
    if (iocs.length === 0) { toast.error('Enter at least one IOC'); return; }
    setSweeping(true);
    try {
      const res = await base44.functions.invoke('iocSweep', { iocs, time_range_hours: timeRange, hunt_name: 'Manual IOC Sweep' });
      if (res?.data?.error) throw new Error(res.data.error);
      toast.success(`Scanned ${res.data.iocs_scanned} IOCs, found ${res.data.findings_count} matches`);
      onComplete?.();
    } catch (e) { toast.error(e.message); }
    finally { setSweeping(false); }
  };

  const iocCount = iocInput.split(/[\n,;]+/).map(i => i.trim()).filter(Boolean).length;

  return (
    <div className="p-3 border rounded-lg bg-stone-50">
      <div className="flex items-center gap-2 mb-2">
        <Target className="w-4 h-4 text-teal-600" />
        <span className="font-medium text-sm">IOC Sweep</span>
      </div>
      <Textarea
        value={iocInput}
        onChange={e => setIOCInput(e.target.value)}
        placeholder="Enter IOCs (one per line or comma-separated)&#10;192.168.1.100, malicious-domain.com&#10;44d88612fea8a8f36de82e1278abb02f"
        className="h-20 text-xs font-mono bg-white"
      />
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-stone-500">Time:</span>
          <Input type="number" value={timeRange} onChange={e => setTimeRange(parseInt(e.target.value) || 72)} className="h-6 w-16 text-xs" />
          <span className="text-stone-500">hours</span>
          <span className="text-stone-400 ml-2">{iocCount} IOC(s)</span>
        </div>
        <Button onClick={handleSweep} disabled={sweeping || iocCount === 0} size="sm" className="h-7 text-xs gap-1">
          {sweeping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Sweep
        </Button>
      </div>
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
        name: hunt.name || '', hypothesis: hunt.hypothesis || '', description: hunt.description || '',
        hunt_type: hunt.hunt_type || 'manual_query', status: hunt.status || 'draft',
        query_config: hunt.query_config || { data_source: 'security_events', filters: [], time_range_hours: 24, keywords: [], severity_min: '' },
        anomaly_config: hunt.anomaly_config || { baseline_days: 7, deviation_threshold: 2.0 },
        mitre_techniques: hunt.mitre_techniques || [], tags: hunt.tags || []
      });
      setKeywordsText(hunt.query_config?.keywords?.join(', ') || '');
      setMitreText(hunt.mitre_techniques?.join(', ') || '');
    } else {
      setForm({ name: '', hypothesis: '', description: '', hunt_type: 'manual_query', status: 'draft', query_config: { data_source: 'security_events', filters: [], time_range_hours: 24, keywords: [], severity_min: '' }, anomaly_config: { baseline_days: 7, deviation_threshold: 2.0 }, mitre_techniques: [], tags: [] });
      setKeywordsText(''); setMitreText('');
    }
  }, [hunt, open]);

  const addFilter = () => {
    if (!filterField.trim()) return;
    setForm(f => ({ ...f, query_config: { ...f.query_config, filters: [...(f.query_config.filters || []), { field: filterField, operator: filterOp, value: filterValue }] } }));
    setFilterField(''); setFilterValue('');
  };

  const removeFilter = (idx) => setForm(f => ({ ...f, query_config: { ...f.query_config, filters: f.query_config.filters.filter((_, i) => i !== idx) } }));

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
        <DialogHeader><DialogTitle className="text-sm sm:text-base">{hunt ? 'Edit Hunt' : 'Create Threat Hunt'}</DialogTitle></DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label className="text-xs">Hunt Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Lateral Movement Detection" className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Hunt Type</Label>
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
          <div><Label className="text-xs">Hypothesis *</Label><Textarea value={form.hypothesis} onChange={e => setForm(f => ({ ...f, hypothesis: e.target.value }))} placeholder="What threat are you hunting for?" className="h-16 text-sm" /></div>
          <div className="border-t pt-3">
            <h4 className="text-xs font-medium mb-2">Query Configuration</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div><Label className="text-[10px]">Data Source</Label>
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
              <div><Label className="text-[10px]">Time Range (hours)</Label><Input type="number" value={form.query_config.time_range_hours} onChange={e => setForm(f => ({ ...f, query_config: { ...f.query_config, time_range_hours: parseInt(e.target.value) || 24 } }))} className="h-7 text-xs" /></div>
              <div><Label className="text-[10px]">Min Severity</Label>
                <Select value={form.query_config.severity_min || ''} onValueChange={v => setForm(f => ({ ...f, query_config: { ...f.query_config, severity_min: v || null } }))}>
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
            <div className="mt-2"><Label className="text-[10px]">Filters</Label>
              <div className="flex gap-1 mt-1">
                <Input value={filterField} onChange={e => setFilterField(e.target.value)} placeholder="Field" className="h-7 text-xs flex-1" />
                <Select value={filterOp} onValueChange={setFilterOp}><SelectTrigger className="h-7 text-xs w-20"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="equals">=</SelectItem><SelectItem value="contains">~</SelectItem><SelectItem value="regex">regex</SelectItem><SelectItem value="gt">{">"}</SelectItem><SelectItem value="lt">{"<"}</SelectItem></SelectContent>
                </Select>
                <Input value={filterValue} onChange={e => setFilterValue(e.target.value)} placeholder="Value" className="h-7 text-xs flex-1" />
                <Button size="sm" onClick={addFilter} className="h-7 text-xs">+</Button>
              </div>
              {form.query_config.filters?.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{form.query_config.filters.map((f, i) => (<Badge key={i} variant="outline" className="text-[9px] gap-1">{f.field} {f.operator} {f.value}<button onClick={() => removeFilter(i)} className="ml-1 text-red-500">×</button></Badge>))}</div>}
            </div>
            <div className="mt-2"><Label className="text-[10px]">Keywords</Label><Input value={keywordsText} onChange={e => setKeywordsText(e.target.value)} placeholder="brute force, ransomware" className="h-7 text-xs" /></div>
          </div>
          {form.hunt_type === 'anomaly_detection' && (
            <div className="border-t pt-3">
              <h4 className="text-xs font-medium mb-2">Anomaly Settings</h4>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-[10px]">Baseline Days</Label><Input type="number" value={form.anomaly_config.baseline_days} onChange={e => setForm(f => ({ ...f, anomaly_config: { ...f.anomaly_config, baseline_days: parseInt(e.target.value) || 7 } }))} className="h-7 text-xs" /></div>
                <div><Label className="text-[10px]">Deviation (σ)</Label><Input type="number" step="0.5" value={form.anomaly_config.deviation_threshold} onChange={e => setForm(f => ({ ...f, anomaly_config: { ...f.anomaly_config, deviation_threshold: parseFloat(e.target.value) || 2.0 } }))} className="h-7 text-xs" /></div>
              </div>
            </div>
          )}
          <div><Label className="text-xs">MITRE ATT&CK</Label><Input value={mitreText} onChange={e => setMitreText(e.target.value)} placeholder="T1078, T1059, T1021" className="h-7 text-xs" /></div>
        </div>
        <DialogFooter className="gap-2"><Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs">Cancel</Button><Button onClick={handleSave} className="h-8 text-xs">{hunt ? 'Update' : 'Create'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main Component
function ThreatHuntingDashboard() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [editHunt, setEditHunt] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedHunt, setSelectedHunt] = useState(null);
  const [runningHunt, setRunningHunt] = useState(null);
  const [findingFilters, setFindingFilters] = useState({ severity: 'all', status: 'all', type: 'all', search: '' });
  const [selectedForAI, setSelectedForAI] = useState(null);

  const { data: hunts = [], isLoading: huntsLoading, refetch: refetchHunts } = useQuery({
    queryKey: ['threat-hunts'],
    queryFn: () => base44.entities.ThreatHunt.list('-created_date', 50),
    staleTime: 60_000,
  });

  const { data: allFindings = [], isLoading: findingsLoading, refetch: refetchFindings } = useQuery({
    queryKey: ['hunt-findings'],
    queryFn: () => base44.entities.HuntFinding.list('-created_date', 200),
    staleTime: 30_000,
  });

  const findings = useMemo(() => {
    let result = selectedHunt ? allFindings.filter(f => f.hunt_id === selectedHunt.id) : allFindings;
    if (findingFilters.severity !== 'all') result = result.filter(f => f.severity === findingFilters.severity);
    if (findingFilters.status !== 'all') result = result.filter(f => f.status === findingFilters.status);
    if (findingFilters.type !== 'all') result = result.filter(f => f.finding_type === findingFilters.type);
    if (findingFilters.search) {
      const s = findingFilters.search.toLowerCase();
      result = result.filter(f => f.title?.toLowerCase().includes(s) || f.description?.toLowerCase().includes(s) || f.evidence?.ioc?.toLowerCase().includes(s));
    }
    return result;
  }, [allFindings, selectedHunt, findingFilters]);

  const stats = useMemo(() => {
    const s = { totalHunts: hunts.length, activeHunts: 0, totalFindings: allFindings.length, criticalFindings: 0, confirmedThreats: 0, newFindings: 0, iocMatches: 0 };
    hunts.forEach(h => { if (h.status === 'active') s.activeHunts++; });
    allFindings.forEach(f => {
      if (f.severity === 'critical') s.criticalFindings++;
      if (f.status === 'confirmed_threat') s.confirmedThreats++;
      if (f.status === 'new') s.newFindings++;
      if (f.finding_type === 'ioc_match') s.iocMatches++;
    });
    return s;
  }, [hunts, allFindings]);

  const findingsBySeverity = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    allFindings.forEach(f => { if (counts[f.severity] !== undefined) counts[f.severity]++; });
    return Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value, fill: SEV_COLORS[name] }));
  }, [allFindings]);

  const findingsByStatus = useMemo(() => {
    const counts = {};
    allFindings.forEach(f => { counts[f.status] = (counts[f.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace('_', ' '), value }));
  }, [allFindings]);

  const findingsByType = useMemo(() => {
    const counts = {};
    allFindings.forEach(f => { counts[f.finding_type] = (counts[f.finding_type] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));
  }, [allFindings]);

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

  const deleteFindingMutation = useMutation({
    mutationFn: (id) => base44.entities.HuntFinding.delete(id),
    onSuccess: () => { toast.success('Finding deleted'); qc.invalidateQueries({ queryKey: ['hunt-findings'] }); }
  });

  const runHunt = useCallback(async (hunt) => {
    setRunningHunt(hunt.id);
    try {
      const res = await base44.functions.invoke('executeThreatHunt', { hunt_id: hunt.id, run_anomaly_detection: true });
      if (res?.data?.error) { toast.error(res.data.error); return; }
      toast.success(`Hunt completed: ${res.data.findings_count} finding(s)`);
      qc.invalidateQueries({ queryKey: ['threat-hunts'] });
      qc.invalidateQueries({ queryKey: ['hunt-findings'] });
    } catch { toast.error('Hunt failed'); }
    finally { setRunningHunt(null); }
  }, [qc]);

  const handleViewFindings = useCallback((hunt) => {
    setSelectedHunt(hunt);
    setActiveTab('findings');
  }, []);

  const refreshAll = useCallback(() => {
    refetchHunts();
    refetchFindings();
    toast.success('Refreshed');
  }, [refetchHunts, refetchFindings]);

  return (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base lg:text-lg flex items-center gap-2">
            <Crosshair className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
            Threat Hunting Dashboard
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {stats.confirmedThreats > 0 && <Badge className="bg-red-100 text-red-700 text-[10px]">{stats.confirmedThreats} confirmed</Badge>}
            {stats.newFindings > 0 && <Badge className="bg-blue-100 text-blue-700 text-[10px]">{stats.newFindings} new</Badge>}
            <AIAnalystAssistant 
              context={selectedForAI} 
              findings={allFindings} 
              hunts={hunts}
              onSuggestHunt={(name) => { const h = hunts.find(x => x.name === name); if (h) runHunt(h); }}
            />
            <Button variant="outline" size="sm" onClick={refreshAll} className="h-7 text-xs gap-1"><RefreshCw className="w-3 h-3" /></Button>
            <Button size="sm" onClick={() => { setEditHunt(null); setEditorOpen(true); }} className="h-7 text-xs gap-1"><Plus className="w-3.5 h-3.5" /> New Hunt</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-8 mb-3">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="hunts" className="text-xs">Hunts ({hunts.length})</TabsTrigger>
            <TabsTrigger value="findings" className="text-xs">Findings ({allFindings.length})</TabsTrigger>
            <TabsTrigger value="ioc" className="text-xs">IOC Sweep</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              <StatCard label="Total Hunts" value={stats.totalHunts} icon={Crosshair} color="text-teal-600" />
              <StatCard label="Active Hunts" value={stats.activeHunts} icon={Activity} color="text-emerald-600" />
              <StatCard label="Total Findings" value={stats.totalFindings} icon={Target} color="text-blue-600" />
              <StatCard label="Critical" value={stats.criticalFindings} icon={AlertTriangle} color="text-red-600" />
              <StatCard label="Confirmed" value={stats.confirmedThreats} icon={AlertOctagon} color="text-orange-600" />
              <StatCard label="IOC Matches" value={stats.iocMatches} icon={Search} color="text-purple-600" />
            </div>

            {allFindings.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-stone-50 p-3 rounded-lg">
                  <h4 className="text-xs font-medium text-stone-600 mb-2">By Severity</h4>
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie data={findingsBySeverity} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={50}>
                        {findingsBySeverity.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-stone-50 p-3 rounded-lg">
                  <h4 className="text-xs font-medium text-stone-600 mb-2">By Status</h4>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={findingsByStatus} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 9 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#0d9488" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-stone-50 p-3 rounded-lg">
                  <h4 className="text-xs font-medium text-stone-600 mb-2">By Type</h4>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={findingsByType} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 9 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Recent Critical/Confirmed Findings */}
            {allFindings.filter(f => f.severity === 'critical' || f.status === 'confirmed_threat').length > 0 && (
              <div>
                <h4 className="text-xs font-medium mb-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Priority Findings</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {allFindings.filter(f => f.severity === 'critical' || f.status === 'confirmed_threat').slice(0, 5).map(f => (
                    <FindingCard key={f.id} finding={f} onUpdateStatus={(id, s) => updateFindingMutation.mutate({ id, status: s })} onDelete={(id) => confirm('Delete?') && deleteFindingMutation.mutate(id)} />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* HUNTS TAB */}
          <TabsContent value="hunts" className="space-y-3">
            {huntsLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : hunts.length === 0 ? (
              <div className="text-center py-8">
                <Crosshair className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                <p className="text-stone-500 text-sm">No threat hunts yet</p>
                <Button onClick={() => { setEditHunt(null); setEditorOpen(true); }} className="mt-3 h-8 text-xs"><Plus className="w-3.5 h-3.5 mr-1" /> Create Your First Hunt</Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {hunts.map(hunt => (
                  <HuntCard key={hunt.id} hunt={hunt} running={runningHunt} onRun={runHunt} onEdit={(h) => { setEditHunt(h); setEditorOpen(true); }} onDelete={(h) => confirm(`Delete "${h.name}"?`) && deleteHuntMutation.mutate(h.id)} onViewFindings={handleViewFindings} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* FINDINGS TAB */}
          <TabsContent value="findings" className="space-y-3">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 p-2 bg-stone-50 rounded-lg">
              <Filter className="w-4 h-4 text-stone-400" />
              {selectedHunt && (
                <Badge variant="secondary" className="text-xs gap-1">
                  {selectedHunt.name}
                  <button onClick={() => setSelectedHunt(null)} className="ml-1 text-stone-500 hover:text-stone-700">×</button>
                </Badge>
              )}
              <Select value={findingFilters.severity} onValueChange={v => setFindingFilters(f => ({ ...f, severity: v }))}>
                <SelectTrigger className="h-7 w-24 text-xs"><SelectValue placeholder="Severity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={findingFilters.status} onValueChange={v => setFindingFilters(f => ({ ...f, status: v }))}>
                <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="confirmed_threat">Confirmed</SelectItem>
                  <SelectItem value="false_positive">False Positive</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={findingFilters.type} onValueChange={v => setFindingFilters(f => ({ ...f, type: v }))}>
                <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="ioc_match">IOC Match</SelectItem>
                  <SelectItem value="query_match">Query Match</SelectItem>
                  <SelectItem value="anomaly">Anomaly</SelectItem>
                  <SelectItem value="ai_insight">AI Insight</SelectItem>
                </SelectContent>
              </Select>
              <Input value={findingFilters.search} onChange={e => setFindingFilters(f => ({ ...f, search: e.target.value }))} placeholder="Search..." className="h-7 w-32 text-xs" />
              <span className="text-[10px] text-stone-500 ml-auto">{findings.length} results</span>
            </div>

            {findingsLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : findings.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                <p className="text-stone-500 text-sm">No findings match your filters</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {findings.map(f => (
                  <FindingCard key={f.id} finding={f} onUpdateStatus={(id, s) => updateFindingMutation.mutate({ id, status: s })} onDelete={(id) => confirm('Delete?') && deleteFindingMutation.mutate(id)} onSelectForAI={(finding) => setSelectedForAI({ type: 'finding', data: finding })} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* IOC SWEEP TAB */}
          <TabsContent value="ioc" className="space-y-3">
            <IOCSweepInline onComplete={() => { refetchFindings(); setActiveTab('findings'); setFindingFilters(f => ({ ...f, type: 'ioc_match' })); }} />
            
            {/* Recent IOC Findings */}
            {allFindings.filter(f => f.finding_type === 'ioc_match').length > 0 && (
              <div>
                <h4 className="text-xs font-medium mb-2 flex items-center gap-1"><Search className="w-3.5 h-3.5 text-purple-500" /> Recent IOC Matches</h4>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {allFindings.filter(f => f.finding_type === 'ioc_match').slice(0, 10).map(f => (
                    <FindingCard key={f.id} finding={f} onUpdateStatus={(id, s) => updateFindingMutation.mutate({ id, status: s })} onDelete={(id) => confirm('Delete?') && deleteFindingMutation.mutate(id)} onSelectForAI={(finding) => setSelectedForAI({ type: 'finding', data: finding })} />
                  ))}
                </div>
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