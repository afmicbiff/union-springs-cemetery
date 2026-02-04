import React, { memo, useCallback, useState, lazy, Suspense } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Copy, Shield, AlertTriangle, Loader2, Monitor, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

// Lazy load the heavy EndpointIntelligence component
const EndpointIntelligence = lazy(() => import('./EndpointIntelligence'));

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

  // Endpoint logs - fetch more for correlation
  const { data: endpointLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['endpoint-logs', selectedEndpoint?.id],
    queryFn: () => base44.entities.EndpointEvent.filter({ endpoint_id: selectedEndpoint.id }, '-timestamp', 50),
    enabled: !!selectedEndpoint && open,
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
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

  const [autoResponding, setAutoResponding] = useState(false);

  const autoRespond = useCallback(async () => {
    if (!event?.id || autoResponding) return;
    setAutoResponding(true);
    try {
      const res = await base44.functions.invoke('executeAutoResponse', { event_id: event.id, manual: true });
      if (res?.data?.error) {
        toast.error(res.data.error);
        return;
      }
      const results = res?.data?.results || [];
      const triggered = results.filter(r => r.triggered);
      if (triggered.length > 0) {
        toast.success(`${triggered.length} auto-response rule(s) executed`);
      } else {
        toast.info('No matching auto-response rules found');
      }
      qc.invalidateQueries({ queryKey: ['blocked-ips'] });
      qc.invalidateQueries({ queryKey: ['blocked-all'] });
      qc.invalidateQueries({ queryKey: ['auto-response-logs'] });
    } catch (e) {
      toast.error('Auto-response failed');
    } finally {
      setAutoResponding(false);
    }
  }, [event, qc, autoResponding]);

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

          {/* Threat Intel - Enhanced */}
          {event.ip_address && (
            <div className="border-t pt-3">
              <h4 className="text-xs sm:text-sm font-medium mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500" /> Threat Intelligence
              </h4>
              {intel?.matched ? (
                <div className="space-y-3">
                  {/* Risk Score */}
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      intel.risk_level === 'critical' ? 'bg-red-100 text-red-800' :
                      intel.risk_level === 'high' ? 'bg-orange-100 text-orange-800' :
                      intel.risk_level === 'medium' ? 'bg-amber-100 text-amber-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      Risk Score: {intel.risk_score || 'N/A'}/100
                    </div>
                    {intel.sources?.map((s, i) => (
                      <Badge key={i} variant="outline" className="text-[9px]">{s}</Badge>
                    ))}
                  </div>

                  {/* Malware Families */}
                  {intel.families?.length > 0 && (
                    <div>
                      <span className="text-[10px] text-stone-500">Malware Families:</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {intel.families.map((f, i) => (
                          <Badge key={i} className="bg-red-100 text-red-700 text-[10px]">{f}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Threat Types */}
                  {intel.threat_types?.length > 0 && (
                    <div>
                      <span className="text-[10px] text-stone-500">Threat Types:</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {intel.threat_types.map((t, i) => (
                          <Badge key={i} className="bg-orange-100 text-orange-700 text-[10px]">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* MITRE ATT&CK */}
                  {intel.mitre_techniques?.length > 0 && (
                    <div>
                      <span className="text-[10px] text-stone-500">MITRE ATT&CK:</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {intel.mitre_techniques.map((t, i) => (
                          <a
                            key={i}
                            href={`https://attack.mitre.org/techniques/${t.id.replace('.', '/')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[9px] hover:bg-purple-100"
                          >
                            {t.id} <ExternalLink className="w-2 h-2" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mitigations */}
                  {intel.mitigations?.length > 0 && (
                    <div>
                      <span className="text-[10px] text-stone-500">Recommended Actions:</span>
                      <div className="space-y-1 mt-1">
                        {intel.mitigations.slice(0, 3).map((m, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-[10px]">
                            <Badge className={`shrink-0 text-[8px] ${
                              m.priority === 'critical' ? 'bg-red-500 text-white' :
                              m.priority === 'high' ? 'bg-orange-500 text-white' :
                              'bg-amber-500 text-white'
                            }`}>{m.priority}</Badge>
                            <span><strong>{m.action}:</strong> {m.detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Additional Intel */}
                  {intel.abuseipdb && (
                    <div className="text-[10px] text-stone-600 flex flex-wrap gap-3">
                      {intel.abuseipdb.country && <span>Country: {intel.abuseipdb.country}</span>}
                      {intel.abuseipdb.isp && <span>ISP: {intel.abuseipdb.isp}</span>}
                      {intel.abuseipdb.is_tor && <Badge className="bg-purple-100 text-purple-700 text-[9px]">Tor Exit Node</Badge>}
                      {intel.abuseipdb.total_reports && <span>{intel.abuseipdb.total_reports} abuse reports</span>}
                    </div>
                  )}

                  {intel.last_seen && (
                    <p className="text-[10px] text-stone-500">Last seen malicious: {format(new Date(intel.last_seen), 'MMM d, yyyy')}</p>
                  )}

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Button size="sm" onClick={raiseAlert} className="h-6 sm:h-7 text-[10px] sm:text-xs">
                      Raise Critical Alert
                    </Button>
                    <Button size="sm" variant="outline" onClick={autoRespond} disabled={autoResponding} className="h-6 sm:h-7 text-[10px] sm:text-xs">
                      {autoResponding ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Running…</> : 'Run Auto-Response'}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] sm:text-xs text-stone-500">No known threats for this IP in queried databases</p>
              )}
            </div>
          )}

          {/* Endpoint Intelligence - Enhanced */}
          <div className="border-t pt-3">
            <h4 className="text-xs sm:text-sm font-medium mb-2 flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-blue-500" /> Endpoint Intelligence
            </h4>
            {endpointsLoading ? (
              <div className="flex items-center gap-2 text-[10px] sm:text-xs text-stone-500">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading endpoint data…
              </div>
            ) : selectedEndpoint ? (
              <Suspense fallback={
                <div className="flex items-center gap-2 text-[10px] text-stone-500 py-4">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading endpoint intelligence…
                </div>
              }>
                <EndpointIntelligence 
                  endpoint={selectedEndpoint}
                  endpointEvents={endpointLogs}
                  eventsLoading={logsLoading}
                  securityEvent={event}
                />
              </Suspense>
            ) : (
              <p className="text-[10px] sm:text-xs text-stone-500">No associated endpoint found for this IP/user</p>
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