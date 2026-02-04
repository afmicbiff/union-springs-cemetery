import React, { useState, useMemo, useCallback, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, ShieldAlert, Activity, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const severityColor = (s) => ({
  info: 'bg-slate-100 text-slate-700',
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
}[s] || 'bg-slate-100 text-slate-700');

// Memoized event row
const EventRow = memo(function EventRow({ event }) {
  return (
    <tr className="hover:bg-stone-50 transition-colors">
      <td className="p-1.5 sm:p-2 text-[10px] sm:text-xs text-stone-600 whitespace-nowrap">
        {new Date(event.created_date).toLocaleString()}
      </td>
      <td className="p-1.5 sm:p-2">
        <Badge className={`${severityColor(event.severity)} text-[10px] sm:text-xs`}>{event.severity}</Badge>
      </td>
      <td className="p-1.5 sm:p-2 text-[10px] sm:text-xs">{event.event_type}</td>
      <td className="p-1.5 sm:p-2 max-w-[150px] sm:max-w-[250px] truncate text-[10px] sm:text-xs" title={event.message}>
        {event.message}
      </td>
      <td className="p-1.5 sm:p-2 text-stone-600 font-mono text-[10px] sm:text-xs">{event.ip_address || '-'}</td>
      <td className="p-1.5 sm:p-2 text-stone-600 text-[10px] sm:text-xs max-w-[100px] truncate">{event.route || '-'}</td>
    </tr>
  );
});

function SecurityMonitor() {
  const [severity, setSeverity] = useState('all');

  const { data: events = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['security-events'],
    queryFn: () => base44.entities.SecurityEvent.list('-created_date', 200),
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const filtered = useMemo(() => {
    return events.filter(e => severity === 'all' || e.severity === severity);
  }, [events, severity]);

  const stats = useMemo(() => {
    const buckets = { info: 0, low: 0, medium: 0, high: 0, critical: 0 };
    events.forEach(e => { if (buckets[e.severity] !== undefined) buckets[e.severity]++; });
    const byIp = {};
    events.forEach(e => { if (e.ip_address) byIp[e.ip_address] = (byIp[e.ip_address] || 0) + 1; });
    const topIps = Object.entries(byIp).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { buckets, topIps };
  }, [events]);

  const suggestions = useMemo(() => {
    const s = [];
    if ((stats.buckets.high + stats.buckets.critical) >= 5) {
      s.push('Multiple high/critical events detected. Review firewall rules and investigate recent IPs.');
    }
    if (stats.topIps.some(([, count]) => count >= 10)) {
      s.push('One or more IPs generated 10+ events. Consider temporary blocking or rate-limiting.');
    }
    if (events.some(e => e.event_type === 'input_validation_error')) {
      s.push('Input validation errors found. Review forms and server validations.');
    }
    if (s.length === 0) s.push('No urgent issues detected. Keep monitoring.');
    return s;
  }, [events, stats]);

  const exportCSV = useCallback(() => {
    const header = ['created_date', 'severity', 'event_type', 'message', 'ip_address', 'user_agent', 'user_email', 'route'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
    const rows = events.map(e => [
      e.created_date, e.severity, e.event_type, e.message || '',
      e.ip_address || '', e.user_agent || '', e.user_email || '', e.route || ''
    ]);
    const csv = [header.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'security_events.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [events]);

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base lg:text-lg flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" /> Security Monitor
          </CardTitle>
          <Link to={createPageUrl('SecurityDashboard')}>
            <Button variant="outline" size="sm" className="h-7 sm:h-8 text-xs sm:text-sm">
              Full Dashboard
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] sm:text-xs text-stone-600">Severity</span>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="h-7 sm:h-8 w-24 sm:w-32 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
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
          <Button variant="outline" size="sm" onClick={exportCSV} className="h-7 sm:h-8 text-[10px] sm:text-xs gap-1">
            <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Export
          </Button>
          <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching} className="h-7 w-7 sm:h-8 sm:w-8 ml-auto">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2">
          {Object.entries(stats.buckets).map(([k, v]) => (
            <div key={k} className="p-2 sm:p-3 rounded border bg-white">
              <div className="text-[9px] sm:text-xs text-stone-500 uppercase">{k}</div>
              <div className="text-base sm:text-xl font-semibold tabular-nums">{v}</div>
            </div>
          ))}
        </div>

        {/* Suggestions */}
        <div className="p-2 sm:p-3 rounded border bg-amber-50 text-amber-900 text-[10px] sm:text-xs">
          <div className="flex items-center gap-1.5 font-medium mb-1">
            <Activity className="w-3 h-3 sm:w-4 sm:h-4" /> Suggestions
          </div>
          <ul className="list-disc pl-4 space-y-0.5">
            {suggestions.map((t, i) => (<li key={i}>{t}</li>))}
          </ul>
        </div>

        {/* Events Table */}
        {isError ? (
          <div className="text-center py-4 sm:py-6">
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 mx-auto mb-2" />
            <p className="text-[10px] sm:text-xs text-stone-500 mb-2">Failed to load events</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-6 text-[10px]">
              Retry
            </Button>
          </div>
        ) : (
          <div className="rounded border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="p-1.5 sm:p-2 text-left text-[10px] sm:text-xs font-medium">When</th>
                    <th className="p-1.5 sm:p-2 text-left text-[10px] sm:text-xs font-medium">Severity</th>
                    <th className="p-1.5 sm:p-2 text-left text-[10px] sm:text-xs font-medium">Type</th>
                    <th className="p-1.5 sm:p-2 text-left text-[10px] sm:text-xs font-medium">Message</th>
                    <th className="p-1.5 sm:p-2 text-left text-[10px] sm:text-xs font-medium">IP</th>
                    <th className="p-1.5 sm:p-2 text-left text-[10px] sm:text-xs font-medium">Route</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    <tr>
                      <td className="p-3 sm:p-4" colSpan={6}>
                        <div className="flex items-center justify-center text-stone-500 text-xs">
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading…
                        </div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr><td className="p-3 sm:p-4 text-center text-stone-500 text-xs" colSpan={6}>No events</td></tr>
                  ) : (
                    filtered.slice(0, 50).map(e => <EventRow key={e.id} event={e} />)
                  )}
                </tbody>
              </table>
            </div>
            {filtered.length > 50 && (
              <div className="p-2 text-center text-[10px] sm:text-xs text-stone-500 border-t">
                Showing 50 of {filtered.length} events.{' '}
                <Link to={createPageUrl('SecurityDashboard')} className="text-teal-600 hover:underline">
                  View all →
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(SecurityMonitor);