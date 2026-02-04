import React, { memo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Copy, Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const SEV_BADGE = {
  info: 'bg-slate-100 text-slate-700',
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};

function EventDetailDialog({ event, open, onOpenChange, blockedSet, intelMap, onBlockIp }) {
  const qc = useQueryClient();

  // Endpoint correlation
  const { data: matchedEndpoints = [], isLoading: endpointsLoading } = useQuery({
    queryKey: ['endpoints-for-event', event?.id],
    queryFn: async () => {
      if (!event) return [];
      const results = [];
      if (event.ip_address) {
        const byIp = await base44.entities.Endpoint.filter({ last_ip: event.ip_address }, '-updated_date', 3);
        results.push(...byIp);
      }
      if (event.user_email) {
        const byUser = await base44.entities.Endpoint.filter({ owner_email: event.user_email }, '-updated_date', 3);
        results.push(...byUser);
      }
      const map = new Map();
      results.forEach(e => map.set(e.id, e));
      return Array.from(map.values());
    },
    enabled: !!event && open,
    staleTime: 60_000,
  });

  const selectedEndpoint = matchedEndpoints[0] || null;

  // Endpoint logs
  const { data: endpointLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['endpoint-logs', selectedEndpoint?.id],
    queryFn: () => base44.entities.EndpointEvent.filter({ endpoint_id: selectedEndpoint.id }, '-timestamp', 20),
    enabled: !!selectedEndpoint && open,
    staleTime: 60_000,
  });

  const handleCopyIp = useCallback(() => {
    if (event?.ip_address) {
      navigator.clipboard.writeText(event.ip_address);
      toast.success('IP copied');
    }
  }, [event?.ip_address]);

  const handleBlock = useCallback(() => {
    if (event?.ip_address) onBlockIp(event.ip_address);
  }, [event?.ip_address, onBlockIp]);

  const raiseAlert = useCallback(async () => {
    if (!event?.ip_address) return;
    await base44.entities.SecurityEvent.create({
      event_type: 'threat_intel_match',
      severity: 'critical',
      message: `High-severity threat intel match: ${event.ip_address}`,
      ip_address: event.ip_address,
      details: intelMap[event.ip_address] || {}
    });
    toast.success('Critical alert created');
    qc.invalidateQueries({ queryKey: ['sec-events'] });
  }, [event, intelMap, qc]);

  const autoRespond = useCallback(async () => {
    if (!event?.id) return;
    const res = await base44.functions.invoke('autoRespondToEvent', { event_id: event.id });
    if (res?.data?.error) {
      toast.error(res.data.error);
      return;
    }
    toast.success('Auto-response executed');
    qc.invalidateQueries({ queryKey: ['blocked-ips'] });
    qc.invalidateQueries({ queryKey: ['blocked-all'] });
  }, [event, qc]);

  if (!event) return null;

  const isBlocked = blockedSet?.has(event.ip_address);
  const intel = intelMap?.[event.ip_address];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-sm sm:text-base lg:text-lg">Event Details</DialogTitle>
        </DialogHeader>

        {event.ip_address && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3">
            <Button size="sm" onClick={handleBlock} disabled={isBlocked} className="h-7 sm:h-8 text-xs sm:text-sm">
              <Shield className="w-3.5 h-3.5 mr-1" />
              {isBlocked ? 'Already Blocked' : 'Block IP'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCopyIp} className="h-7 sm:h-8 text-xs sm:text-sm">
              <Copy className="w-3.5 h-3.5 mr-1" /> Copy IP
            </Button>
          </div>
        )}

        <div className="space-y-3 sm:space-y-4 text-xs sm:text-sm">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div><span className="font-medium text-stone-500">When:</span> {format(new Date(event.created_date), 'MMM d, yyyy HH:mm:ss')}</div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-stone-500">Severity:</span>
              <Badge className={SEV_BADGE[event.severity]}>{event.severity}</Badge>
            </div>
            <div><span className="font-medium text-stone-500">Type:</span> {event.event_type}</div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-stone-500">IP:</span>
              <span className="font-mono">{event.ip_address || '-'}</span>
              {intel?.matched && <Badge className="bg-red-100 text-red-700 text-[10px]">Threat</Badge>}
            </div>
          </div>

          <div className="p-2 sm:p-3 bg-stone-50 rounded-lg">
            <span className="font-medium text-stone-500">Message:</span>
            <p className="mt-1 text-stone-700">{event.message}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div><span className="font-medium text-stone-500">User:</span> {event.user_email || '-'}</div>
            <div><span className="font-medium text-stone-500">Route:</span> {event.route || '-'}</div>
          </div>

          {event.user_agent && (
            <div className="text-[10px] sm:text-xs text-stone-500 break-all">
              <span className="font-medium">User Agent:</span> {event.user_agent}
            </div>
          )}

          {/* Threat Intel */}
          {event.ip_address && (
            <div className="border-t pt-3">
              <h4 className="text-xs sm:text-sm font-medium mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500" /> Threat Intelligence
              </h4>
              {intel?.matched ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {(intel.families || []).map((f, i) => (
                      <Badge key={i} className="bg-red-100 text-red-700 text-[10px]">{f}</Badge>
                    ))}
                  </div>
                  {intel.last_seen && (
                    <p className="text-[10px] sm:text-xs text-stone-500">Last seen: {format(new Date(intel.last_seen), 'MMM d, yyyy')}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Button size="sm" onClick={raiseAlert} className="h-6 sm:h-7 text-[10px] sm:text-xs">
                      Raise Critical Alert
                    </Button>
                    <Button size="sm" variant="outline" onClick={autoRespond} className="h-6 sm:h-7 text-[10px] sm:text-xs">
                      Auto-Respond (Block + Notify)
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] sm:text-xs text-stone-500">No known threats for this IP</p>
              )}
            </div>
          )}

          {/* Endpoint Intelligence */}
          <div className="border-t pt-3">
            <h4 className="text-xs sm:text-sm font-medium mb-2">Endpoint Intelligence</h4>
            {endpointsLoading ? (
              <div className="flex items-center gap-2 text-[10px] sm:text-xs text-stone-500">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading…
              </div>
            ) : selectedEndpoint ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2 text-[10px] sm:text-xs">
                  <div><span className="font-medium">Hostname:</span> {selectedEndpoint.hostname || '-'}</div>
                  <div><span className="font-medium">Device ID:</span> {selectedEndpoint.device_id || '-'}</div>
                  <div><span className="font-medium">Owner:</span> {selectedEndpoint.owner_email || '-'}</div>
                  <div><span className="font-medium">OS:</span> {selectedEndpoint.os || '-'}</div>
                  <div><span className="font-medium">Status:</span> {selectedEndpoint.status || '-'}</div>
                  <div><span className="font-medium">Posture:</span> {selectedEndpoint.security_posture || '-'}</div>
                </div>
                
                {logsLoading ? (
                  <div className="text-[10px] text-stone-500">Loading logs…</div>
                ) : endpointLogs.length > 0 && (
                  <div className="mt-2">
                    <h5 className="text-[10px] sm:text-xs font-medium mb-1">Recent Logs</h5>
                    <div className="overflow-x-auto max-h-32 border rounded">
                      <table className="w-full text-[9px] sm:text-[10px]">
                        <thead className="bg-stone-100 sticky top-0">
                          <tr>
                            <th className="p-1 text-left">Time</th>
                            <th className="p-1 text-left">Type</th>
                            <th className="p-1 text-left">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {endpointLogs.slice(0, 10).map(log => (
                            <tr key={log.id}>
                              <td className="p-1 whitespace-nowrap">{log.timestamp ? format(new Date(log.timestamp), 'HH:mm:ss') : '-'}</td>
                              <td className="p-1">{log.type}</td>
                              <td className="p-1 max-w-[150px] truncate">{log.process_name || log.file_path || log.description || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[10px] sm:text-xs text-stone-500">No associated endpoint found</p>
            )}
          </div>

          {/* Raw Details */}
          {event.details && Object.keys(event.details).length > 0 && (
            <div className="border-t pt-3">
              <h4 className="text-xs sm:text-sm font-medium mb-2">Details JSON</h4>
              <pre className="bg-stone-100 p-2 rounded text-[9px] sm:text-[10px] overflow-auto max-h-40 font-mono">
                {JSON.stringify(event.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default memo(EventDetailDialog);