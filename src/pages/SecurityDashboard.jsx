import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import SecurityMonitor from '@/components/admin/SecurityMonitor';

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

  const blockedSet = React.useMemo(() => {
    const now = Date.now();
    const set = new Set();
    (blocked || []).forEach(b => { if (b.active && new Date(b.blocked_until).getTime() > now) set.add(b.ip_address); });
    return set;
  }, [blocked]);

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
                      <td className="p-2">{e.ip_address || '-'}</td>
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Data Security & Archiving
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="prose text-stone-700 space-y-8 max-w-none">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-bold text-lg mb-2 text-stone-900">Data Storage</h4>
                  <p className="leading-relaxed">
                    All cemetery records are securely stored in the cloud database. This ensures redundancy and access from any authorized device.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-2 text-stone-900">Backups</h4>
                  <p className="leading-relaxed">
                    It is recommended to perform a manual export once a month. Save this JSON file to a secure external hard drive or a dedicated organizational cloud storage.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-2 text-stone-900">Restoration</h4>
                  <p className="leading-relaxed">
                    In the event of data loss, the exported JSON file can be used by the technical team to restore the database to its previous state.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-2 text-stone-900">Access Control</h4>
                  <p className="leading-relaxed">
                    Only authorized administrators should have access to this dashboard. Regularly review who has access credentials.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-yellow-50 text-yellow-800 rounded-sm border-l-4 border-yellow-400">
              <strong>Security Tip:</strong> When downloading reports containing personal information, ensure they are stored in encrypted folders on your device.
            </div>

            <SecurityMonitor />
          </CardContent>
        </Card>

        <Dialog open={!!details} onOpenChange={(o)=> !o && setDetails(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Event Details</DialogTitle>
            </DialogHeader>
            {details && (
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">When:</span> {new Date(details.created_date).toLocaleString()}</div>
                <div><span className="font-medium">Severity:</span> {details.severity}</div>
                <div><span className="font-medium">Type:</span> {details.event_type}</div>
                <div><span className="font-medium">IP:</span> {details.ip_address || '-'}</div>
                <div className="mt-2"><span className="font-medium">Message:</span> {details.message}</div>
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