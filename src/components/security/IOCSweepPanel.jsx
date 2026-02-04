import React, { memo, useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Loader2, Search, AlertTriangle, CheckCircle, Target, ExternalLink,
  FileText, Globe, Hash, Server
} from 'lucide-react';

const IOC_TYPE_ICONS = { ip: Globe, domain: Globe, hash_md5: Hash, hash_sha1: Hash, hash_sha256: Hash, url: FileText, unknown: Target };
const IOC_TYPE_COLORS = { ip: 'bg-blue-100 text-blue-700', domain: 'bg-purple-100 text-purple-700', hash_md5: 'bg-orange-100 text-orange-700', hash_sha1: 'bg-orange-100 text-orange-700', hash_sha256: 'bg-orange-100 text-orange-700', url: 'bg-teal-100 text-teal-700', unknown: 'bg-stone-100 text-stone-600' };
const SEV_COLORS = { critical: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800', medium: 'bg-amber-100 text-amber-800', low: 'bg-emerald-100 text-emerald-800' };

// Result Card
const IOCResultCard = memo(function IOCResultCard({ finding }) {
  const [expanded, setExpanded] = useState(false);
  const evidence = finding.evidence || {};
  const Icon = IOC_TYPE_ICONS[evidence.ioc_type] || Target;

  const sourceCount = new Set((evidence.details || []).map(d => d.source)).size;
  const totalMatches = (evidence.matched_events?.length || 0) + (evidence.matched_endpoint_events?.length || 0) + (evidence.matched_endpoints?.length || 0);

  return (
    <div className={`p-3 border rounded-lg ${finding.severity === 'critical' ? 'border-red-300 bg-red-50' : 'bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Icon className="w-3.5 h-3.5 text-stone-500" />
            <code className="text-xs font-mono bg-stone-100 px-1.5 py-0.5 rounded truncate max-w-[200px]">{evidence.ioc}</code>
            <Badge className={`${IOC_TYPE_COLORS[evidence.ioc_type]} text-[9px]`}>{evidence.ioc_type}</Badge>
            <Badge className={`${SEV_COLORS[finding.severity]} text-[9px]`}>{finding.severity}</Badge>
          </div>
          <p className="text-[10px] text-stone-600 mt-1">
            {totalMatches} match(es) across {sourceCount} source(s)
          </p>
          {evidence.threat_intel && (
            <div className="flex items-center gap-1 mt-1">
              <AlertTriangle className="w-3 h-3 text-red-500" />
              <span className="text-[10px] text-red-600">Threat Intel: {evidence.threat_intel.families?.join(', ') || 'Known threat'}</span>
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="h-6 text-[10px]">
          {expanded ? 'Hide' : 'Details'}
        </Button>
      </div>

      {expanded && (
        <div className="mt-2 pt-2 border-t space-y-2 text-[10px]">
          {/* Match Details */}
          <div className="max-h-40 overflow-y-auto space-y-1">
            {(evidence.details || []).slice(0, 10).map((detail, i) => (
              <div key={i} className="p-1.5 bg-stone-50 rounded">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[8px]">{detail.source}</Badge>
                  {detail.event_type && <span className="text-stone-600">{detail.event_type}</span>}
                  {detail.severity && <Badge className={`${SEV_COLORS[detail.severity]} text-[8px]`}>{detail.severity}</Badge>}
                </div>
                {detail.matches?.slice(0, 3).map((m, j) => (
                  <div key={j} className="text-stone-500 ml-2">• {m.field}: <span className="font-mono">{m.value?.slice(0, 60)}</span></div>
                ))}
              </div>
            ))}
          </div>

          {/* MITRE */}
          {finding.mitre_techniques?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-stone-500">MITRE:</span>
              {finding.mitre_techniques.map((t, i) => (
                <a key={i} href={`https://attack.mitre.org/techniques/${String(t).replace('.', '/')}`} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline flex items-center gap-0.5">{t}<ExternalLink className="w-2 h-2" /></a>
              ))}
            </div>
          )}

          {/* Related */}
          {finding.related_ips?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-stone-500">IPs:</span>
              {finding.related_ips.slice(0, 5).map((ip, i) => <Badge key={i} variant="outline" className="text-[8px] font-mono">{ip}</Badge>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Main Component
function IOCSweepPanel() {
  const qc = useQueryClient();
  const [iocInput, setIOCInput] = useState('');
  const [timeRange, setTimeRange] = useState(72);
  const [results, setResults] = useState(null);

  const sweepMutation = useMutation({
    mutationFn: async () => {
      const iocs = iocInput.split(/[\n,;]+/).map(i => i.trim()).filter(Boolean);
      if (iocs.length === 0) throw new Error('Enter at least one IOC');
      const res = await base44.functions.invoke('iocSweep', { iocs, time_range_hours: timeRange, hunt_name: 'Manual IOC Sweep' });
      if (res?.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (data) => {
      setResults(data);
      toast.success(`Scanned ${data.iocs_scanned} IOCs, found ${data.findings_count} matches`);
      qc.invalidateQueries({ queryKey: ['hunt-findings'] });
    },
    onError: (e) => toast.error(e.message)
  });

  const handleSweep = useCallback(() => sweepMutation.mutate(), [sweepMutation]);

  const iocCount = iocInput.split(/[\n,;]+/).map(i => i.trim()).filter(Boolean).length;

  return (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <Target className="w-4 h-4 text-teal-600" />
          IOC Sweep
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 space-y-3">
        <div>
          <Label className="text-xs">Indicators of Compromise (one per line, or comma/semicolon separated)</Label>
          <Textarea
            value={iocInput}
            onChange={e => setIOCInput(e.target.value)}
            placeholder="192.168.1.100&#10;malicious-domain.com&#10;44d88612fea8a8f36de82e1278abb02f&#10;https://bad-url.com/payload"
            className="h-28 text-xs font-mono mt-1"
          />
          <p className="text-[10px] text-stone-500 mt-1">Supports: IPs, domains, MD5/SHA1/SHA256 hashes, URLs • {iocCount} IOC(s) entered</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Time Range:</Label>
            <Input type="number" value={timeRange} onChange={e => setTimeRange(parseInt(e.target.value) || 72)} className="h-7 w-20 text-xs" />
            <span className="text-xs text-stone-500">hours</span>
          </div>
          <Button onClick={handleSweep} disabled={sweepMutation.isPending || iocCount === 0} className="h-8 text-xs gap-1">
            {sweepMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            Sweep {iocCount} IOC{iocCount !== 1 ? 's' : ''}
          </Button>
        </div>

        {/* Results */}
        {results && (
          <div className="border-t pt-3">
            <div className="flex items-center gap-2 mb-2">
              {results.findings_count > 0 ? (
                <AlertTriangle className="w-4 h-4 text-orange-500" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              )}
              <span className="text-sm font-medium">
                {results.findings_count > 0 ? `${results.findings_count} IOC(s) found in data` : 'No matches found'}
              </span>
              <Badge variant="outline" className="text-[10px]">{results.iocs_scanned} scanned</Badge>
            </div>

            {results.findings?.length > 0 && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {results.findings.map((f, i) => <IOCResultCard key={i} finding={f} />)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(IOCSweepPanel);