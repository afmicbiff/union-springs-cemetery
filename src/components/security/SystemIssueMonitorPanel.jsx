import React, { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Activity, CheckCircle2, Loader2, RefreshCw, TriangleAlert, Wrench } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const tone = {
  info: 'bg-slate-100 text-slate-700',
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};

export default function SystemIssueMonitorPanel() {
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['system-issue-logs'],
    queryFn: () => base44.entities.SystemIssueLog.list('-updated_date', 30),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    initialData: []
  });

  const runMaintenance = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('runSystemMaintenanceCheck', { manual: true });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Maintenance check completed');
      queryClient.invalidateQueries({ queryKey: ['system-issue-logs'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['overview-notifications'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Maintenance check failed');
    }
  });

  const lastMaintenance = useMemo(() => logs.find((log) => log.category === 'maintenance_report') || null, [logs]);
  const recentIssues = useMemo(() => logs.filter((log) => log.category !== 'maintenance_report').slice(0, 8), [logs]);

  const stats = useMemo(() => ({
    total: logs.length,
    active: logs.filter((log) => ['detected', 'monitored'].includes(log.status)).length,
    autoFixed: logs.filter((log) => log.auto_fix_applied === true).length,
    critical: logs.filter((log) => log.severity === 'critical').length
  }), [logs]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <Card>
      <CardHeader className="pb-3 px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-600" />
            System Issue Monitor
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching} className="h-8 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => runMaintenance.mutate()} disabled={runMaintenance.isPending} className="h-8 text-xs bg-teal-700 hover:bg-teal-800">
              {runMaintenance.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Wrench className="w-3.5 h-3.5 mr-1" />}
              Run maintenance now
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-3 sm:px-6">
        {isLoading ? (
          <div className="py-8 flex items-center justify-center text-sm text-stone-500">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading monitor logs…
          </div>
        ) : isError ? (
          <div className="py-8 flex flex-col items-center justify-center text-sm text-stone-500 gap-2">
            <TriangleAlert className="w-5 h-5 text-red-500" />
            Failed to load system issue logs.
          </div>
        ) : logs.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-sm text-stone-500 gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            No system issue logs yet.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-lg border bg-white p-3">
                <div className="text-[11px] uppercase text-stone-500">Total logs</div>
                <div className="text-xl font-semibold">{stats.total}</div>
              </div>
              <div className="rounded-lg border bg-white p-3">
                <div className="text-[11px] uppercase text-stone-500">Open issues</div>
                <div className="text-xl font-semibold">{stats.active}</div>
              </div>
              <div className="rounded-lg border bg-white p-3">
                <div className="text-[11px] uppercase text-stone-500">Auto-fixed</div>
                <div className="text-xl font-semibold">{stats.autoFixed}</div>
              </div>
              <div className="rounded-lg border bg-white p-3">
                <div className="text-[11px] uppercase text-stone-500">Critical</div>
                <div className="text-xl font-semibold">{stats.critical}</div>
              </div>
            </div>

            {lastMaintenance && (
              <div className="rounded-lg border bg-stone-50 p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div className="font-medium text-sm sm:text-base">Last maintenance report</div>
                  <Badge className={tone[lastMaintenance.severity] || tone.info}>{lastMaintenance.status}</Badge>
                </div>
                <p className="text-sm text-stone-700">{lastMaintenance.summary}</p>
                <p className="text-xs text-stone-500">
                  {format(new Date(lastMaintenance.detected_at || lastMaintenance.created_date), 'MMM d, yyyy h:mm a')}
                </p>
                {lastMaintenance.auto_fix_summary && (
                  <p className="text-xs text-emerald-700">Fixes: {lastMaintenance.auto_fix_summary}</p>
                )}
                {lastMaintenance.report && (
                  <pre className="text-xs whitespace-pre-wrap bg-white rounded border p-3 overflow-x-auto">{lastMaintenance.report}</pre>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="font-medium text-sm sm:text-base">Recent issue activity</div>
              {recentIssues.length === 0 ? (
                <div className="text-sm text-stone-500">No recent issue detections.</div>
              ) : (
                <div className="space-y-3">
                  {recentIssues.map((log) => (
                    <div key={log.id} className="rounded-lg border bg-white p-4 space-y-2">
                      <div className="flex flex-wrap items-center gap-2 justify-between">
                        <div className="font-medium text-sm text-stone-900">{log.title}</div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[11px]">{log.category.replaceAll('_', ' ')}</Badge>
                          <Badge className={tone[log.severity] || tone.info}>{log.severity}</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-stone-700">{log.summary}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-stone-500">
                        <span>Status: {log.status}</span>
                        <span>Occurrences: {log.occurrence_count || 1}</span>
                        <span>{format(new Date(log.last_seen_at || log.detected_at || log.created_date), 'MMM d, h:mm a')}</span>
                      </div>
                      {log.auto_fix_summary && (
                        <p className="text-xs text-emerald-700">Auto-fix: {log.auto_fix_summary}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}