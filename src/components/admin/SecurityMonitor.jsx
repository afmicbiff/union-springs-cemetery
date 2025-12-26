import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, ShieldAlert, Activity } from 'lucide-react';

const severityColor = (s) => ({
  info: 'bg-slate-100 text-slate-700',
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
}[s] || 'bg-slate-100 text-slate-700');

export default function SecurityMonitor() {
  const [severity, setSeverity] = React.useState('all');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['security-events'],
    queryFn: () => base44.entities.SecurityEvent.list('-created_date', 200),
    initialData: [],
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const filtered = React.useMemo(() => {
    return events.filter(e => severity === 'all' || e.severity === severity);
  }, [events, severity]);

  const stats = React.useMemo(() => {
    const buckets = { info: 0, low: 0, medium: 0, high: 0, critical: 0 };
    events.forEach(e => { if (buckets[e.severity] !== undefined) buckets[e.severity]++; });
    const byIp = {};
    events.forEach(e => { if (e.ip_address) byIp[e.ip_address] = (byIp[e.ip_address] || 0) + 1; });
    const topIps = Object.entries(byIp).sort((a,b)=>b[1]-a[1]).slice(0,5);
    return { buckets, topIps };
  }, [events]);

  const suggestions = React.useMemo(() => {
    const s = [];
    if ((stats.buckets.high + stats.buckets.critical) >= 5) {
      s.push('Multiple high/critical events detected. Review firewall/WAF rules and investigate recent IPs.');
    }
    if (stats.topIps.some(([ip, count]) => count >= 10)) {
      s.push('One or more IPs generated 10+ events. Consider temporary blocking or rate-limiting those IPs.');
    }
    if (events.some(e => e.event_type === 'input_validation_error')) {
      s.push('Input validation errors found. Review client-side forms and server validations for stricter schemas.');
    }
    if (s.length === 0) s.push('No urgent issues detected. Keep monitoring and ensure regular audits.');
    return s;
  }, [events, stats]);

  const exportCSV = () => {
    const header = ['created_date','severity','event_type','message','ip_address','user_agent','user_email','route','tags'];
    const rows = events.map(e => [e.created_date, e.severity, e.event_type, (e.message||'').replace(/\n/g,' '), e.ip_address||'', e.user_agent||'', e.user_email||'', e.route||'', (e.tags||[]).join('|')]);
    const csv = [header.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'security_events.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-teal-600"/> Security Monitor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-stone-600">Severity</span>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="h-8 w-40"><SelectValue placeholder="All" /></SelectTrigger>
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
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2"><Download className="w-4 h-4"/> Export CSV</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {Object.entries(stats.buckets).map(([k,v]) => (
            <div key={k} className="p-3 rounded border bg-white">
              <div className="text-xs text-stone-500 uppercase">{k}</div>
              <div className="text-xl font-semibold">{v}</div>
            </div>
          ))}
        </div>

        <div className="p-3 rounded border bg-amber-50 text-amber-900 text-sm">
          <div className="flex items-center gap-2 font-medium"><Activity className="w-4 h-4"/> Suggestions</div>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            {suggestions.map((t, i) => (<li key={i}>{t}</li>))}
          </ul>
        </div>

        <div className="rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50">
              <tr>
                <th className="p-2 text-left">When</th>
                <th className="p-2 text-left">Severity</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Message</th>
                <th className="p-2 text-left">IP</th>
                <th className="p-2 text-left">Route</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td className="p-3" colSpan={6}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="p-3" colSpan={6}>No events</td></tr>
              ) : (
                filtered.map(e => (
                  <tr key={e.id} className="hover:bg-stone-50">
                    <td className="p-2 text-xs text-stone-600">{new Date(e.created_date).toLocaleString()}</td>
                    <td className="p-2"><Badge className={severityColor(e.severity)}>{e.severity}</Badge></td>
                    <td className="p-2">{e.event_type}</td>
                    <td className="p-2 max-w-[360px] truncate" title={e.message}>{e.message}</td>
                    <td className="p-2 text-stone-600">{e.ip_address || '-'}</td>
                    <td className="p-2 text-stone-600">{e.route || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}