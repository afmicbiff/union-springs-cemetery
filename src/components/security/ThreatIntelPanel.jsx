import React, { memo, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Loader2, Search, AlertTriangle, Shield, ExternalLink, Target,
  Bug, Globe, Clock, ChevronDown, ChevronUp, RefreshCw, Zap
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const RISK_COLORS = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  low: 'bg-emerald-100 text-emerald-800 border-emerald-200'
};

const PRIORITY_COLORS = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-amber-500 text-white',
  low: 'bg-slate-400 text-white'
};

// Mitigation Item
const MitigationItem = memo(function MitigationItem({ mitigation }) {
  return (
    <div className="flex gap-2 p-2 bg-white rounded border">
      <Badge className={`${PRIORITY_COLORS[mitigation.priority]} text-[9px] shrink-0`}>
        {mitigation.priority}
      </Badge>
      <div className="min-w-0">
        <p className="text-xs font-medium">{mitigation.action}</p>
        <p className="text-[10px] text-stone-600">{mitigation.detail}</p>
      </div>
    </div>
  );
});

// MITRE Technique Badge
const MitreBadge = memo(function MitreBadge({ technique }) {
  return (
    <a
      href={`https://attack.mitre.org/techniques/${technique.id.replace('.', '/')}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] hover:bg-purple-100 transition-colors"
    >
      {technique.id}
      <ExternalLink className="w-2.5 h-2.5" />
    </a>
  );
});

// Threat Intel Result Card
const ThreatIntelResult = memo(function ThreatIntelResult({ indicator, intel, onBlock }) {
  const [expanded, setExpanded] = useState(false);

  if (!intel?.matched) {
    return (
      <div className="p-3 border rounded-lg bg-emerald-50 border-emerald-200">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span className="font-mono text-sm">{indicator}</span>
          <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Clean</Badge>
        </div>
        <p className="text-xs text-emerald-700 mt-1">No threats found in queried databases</p>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg ${RISK_COLORS[intel.risk_level]}`}>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <AlertTriangle className={`w-4 h-4 ${intel.risk_level === 'critical' ? 'text-red-600' : 'text-orange-600'}`} />
              <span className="font-mono text-sm font-medium">{indicator}</span>
              <Badge className={`${RISK_COLORS[intel.risk_level]} text-[10px]`}>
                Risk: {intel.risk_score}/100
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {intel.families?.slice(0, 5).map((f, i) => (
                <Badge key={i} className="bg-red-200 text-red-800 text-[9px]">{f}</Badge>
              ))}
              {intel.sources?.map((s, i) => (
                <Badge key={i} variant="outline" className="text-[9px]">{s}</Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <Button size="sm" onClick={() => onBlock?.(indicator)} className="h-6 text-[10px]">
              <Shield className="w-3 h-3 mr-1" /> Block
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)} className="h-6 text-[10px]">
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-stone-600">
          {intel.first_seen && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> First: {format(new Date(intel.first_seen), 'MMM d, yyyy')}
            </span>
          )}
          {intel.abuseipdb?.total_reports && (
            <span>{intel.abuseipdb.total_reports} abuse reports</span>
          )}
          {intel.abuseipdb?.country && (
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3" /> {intel.abuseipdb.country}
            </span>
          )}
          {intel.abuseipdb?.is_tor && (
            <Badge className="bg-purple-100 text-purple-700 text-[9px]">Tor Exit</Badge>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t p-3 space-y-3 bg-white/50">
          {/* Threat Types */}
          {intel.threat_types?.length > 0 && (
            <div>
              <h5 className="text-[10px] font-medium text-stone-500 mb-1">Threat Types</h5>
              <div className="flex flex-wrap gap-1">
                {intel.threat_types.map((t, i) => (
                  <Badge key={i} className="bg-orange-100 text-orange-700 text-[9px]">{t}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* MITRE ATT&CK */}
          {intel.mitre_techniques?.length > 0 && (
            <div>
              <h5 className="text-[10px] font-medium text-stone-500 mb-1">MITRE ATT&CK Techniques</h5>
              <div className="flex flex-wrap gap-1">
                {intel.mitre_techniques.map((t, i) => (
                  <MitreBadge key={i} technique={t} />
                ))}
              </div>
            </div>
          )}

          {/* Mitigations */}
          {intel.mitigations?.length > 0 && (
            <div>
              <h5 className="text-[10px] font-medium text-stone-500 mb-1">Recommended Mitigations</h5>
              <div className="space-y-1.5">
                {intel.mitigations.map((m, i) => (
                  <MitigationItem key={i} mitigation={m} />
                ))}
              </div>
            </div>
          )}

          {/* Samples */}
          {intel.samples?.length > 0 && (
            <div>
              <h5 className="text-[10px] font-medium text-stone-500 mb-1">IOC Samples</h5>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {intel.samples.map((s, i) => (
                  <div key={i} className="text-[10px] p-1.5 bg-stone-100 rounded flex items-center justify-between gap-2">
                    <span className="font-mono truncate">{s.malware || 'Unknown'}</span>
                    <span className="text-stone-500">{s.threat_type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AbuseIPDB Details */}
          {intel.abuseipdb && (
            <div>
              <h5 className="text-[10px] font-medium text-stone-500 mb-1">AbuseIPDB Intelligence</h5>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div><span className="text-stone-500">ISP:</span> {intel.abuseipdb.isp || '-'}</div>
                <div><span className="text-stone-500">Domain:</span> {intel.abuseipdb.domain || '-'}</div>
                <div><span className="text-stone-500">Usage:</span> {intel.abuseipdb.usage_type || '-'}</div>
                <div><span className="text-stone-500">Confidence:</span> {intel.abuseipdb.abuse_score}%</div>
              </div>
            </div>
          )}

          {/* URLhaus */}
          {intel.urlhaus && (
            <div>
              <h5 className="text-[10px] font-medium text-stone-500 mb-1">URLhaus Data</h5>
              <div className="text-[10px]">
                <span>{intel.urlhaus.url_count} malicious URLs hosted</span>
                {intel.urlhaus.threats?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {intel.urlhaus.threats.map((t, i) => (
                      <Badge key={i} variant="outline" className="text-[9px]">{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Compact Threat Badge for inline display
export const ThreatIntelBadge = memo(function ThreatIntelBadge({ intel, onClick }) {
  if (!intel?.matched) return null;

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${RISK_COLORS[intel.risk_level]} hover:opacity-80 transition-opacity`}
    >
      <AlertTriangle className="w-2.5 h-2.5" />
      {intel.risk_level} ({intel.risk_score})
      {intel.families?.[0] && <span className="hidden sm:inline">• {intel.families[0]}</span>}
    </button>
  );
});

// Main Panel Component
function ThreatIntelPanel({ initialIndicators = [], onBlockIp }) {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [indicators, setIndicators] = useState(initialIndicators);
  const [isSearching, setIsSearching] = useState(false);

  // Query threat intel
  const { data: intelData, isLoading, refetch } = useQuery({
    queryKey: ['threat-intel-deep', indicators],
    queryFn: async () => {
      if (indicators.length === 0) return {};
      const res = await base44.functions.invoke('threatIntelLookup', { 
        indicators, 
        deep_lookup: true 
      });
      return res?.data?.results || {};
    },
    enabled: indicators.length > 0,
    staleTime: 5 * 60_000,
  });

  const handleSearch = useCallback(async () => {
    const newIndicators = searchInput
      .split(/[\s,;]+/)
      .map(s => s.trim())
      .filter(Boolean);
    
    if (newIndicators.length === 0) {
      toast.error('Enter IP addresses or domains to lookup');
      return;
    }

    setIsSearching(true);
    setIndicators(prev => [...new Set([...newIndicators, ...prev])].slice(0, 20));
    setSearchInput('');
    
    setTimeout(() => setIsSearching(false), 500);
  }, [searchInput]);

  const handleBlock = useCallback((ip) => {
    if (onBlockIp) onBlockIp(ip);
  }, [onBlockIp]);

  const matchedCount = Object.values(intelData || {}).filter(i => i?.matched).length;

  return (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Bug className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
            Threat Intelligence
            {matchedCount > 0 && (
              <Badge className="bg-red-100 text-red-700 text-[10px]">{matchedCount} threats</Badge>
            )}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isLoading} className="h-7 text-xs gap-1">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 space-y-3">
        {/* Search */}
        <div className="flex gap-2">
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Enter IPs or domains (comma/space separated)"
            className="h-8 text-sm"
          />
          <Button onClick={handleSearch} disabled={isSearching} className="h-8 text-xs gap-1 shrink-0">
            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            Lookup
          </Button>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-stone-500 text-sm">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Querying threat databases…
          </div>
        ) : indicators.length === 0 ? (
          <div className="text-center py-6 text-stone-500 text-sm">
            Enter IP addresses or domains to check against threat intelligence sources
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {Object.entries(intelData || {}).map(([indicator, intel]) => (
              <ThreatIntelResult
                key={indicator}
                indicator={indicator}
                intel={intel}
                onBlock={handleBlock}
              />
            ))}
          </div>
        )}

        {/* Sources info */}
        <div className="text-[10px] text-stone-400 pt-2 border-t">
          Sources: ThreatFox, AbuseIPDB, URLhaus • Deep lookup includes MITRE mapping and mitigations
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(ThreatIntelPanel);