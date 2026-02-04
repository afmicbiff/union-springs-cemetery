import React, { memo, useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, Monitor, AlertTriangle, Shield, Bug, Activity, 
  Network, HardDrive, FileWarning, ChevronDown, ChevronUp,
  ExternalLink, CheckCircle, XCircle, Clock
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const SEV_BADGE = {
  info: 'bg-slate-100 text-slate-700',
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};

const POSTURE_BADGE = {
  healthy: 'bg-emerald-100 text-emerald-800',
  at_risk: 'bg-amber-100 text-amber-800',
  compromised: 'bg-red-100 text-red-800',
  unknown: 'bg-slate-100 text-slate-700'
};

const STATUS_BADGE = {
  online: 'bg-emerald-100 text-emerald-800',
  offline: 'bg-slate-100 text-slate-700',
  unknown: 'bg-slate-100 text-slate-700'
};

// Suspicious Processes Panel
const SuspiciousProcesses = memo(function SuspiciousProcesses({ processes = [] }) {
  if (!processes?.length) {
    return <p className="text-xs text-stone-500 py-2">No suspicious processes detected</p>;
  }

  return (
    <div className="space-y-2">
      {processes.slice(0, 10).map((proc, i) => (
        <div key={i} className="p-2 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-medium truncate">{proc.name}</span>
                <Badge className="bg-red-100 text-red-700 text-[9px]">
                  Risk: {proc.risk_score?.toFixed(0) || '?'}
                </Badge>
              </div>
              <p className="text-[10px] text-stone-600 truncate mt-0.5">{proc.path}</p>
            </div>
            <div className="text-right text-[9px] text-stone-500 shrink-0">
              <div>PID: {proc.pid}</div>
              <div>CPU: {proc.cpu_percent?.toFixed(1)}%</div>
            </div>
          </div>
          {proc.reason && (
            <p className="text-[10px] text-red-700 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {proc.reason}
            </p>
          )}
        </div>
      ))}
    </div>
  );
});

// File Integrity Alerts Panel
const FileIntegrityAlerts = memo(function FileIntegrityAlerts({ alerts = [], onAcknowledge }) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? alerts : alerts.slice(0, 5);
  const unacknowledged = alerts.filter(a => !a.acknowledged).length;

  if (!alerts?.length) {
    return <p className="text-xs text-stone-500 py-2">No file integrity alerts</p>;
  }

  return (
    <div className="space-y-2">
      {unacknowledged > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded">
          <FileWarning className="w-3.5 h-3.5" />
          {unacknowledged} unacknowledged alert{unacknowledged > 1 ? 's' : ''}
        </div>
      )}
      {displayed.map((alert, i) => (
        <div 
          key={i} 
          className={`p-2 border rounded-lg text-xs ${
            alert.acknowledged ? 'bg-stone-50 border-stone-200' : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Badge className={`${SEV_BADGE[alert.severity]} text-[9px]`}>{alert.severity}</Badge>
                <span className="font-medium capitalize">{alert.change_type?.replace('_', ' ')}</span>
              </div>
              <p className="font-mono text-[10px] text-stone-600 truncate mt-0.5" title={alert.file_path}>
                {alert.file_path}
              </p>
            </div>
            <div className="text-[9px] text-stone-500 text-right shrink-0">
              {alert.detected_at && format(new Date(alert.detected_at), 'MMM d HH:mm')}
            </div>
          </div>
          {alert.current_hash && alert.previous_hash && (
            <div className="mt-1 text-[9px] text-stone-500">
              Hash: <span className="font-mono">{alert.previous_hash?.slice(0, 8)}…</span> → 
              <span className="font-mono">{alert.current_hash?.slice(0, 8)}…</span>
            </div>
          )}
        </div>
      ))}
      {alerts.length > 5 && (
        <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)} className="w-full h-6 text-[10px]">
          {showAll ? 'Show Less' : `Show ${alerts.length - 5} More`}
        </Button>
      )}
    </div>
  );
});

// Vulnerabilities Panel
const VulnerabilitiesPanel = memo(function VulnerabilitiesPanel({ vulnerabilities = [] }) {
  const [showAll, setShowAll] = useState(false);
  
  const stats = useMemo(() => {
    const s = { critical: 0, high: 0, medium: 0, low: 0, total: vulnerabilities.length };
    vulnerabilities.forEach(v => { if (s[v.severity] !== undefined) s[v.severity]++; });
    return s;
  }, [vulnerabilities]);

  const displayed = showAll ? vulnerabilities : vulnerabilities.slice(0, 5);

  if (!vulnerabilities?.length) {
    return (
      <div className="text-xs text-emerald-600 py-2 flex items-center gap-1.5">
        <CheckCircle className="w-3.5 h-3.5" /> No known vulnerabilities
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Stats */}
      <div className="flex flex-wrap gap-1.5">
        {stats.critical > 0 && <Badge className="bg-red-100 text-red-700 text-[9px]">{stats.critical} Critical</Badge>}
        {stats.high > 0 && <Badge className="bg-orange-100 text-orange-700 text-[9px]">{stats.high} High</Badge>}
        {stats.medium > 0 && <Badge className="bg-amber-100 text-amber-700 text-[9px]">{stats.medium} Medium</Badge>}
        {stats.low > 0 && <Badge className="bg-slate-100 text-slate-700 text-[9px]">{stats.low} Low</Badge>}
      </div>

      {/* List */}
      {displayed.map((vuln, i) => (
        <div key={i} className="p-2 border rounded-lg bg-white">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Badge className={`${SEV_BADGE[vuln.severity]} text-[9px]`}>{vuln.severity}</Badge>
                <a 
                  href={`https://nvd.nist.gov/vuln/detail/${vuln.cve_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                >
                  {vuln.cve_id} <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <p className="text-[10px] text-stone-700 mt-0.5 line-clamp-1">{vuln.title}</p>
              <p className="text-[9px] text-stone-500 mt-0.5">
                {vuln.affected_software} {vuln.affected_version}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] font-medium">CVSS: {vuln.cvss_score?.toFixed(1) || '?'}</div>
              {vuln.fix_available ? (
                <span className="text-[9px] text-emerald-600">Fix: {vuln.fix_version}</span>
              ) : (
                <span className="text-[9px] text-stone-500">No fix yet</span>
              )}
            </div>
          </div>
        </div>
      ))}
      {vulnerabilities.length > 5 && (
        <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)} className="w-full h-6 text-[10px]">
          {showAll ? 'Show Less' : `Show ${vulnerabilities.length - 5} More`}
        </Button>
      )}
    </div>
  );
});

// Network Connections Panel
const NetworkConnections = memo(function NetworkConnections({ connections = [] }) {
  if (!connections?.length) {
    return <p className="text-xs text-stone-500 py-2">No active connections</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px]">
        <thead className="bg-stone-50">
          <tr>
            <th className="p-1.5 text-left font-medium">Process</th>
            <th className="p-1.5 text-left font-medium">Remote</th>
            <th className="p-1.5 text-left font-medium">Port</th>
            <th className="p-1.5 text-left font-medium">State</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {connections.slice(0, 15).map((conn, i) => (
            <tr key={i} className="hover:bg-stone-50">
              <td className="p-1.5 font-mono">{conn.process_name || '-'}</td>
              <td className="p-1.5 font-mono">{conn.remote_ip || '-'}</td>
              <td className="p-1.5">{conn.remote_port || '-'}</td>
              <td className="p-1.5">
                <Badge variant="outline" className="text-[9px]">{conn.state || '-'}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

// Security Status Panel
const SecurityStatus = memo(function SecurityStatus({ endpoint }) {
  const av = endpoint?.antivirus_status || {};
  const fw = endpoint?.firewall_status || {};
  const enc = endpoint?.disk_encryption || {};

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {/* Antivirus */}
      <div className="p-2 border rounded-lg bg-white">
        <div className="flex items-center gap-1.5 mb-1">
          <Shield className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs font-medium">Antivirus</span>
        </div>
        {av.installed ? (
          <div className="space-y-0.5 text-[10px]">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              <span>{av.product_name || 'Installed'}</span>
            </div>
            {av.real_time_protection && (
              <div className="text-emerald-600">Real-time protection ON</div>
            )}
            {av.definitions_updated && (
              <div className="text-stone-500">
                Defs: {formatDistanceToNow(new Date(av.definitions_updated), { addSuffix: true })}
              </div>
            )}
            {av.threats_detected > 0 && (
              <div className="text-red-600">{av.threats_detected} threats detected</div>
            )}
          </div>
        ) : (
          <div className="text-[10px] text-red-600 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Not installed
          </div>
        )}
      </div>

      {/* Firewall */}
      <div className="p-2 border rounded-lg bg-white">
        <div className="flex items-center gap-1.5 mb-1">
          <Network className="w-3.5 h-3.5 text-purple-500" />
          <span className="text-xs font-medium">Firewall</span>
        </div>
        {fw.enabled ? (
          <div className="space-y-0.5 text-[10px]">
            <div className="flex items-center gap-1 text-emerald-600">
              <CheckCircle className="w-3 h-3" /> Enabled
            </div>
            <div className="text-stone-500">
              Blocked: {fw.inbound_blocked || 0} in / {fw.outbound_blocked || 0} out
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-red-600 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Disabled
          </div>
        )}
      </div>

      {/* Disk Encryption */}
      <div className="p-2 border rounded-lg bg-white">
        <div className="flex items-center gap-1.5 mb-1">
          <HardDrive className="w-3.5 h-3.5 text-teal-500" />
          <span className="text-xs font-medium">Encryption</span>
        </div>
        {enc.enabled ? (
          <div className="space-y-0.5 text-[10px]">
            <div className="flex items-center gap-1 text-emerald-600">
              <CheckCircle className="w-3 h-3" /> {enc.method || 'Encrypted'}
            </div>
            {enc.percent_encrypted !== undefined && (
              <div className="text-stone-500">{enc.percent_encrypted}% encrypted</div>
            )}
          </div>
        ) : (
          <div className="text-[10px] text-amber-600 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Not encrypted
          </div>
        )}
      </div>
    </div>
  );
});

// Recent Endpoint Events
const RecentEndpointEvents = memo(function RecentEndpointEvents({ events = [], isLoading }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4 text-stone-500 text-xs">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading events…
      </div>
    );
  }

  if (!events?.length) {
    return <p className="text-xs text-stone-500 py-2">No recent endpoint events</p>;
  }

  return (
    <div className="overflow-x-auto max-h-48">
      <table className="w-full text-[10px]">
        <thead className="bg-stone-50 sticky top-0">
          <tr>
            <th className="p-1.5 text-left font-medium">Time</th>
            <th className="p-1.5 text-left font-medium">Type</th>
            <th className="p-1.5 text-left font-medium">Severity</th>
            <th className="p-1.5 text-left font-medium">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {events.slice(0, 20).map(ev => (
            <tr key={ev.id} className="hover:bg-stone-50">
              <td className="p-1.5 whitespace-nowrap text-stone-600">
                {ev.timestamp ? format(new Date(ev.timestamp), 'MMM d HH:mm') : '-'}
              </td>
              <td className="p-1.5 capitalize">{ev.type?.replace('_', ' ')}</td>
              <td className="p-1.5">
                <Badge className={`${SEV_BADGE[ev.severity]} text-[9px]`}>{ev.severity}</Badge>
              </td>
              <td className="p-1.5 max-w-[200px] truncate" title={ev.description || ev.process_name || ev.file_path}>
                {ev.process_name && <span className="font-mono">{ev.process_name}</span>}
                {ev.file_path && <span className="font-mono">{ev.file_path}</span>}
                {ev.description && <span>{ev.description}</span>}
                {!ev.process_name && !ev.file_path && !ev.description && '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

// Main Component
function EndpointIntelligence({ endpoint, endpointEvents = [], eventsLoading, securityEvent }) {
  const [activeTab, setActiveTab] = useState('overview');

  // Correlate security event with endpoint events (time-based)
  const correlatedEvents = useMemo(() => {
    if (!securityEvent?.created_date || !endpointEvents?.length) return [];
    const eventTime = new Date(securityEvent.created_date).getTime();
    const windowMs = 5 * 60 * 1000; // 5 minute window
    return endpointEvents.filter(ev => {
      const evTime = new Date(ev.timestamp).getTime();
      return Math.abs(evTime - eventTime) <= windowMs;
    });
  }, [securityEvent, endpointEvents]);

  if (!endpoint) {
    return (
      <div className="text-xs text-stone-500 py-2">No endpoint data available</div>
    );
  }

  const vulnCount = endpoint.vulnerabilities?.length || 0;
  const alertCount = endpoint.file_integrity_alerts?.filter(a => !a.acknowledged)?.length || 0;
  const suspiciousCount = endpoint.suspicious_processes?.length || 0;

  return (
    <div className="space-y-3">
      {/* Endpoint Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-blue-500" />
          <span className="font-medium text-sm">{endpoint.hostname}</span>
          <Badge className={`${STATUS_BADGE[endpoint.status]} text-[9px]`}>{endpoint.status}</Badge>
          <Badge className={`${POSTURE_BADGE[endpoint.security_posture]} text-[9px]`}>
            {endpoint.security_posture?.replace('_', ' ')}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-stone-500">
          {endpoint.os && <span>{endpoint.os}</span>}
          {endpoint.last_seen && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(endpoint.last_seen), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="flex flex-wrap gap-2">
        {endpoint.risk_score !== null && endpoint.risk_score !== undefined && (
          <div className={`px-2 py-1 rounded text-xs ${
            endpoint.risk_score >= 70 ? 'bg-red-100 text-red-700' :
            endpoint.risk_score >= 40 ? 'bg-amber-100 text-amber-700' :
            'bg-emerald-100 text-emerald-700'
          }`}>
            Risk Score: {endpoint.risk_score}
          </div>
        )}
        {endpoint.compliance_score !== null && endpoint.compliance_score !== undefined && (
          <div className={`px-2 py-1 rounded text-xs ${
            endpoint.compliance_score >= 80 ? 'bg-emerald-100 text-emerald-700' :
            endpoint.compliance_score >= 50 ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            Compliance: {endpoint.compliance_score}%
          </div>
        )}
        {vulnCount > 0 && (
          <div className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-700">
            <Bug className="w-3 h-3 inline mr-1" />{vulnCount} Vulnerabilities
          </div>
        )}
        {alertCount > 0 && (
          <div className="px-2 py-1 rounded text-xs bg-amber-100 text-amber-700">
            <FileWarning className="w-3 h-3 inline mr-1" />{alertCount} FIM Alerts
          </div>
        )}
        {suspiciousCount > 0 && (
          <div className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">
            <AlertTriangle className="w-3 h-3 inline mr-1" />{suspiciousCount} Suspicious Processes
          </div>
        )}
      </div>

      {/* Correlated Events Alert */}
      {correlatedEvents.length > 0 && (
        <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center gap-1.5 text-xs text-purple-800 font-medium">
            <Activity className="w-3.5 h-3.5" />
            {correlatedEvents.length} endpoint event{correlatedEvents.length > 1 ? 's' : ''} within 5 min of security event
          </div>
          <div className="mt-1 space-y-0.5">
            {correlatedEvents.slice(0, 3).map((ev, i) => (
              <div key={i} className="text-[10px] text-purple-700">
                • {ev.type?.replace('_', ' ')} - {ev.process_name || ev.file_path || ev.description || 'N/A'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-7 sm:h-8">
          <TabsTrigger value="overview" className="text-[9px] sm:text-[10px] px-1">Overview</TabsTrigger>
          <TabsTrigger value="processes" className="text-[9px] sm:text-[10px] px-1">Processes</TabsTrigger>
          <TabsTrigger value="fim" className="text-[9px] sm:text-[10px] px-1">FIM</TabsTrigger>
          <TabsTrigger value="vulns" className="text-[9px] sm:text-[10px] px-1">Vulns</TabsTrigger>
          <TabsTrigger value="events" className="text-[9px] sm:text-[10px] px-1">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-2 space-y-3">
          <SecurityStatus endpoint={endpoint} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
            <div className="p-2 bg-stone-50 rounded">
              <div className="text-stone-500">Device ID</div>
              <div className="font-mono truncate">{endpoint.device_id}</div>
            </div>
            <div className="p-2 bg-stone-50 rounded">
              <div className="text-stone-500">Owner</div>
              <div className="truncate">{endpoint.owner_email || '-'}</div>
            </div>
            <div className="p-2 bg-stone-50 rounded">
              <div className="text-stone-500">Last IP</div>
              <div className="font-mono">{endpoint.last_ip || '-'}</div>
            </div>
            <div className="p-2 bg-stone-50 rounded">
              <div className="text-stone-500">Agent Ver</div>
              <div>{endpoint.agent_version || '-'}</div>
            </div>
          </div>
          {endpoint.network_connections?.length > 0 && (
            <div>
              <h5 className="text-xs font-medium mb-1">Active Connections ({endpoint.network_connections.length})</h5>
              <NetworkConnections connections={endpoint.network_connections} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="processes" className="mt-2">
          <SuspiciousProcesses processes={endpoint.suspicious_processes} />
        </TabsContent>

        <TabsContent value="fim" className="mt-2">
          <FileIntegrityAlerts alerts={endpoint.file_integrity_alerts} />
        </TabsContent>

        <TabsContent value="vulns" className="mt-2">
          <VulnerabilitiesPanel vulnerabilities={endpoint.vulnerabilities} />
        </TabsContent>

        <TabsContent value="events" className="mt-2">
          <RecentEndpointEvents events={endpointEvents} isLoading={eventsLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default memo(EndpointIntelligence);