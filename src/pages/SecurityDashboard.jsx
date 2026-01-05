import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

const SEV_COLORS = { info: '#94a3b8', low: '#10b981', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' };
const sevBadge = (s) => ({
  info: 'bg-slate-100 text-slate-700',
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
}[s] || 'bg-slate-100 text-slate-700');

export default function SecurityDashboard() {
  const qc = useQueryClient();
  const [severity, setSeverity] = React.useState('all');
  const [type, setType] = React.useState('all');
  const [start, setStart] = React.useState('');
  const [end, setEnd] = React.useState('');
  const [details, setDetails] = React.useState(null);
  const [blockModal, setBlockModal] = React.useState({ open: false, ip: '', minutes: 60, reason: '' });
  const [blockedView, setBlockedView] = React.useState('active');
  const [insights, setInsights] = React.useState(null);
  const [insightsLoading, setInsightsLoading] = React.useState(false);
  const [secCfg, setSecCfg] = React.useState({ enabled: true, failed_login_threshold: 5, window_minutes: 10, auto_block_enabled: false, auto_block_minutes: 60, notify_email: true, notify_in_app: true, severity_for_threshold: 'high' });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['sec-events'],
    queryFn: () => base44.entities.SecurityEvent.list('-created_date', 1000),
    initialData: [],
    staleTime: 60_000,
  });

  const { data: blocked = [] } = useQuery({
    queryKey: ['blocked-ips'],
    queryFn: () => base44.entities.BlockedIP.filter({ active: true }, '-created_date', 1000),
    initialData: [],
    staleTime: 60_000,
  });

  const { data: blockedAll = [] } = useQuery({
    queryKey: ['blocked-all'],
    queryFn: () => base44.entities.BlockedIP.list('-created_date', 500),
    initialData: [],
    staleTime: 60_000,
  });

  const { data: nsData } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const list = await base44.entities.NotificationSettings.list('-updated_date', 1);
      return list[0] || null;
    },
    initialData: null,
    staleTime: 60_000,
  });

  const blockedSet = React.useMemo(() => {
    const now = Date.now();
    const set = new Set();
    (blocked || []).forEach(b => { if (b.active && new Date(b.blocked_until).getTime() > now) set.add(b.ip_address); });
    return set;
  }, [blocked]);

  const filteredBlocked = React.useMemo(() => {
    const arr = Array.isArray(blockedAll) ? blockedAll : [];
    const now = Date.now();
    return arr.filter(rec => {
      const isActive = rec.active && new Date(rec.blocked_until).getTime() > now;
      if (blockedView === 'active') return isActive;
      if (blockedView === 'inactive') return !isActive;
      return true;
    });
  }, [blockedAll, blockedView]);

  const unblockIp = async (rec) => {
    try {
      await base44.entities.BlockedIP.update(rec.id, { active: false });
      toast.success(`Unblocked ${rec.ip_address}`);
      qc.invalidateQueries({ queryKey: ['blocked-ips'] });
      qc.invalidateQueries({ queryKey: ['blocked-all'] });
    } catch (e) {
      toast.error('Unblock failed');
    }
  };

  React.useEffect(() => {
    if (nsData) {
      const cfg = nsData.security_alerts || {};
      setSecCfg(prev => ({ ...prev, ...cfg }));
    }
  }, [nsData]);


  const types = React.useMemo(() => {
    const t = new Set();
    (events || []).forEach(e => { if (e.event_type) t.add(e.event_type); });
    return ['all', ...Array.from(t).sort()];
  }, [events]);

  const filtered = React.useMemo(() => {
    let arr = Array.isArray(events) ? [...events] : [];
    if (severity !== 'all') arr = arr.filter(e => e.severity === severity);
    if (type !== 'all') arr = arr.filter(e => e.event_type === type);
    if (start) {
      const s = new Date(start); s.setHours(0,0,0,0);
      arr = arr.filter(e => new Date(e.created_date).getTime() >= s.getTime());
    }
    if (end) {
      const en = new Date(end); en.setHours(23,59,59,999);
      arr = arr.filter(e => new Date(e.created_date).getTime() <= en.getTime());
    }
    return arr;
  }, [events, severity, type, start, end]);

  const indicators = React.useMemo(() => {
    const s = new Set();
    (filtered || []).forEach(e => e.ip_address && s.add(e.ip_address));
    (filteredBlocked || []).forEach(r => r.ip_address && s.add(r.ip_address));
    return Array.from(s).slice(0, 100);
  }, [filtered, filteredBlocked]);

  const { data: intel = { results: {} }, isFetching: intelLoading } = useQuery({
    queryKey: ['threat-intel', indicators],
    queryFn: async () => {
      if (!indicators || indicators.length === 0) return { results: {} };
      const res = await base44.functions.invoke('threatIntelLookup', { indicators });
      return res?.data || { results: {} };
    },
    enabled: (indicators || []).length > 0,
    staleTime: 300_000,
  });

  const intelMap = (intel && intel.results) ? intel.results : {};


  const severityData = React.useMemo(() => {
    const map = { info: 0, low: 0, medium: 0, high: 0, critical: 0 };
    filtered.forEach(e => { if (map[e.severity] !== undefined) map[e.severity]++; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const typeData = React.useMemo(() => {
    const map = {};
    filtered.forEach(e => { const k = e.event_type || 'other'; map[k] = (map[k]||0) + 1; });
    const arr = Object.entries(map).map(([name, value]) => ({ name, value }));
    arr.sort((a,b)=> b.value - a.value);
    return arr.slice(0, 10);
  }, [filtered]);

  const topIpData = React.useMemo(() => {
    const map = {};
    filtered.forEach(e => { if (e.ip_address) map[e.ip_address] = (map[e.ip_address]||0) + 1; });
    const arr = Object.entries(map).map(([ip, count]) => ({ ip, count }));
    arr.sort((a,b)=> b.count - a.count);
    return arr.slice(0, 10);
  }, [filtered]);

  const openBlockIp = (ip) => setBlockModal({ open: true, ip, minutes: 60, reason: '' });
  const submitBlockIp = async () => {
    try {
      if (!blockModal.ip) return;
      const minutes = Math.max(1, Number(blockModal.minutes || 60));
      const res = await base44.functions.invoke('blockIp', { ip_address: blockModal.ip, duration_minutes: minutes, reason: blockModal.reason || '' });
      if (res?.data?.error) throw new Error(res.data.error);
      toast.success(`Blocked ${blockModal.ip} for ${minutes} minutes`);
      setBlockModal({ open: false, ip: '', minutes: 60, reason: '' });
      qc.invalidateQueries({ queryKey: ['blocked-ips'] });
    } catch (e) {
      toast.error(e?.message || 'Block failed');
    }
  };

  const generateInsights = async () => {
    try {
      setInsightsLoading(true);
      const eventsForLLM = (events || []).slice(0, 200).map(e => ({
        severity: e.severity,
        type: e.event_type,
        ip: e.ip_address,
        when: e.created_date,
        message: e.message
      }));
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze these security events and summarize key insights, top risks, suspicious IPs, and concrete recommendations. Return a JSON per the schema. Events: ${JSON.stringify(eventsForLLM)}`,
        add_context_from_internet: false,
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            top_risks: { type: 'array', items: { type: 'string' } },
            suspicious_ips: { type: 'array', items: { type: 'string' } },
            recommendations: { type: 'array', items: { type: 'string' } }
          },
          required: ['summary', 'recommendations']
        }
      });
      setInsights(res);
    } catch (e) {
      toast.error('Failed to generate insights');
    } finally {
      setInsightsLoading(false);
    }
  };

  const saveSecCfg = async () => {
    try {
      if (nsData && nsData.id) {
        await base44.entities.NotificationSettings.update(nsData.id, { security_alerts: secCfg });
      } else {
        await base44.entities.NotificationSettings.create({ security_alerts: secCfg });
      }
      toast.success('Alert settings saved');
      qc.invalidateQueries({ queryKey: ['notification-settings'] });
    } catch (e) {
      toast.error('Save failed');
    }
  };

  return (
    <div className="min-h-screen p-6 bg-stone-100">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl font-serif font-bold">Security Dashboard</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <div className="text-xs text-stone-500 mb-1">Severity</div>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs text-stone-500 mb-1">Type</div>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {types.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs text-stone-500 mb-1">Start date</div>
              <Input type="date" value={start} onChange={(e)=> setStart(e.target.value)} className="bg-white" />
            </div>
            <div>
              <div className="text-xs text-stone-500 mb-1">End date</div>
              <Input type="date" value={end} onChange={(e)=> setEnd(e.target.value)} className="bg-white" />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="h-64">
            <CardHeader><CardTitle className="text-sm">Severity distribution</CardTitle></CardHeader>
            <CardContent className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={severityData} dataKey="value" nameKey="name" outerRadius={70}>
                    {severityData.map((e, i) => (<Cell key={`s-${i}`} fill={SEV_COLORS[e.name] || '#94a3b8'} />))}
                  </Pie>
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="h-64">
            <CardHeader><CardTitle className="text-sm">Top event types</CardTitle></CardHeader>
            <CardContent className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide />
                  <YAxis allowDecimals={false} />
                  <RTooltip />
                  <Bar dataKey="value" fill="#60a5fa" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="h-64">
            <CardHeader><CardTitle className="text-sm">Top IPs</CardTitle></CardHeader>
            <CardContent className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topIpData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ip" hide />
                  <YAxis allowDecimals={false} />
                  <RTooltip />
                  <Bar dataKey="count" fill="#34d399" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Automated Security Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm text-stone-600">Get an AI summary of recent events</div>
              <Button onClick={generateInsights} disabled={insightsLoading} className="gap-2">
                {insightsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {insightsLoading ? 'Generating...' : 'Generate Insights'}
              </Button>
            </div>
            {insights && (
              <div className="space-y-3 text-sm">
                {insights.summary && <p className="text-stone-800">{insights.summary}</p>}
                {Array.isArray(insights.top_risks) && insights.top_risks.length > 0 && (
                  <div>
                    <div className="font-medium mb-1">Top Risks</div>
                    <ul className="list-disc ml-5">{insights.top_risks.map((r,i)=>(<li key={i}>{r}</li>))}</ul>
                  </div>
                )}
                {Array.isArray(insights.suspicious_ips) && insights.suspicious_ips.length > 0 && (
                  <div>
                    <div className="font-medium mb-1">Suspicious IPs</div>
                    <div className="flex flex-wrap gap-2">{insights.suspicious_ips.map((ip,i)=>(<Badge key={i} variant="outline">{ip}</Badge>))}</div>
                  </div>
                )}
                {Array.isArray(insights.recommendations) && insights.recommendations.length > 0 && (
                  <div>
                    <div className="font-medium mb-1">Recommendations</div>
                    <ul className="list-disc ml-5">{insights.recommendations.map((r,i)=>(<li key={i}>{r}</li>))}</ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Alert Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex items-center gap-2"><Checkbox checked={secCfg.enabled} onCheckedChange={(v)=> setSecCfg({ ...secCfg, enabled: !!v })} /> Enable Alerts</label>
              <label className="flex items-center gap-2"><Checkbox checked={secCfg.notify_in_app} onCheckedChange={(v)=> setSecCfg({ ...secCfg, notify_in_app: !!v })} /> In-App Notifications</label>
              <label className="flex items-center gap-2"><Checkbox checked={secCfg.notify_email} onCheckedChange={(v)=> setSecCfg({ ...secCfg, notify_email: !!v })} /> Email Notifications</label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <div className="text-xs text-stone-500 mb-1">Failed Logins Threshold</div>
                <Input type="number" min={1} value={secCfg.failed_login_threshold} onChange={(e)=> setSecCfg({ ...secCfg, failed_login_threshold: Number(e.target.value||0) })} className="bg-white" />
              </div>
              <div>
                <div className="text-xs text-stone-500 mb-1">Window (minutes)</div>
                <Input type="number" min={1} value={secCfg.window_minutes} onChange={(e)=> setSecCfg({ ...secCfg, window_minutes: Number(e.target.value||0) })} className="bg-white" />
              </div>
              <div>
                <div className="text-xs text-stone-500 mb-1">Severity</div>
                <Select value={secCfg.severity_for_threshold} onValueChange={(v)=> setSecCfg({ ...secCfg, severity_for_threshold: v })}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-xs text-stone-500 mb-1">Auto-block (minutes)</div>
                <Input type="number" min={1} disabled={!secCfg.auto_block_enabled} value={secCfg.auto_block_minutes} onChange={(e)=> setSecCfg({ ...secCfg, auto_block_minutes: Number(e.target.value||0) })} className="bg-white" />
              </div>
            </div>
            <label className="flex items-center gap-2"><Checkbox checked={secCfg.auto_block_enabled} onCheckedChange={(v)=> setSecCfg({ ...secCfg, auto_block_enabled: !!v })} /> Enable Auto-block when threshold is met</label>
            <div className="flex justify-end">
              <Button onClick={saveSecCfg}>Save Settings</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Blocked IPs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm text-stone-600">Manage active and historical blocks</div>
              <Select value={blockedView} onValueChange={setBlockedView}>
                <SelectTrigger className="w-40 bg-white"><SelectValue placeholder="View"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive/Expired</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="p-2 text-left">IP</th>
                    <th className="p-2 text-left">Reason</th>
                    <th className="p-2 text-left">Blocked Until</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Intel</th>
                    <th className="p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredBlocked.length === 0 ? (
                    <tr><td className="p-3" colSpan={6}>No records</td></tr>
                  ) : (
                    filteredBlocked.map((rec) => {
                      const isActive = rec.active && new Date(rec.blocked_until).getTime() > Date.now();
                      const status = isActive ? 'Active' : (rec.active ? 'Expired' : 'Inactive');
                      return (
                        <tr key={rec.id} className="hover:bg-stone-50">
                          <td className="p-2">{rec.ip_address}</td>
                          <td className="p-2">{rec.reason || '-'}</td>
                          <td className="p-2">{rec.blocked_until ? format(new Date(rec.blocked_until), 'MMM d, yyyy HH:mm') : '-'}</td>
                          <td className="p-2">
                            <Badge className={isActive ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-600'}>{status}</Badge>
                          </td>
                          <td className="p-2">
                            {intelMap[rec.ip_address]?.matched ? (
                              <Badge className="bg-red-100 text-red-700">Threat</Badge>
                            ) : (
                              <span className="text-stone-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="p-2">
                            {isActive ? (
                              <Button size="sm" variant="outline" onClick={() => unblockIp(rec)}>Unblock</Button>
                            ) : (
                              <span className="text-stone-400 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Events ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50">
                <tr>
                  <th className="p-2 text-left">When</th>
                  <th className="p-2 text-left">Severity</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">Message</th>
                  <th className="p-2 text-left">IP</th>
                  <th className="p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr><td className="p-3" colSpan={6}><Loader2 className="w-4 h-4 mr-2 inline-block animate-spin"/> Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td className="p-3" colSpan={6}>No events</td></tr>
                ) : (
                  filtered.map(e => (
                    <tr key={e.id} className="hover:bg-stone-50">
                      <td className="p-2 text-stone-600">{format(new Date(e.created_date), 'MMM d, yyyy HH:mm')}</td>
                      <td className="p-2"><Badge className={sevBadge(e.severity)}>{e.severity}</Badge></td>
                      <td className="p-2">{e.event_type}</td>
                      <td className="p-2 max-w-[380px] truncate" title={e.message}>{e.message}</td>
                      <td className="p-2">
                        {e.ip_address || '-'}
                        {e.ip_address && intelMap[e.ip_address]?.matched && (
                          <Badge className="ml-2 bg-red-100 text-red-700">Threat</Badge>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setDetails(e)}>View</Button>
                          <Button variant="secondary" size="sm" disabled={!e.ip_address || blockedSet.has(e.ip_address)} onClick={() => openBlockIp(e.ip_address)}>
                            {blockedSet.has(e.ip_address) ? 'Blocked' : 'Block IP'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Dialog open={!!details} onOpenChange={(o)=> !o && setDetails(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Event Details</DialogTitle>
            </DialogHeader>
            {details?.ip_address && (
              <div className="flex gap-2 mb-2">
                <Button size="sm" onClick={() => openBlockIp(details.ip_address)} disabled={blockedSet.has(details.ip_address)}>
                  {blockedSet.has(details.ip_address) ? 'Already Blocked' : 'Block IP'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(details.ip_address); toast.success('IP copied'); }}>
                  Copy IP
                </Button>
              </div>
            )}
            {details && (
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">When:</span> {new Date(details.created_date).toLocaleString()}</div>
                <div><span className="font-medium">Severity:</span> {details.severity}</div>
                <div><span className="font-medium">Type:</span> {details.event_type}</div>
                <div><span className="font-medium">IP:</span> {details.ip_address || '-'} {details?.ip_address && intelMap[details.ip_address]?.matched && (<Badge className="ml-2 bg-red-100 text-red-700">Threat</Badge>)}</div>
                <div className="mt-2"><span className="font-medium">Message:</span> {details.message}</div>
                {details?.ip_address && (
                  <div className="mt-2">
                    <div className="font-medium">Threat Intelligence</div>
                    {intelLoading ? (
                      <div className="text-xs text-stone-500">Checking…</div>
                    ) : (
                      intelMap[details.ip_address]?.matched ? (
                        <div className="text-xs">
                          <div className="flex flex-wrap gap-1 mb-1">
                            {(intelMap[details.ip_address].families || []).map((f,i)=>(<Badge key={i} className="bg-red-100 text-red-700">{f}</Badge>))}
                          </div>
                          {intelMap[details.ip_address].last_seen && (
                            <div className="text-stone-500">Last seen: {format(new Date(intelMap[details.ip_address].last_seen), 'MMM d, yyyy')}</div>
                          )}
                          <div className="mt-2 flex gap-2">
                            <Button size="sm" onClick={async ()=>{
                              await base44.entities.SecurityEvent.create({
                                event_type: 'threat_intel_match',
                                severity: 'critical',
                                message: `High-severity threat intel match: ${details.ip_address}`,
                                ip_address: details.ip_address,
                                details: intelMap[details.ip_address]
                              });
                              toast.success('Critical alert created');
                            }}>Raise High-Severity Alert</Button>
                            <Button size="sm" variant="outline" onClick={async ()=>{
                              const res = await base44.functions.invoke('autoRespondToEvent', { event_id: details.id });
                              if (res?.data?.error) { toast.error(res.data.error); return; }
                              toast.success('Auto-response executed');
                              qc.invalidateQueries({ queryKey: ['blocked-ips'] });
                              qc.invalidateQueries({ queryKey: ['blocked-all'] });
                            }}>Auto-Respond (Block + Notify)</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-stone-600">No known threats for this IP</div>
                      )
                    )}
                  </div>
                )}
                <div className="mt-2">
                  <div className="font-medium">Details JSON</div>
                  <pre className="bg-stone-100 p-2 rounded text-xs overflow-auto max-h-80">{JSON.stringify(details.details || {}, null, 2)}</pre>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={blockModal.open} onOpenChange={(o)=> setBlockModal(m=>({ ...m, open: o }))}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Block IP {blockModal.ip}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-stone-500 mb-1">Duration (minutes)</div>
                <Input type="number" min={1} value={blockModal.minutes} onChange={(e)=> setBlockModal(m=>({ ...m, minutes: e.target.value }))} />
              </div>
              <div>
                <div className="text-xs text-stone-500 mb-1">Reason (optional)</div>
                <Input value={blockModal.reason} onChange={(e)=> setBlockModal(m=>({ ...m, reason: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={()=> setBlockModal({ open: false, ip: '', minutes: 60, reason: '' })}>Cancel</Button>
                <Button onClick={submitBlockIp}>Block</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}