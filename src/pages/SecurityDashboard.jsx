import React, { useState, useMemo, useCallback, memo, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Shield, RefreshCw, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Critical path components - loaded immediately (already memoized)
import SecurityStatsCards from '@/components/security/SecurityStatsCards';
import SecurityFilters from '@/components/security/SecurityFilters';
import SecurityEventRow from '@/components/security/SecurityEventRow';
import ExportDropdown from '@/components/security/ExportDropdown';

// Lazy load ALL heavy/non-critical components for mobile performance
const SecurityCharts = lazy(() => import('@/components/security/SecurityCharts'));
const BlockedIPsTable = lazy(() => import('@/components/security/BlockedIPsTable'));
const AISecurityInsights = lazy(() => import('@/components/security/AISecurityInsights'));
const AlertConfigPanel = lazy(() => import('@/components/security/AlertConfigPanel'));
const EventDetailDialog = lazy(() => import('@/components/security/EventDetailDialog'));
const BlockIPDialog = lazy(() => import('@/components/security/BlockIPDialog'));
const AutoResponseManager = lazy(() => import('@/components/security/AutoResponseManager'));
const IncidentTriageManager = lazy(() => import('@/components/security/IncidentTriageManager'));
const ThreatIntelPanel = lazy(() => import('@/components/security/ThreatIntelPanel'));
const ThreatHuntingDashboard = lazy(() => import('@/components/security/ThreatHuntingDashboard'));
const SIEMCorrelationEngine = lazy(() => import('@/components/security/SIEMCorrelationEngine'));
const IOCSweepPanel = lazy(() => import('@/components/security/IOCSweepPanel'));
const InvestigationPlaybooks = lazy(() => import('@/components/security/InvestigationPlaybooks'));

// Minimal skeleton loader
const CardSkeleton = memo(() => (
  <Card>
    <CardContent className="py-6 flex justify-center">
      <div className="w-5 h-5 border-2 border-stone-300 border-t-transparent rounded-full animate-spin" />
    </CardContent>
  </Card>
));

// Collapsible section wrapper for mobile - prevents unnecessary renders
const CollapsibleSection = memo(function CollapsibleSection({ title, isOpen, onToggle, children }) {
  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="h-8 text-xs gap-1.5 mb-2 touch-manipulation active:bg-stone-200"
      >
        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {title}
      </Button>
      {isOpen && (
        <Suspense fallback={<CardSkeleton />}>
          {children}
        </Suspense>
      )}
    </div>
  );
});

function SecurityDashboard() {
  const qc = useQueryClient();
  
  // Filter state
  const [severity, setSeverity] = useState('all');
  const [type, setType] = useState('all');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  
  // UI state - all collapsed by default for mobile performance
  const [details, setDetails] = useState(null);
  const [blockIp, setBlockIp] = useState({ open: false, ip: '' });
  const [blockedView, setBlockedView] = useState('active');
  const [showCharts, setShowCharts] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showBlockedIPs, setShowBlockedIPs] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [showPlaybooks, setShowPlaybooks] = useState(false);
  const [showSIEM, setShowSIEM] = useState(false);
  const [showIOC, setShowIOC] = useState(false);
  const [showThreatHunting, setShowThreatHunting] = useState(false);
  const [showThreatIntel, setShowThreatIntel] = useState(false);
  const [showIncidentTriage, setShowIncidentTriage] = useState(false);
  const [showAutoResponse, setShowAutoResponse] = useState(false);

  // Auth check - high priority
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me().catch(() => null),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  });

  // Security events - primary data, fetch limited initially
  const { data: events = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['sec-events'],
    queryFn: () => base44.entities.SecurityEvent.list('-created_date', 500), // Reduced from 1000
    staleTime: 3 * 60_000, // Increased from 1 min to 3 min
    gcTime: 15 * 60_000,
    retry: 1, // Reduced retries
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Blocked IPs (active) - only fetch when section is expanded
  const { data: blocked = [] } = useQuery({
    queryKey: ['blocked-ips'],
    queryFn: () => base44.entities.BlockedIP.filter({ active: true }, '-created_date', 200),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    enabled: showBlockedIPs, // Only fetch when visible
  });

  // All blocked IPs - only fetch when needed
  const { data: blockedAll = [], isLoading: blockedLoading } = useQuery({
    queryKey: ['blocked-all'],
    queryFn: () => base44.entities.BlockedIP.list('-created_date', 200),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    enabled: showBlockedIPs && blockedView !== 'active', // Only fetch for non-active views
  });

  // Extract unique event types
  const types = useMemo(() => {
    const t = new Set(['all']);
    events.forEach(e => e.event_type && t.add(e.event_type));
    return Array.from(t).sort((a, b) => a === 'all' ? -1 : b === 'all' ? 1 : a.localeCompare(b));
  }, [events]);

  // Filter events
  const filtered = useMemo(() => {
    let arr = Array.isArray(events) ? [...events] : [];
    if (severity !== 'all') arr = arr.filter(e => e.severity === severity);
    if (type !== 'all') arr = arr.filter(e => e.event_type === type);
    if (start) {
      const s = new Date(start); s.setHours(0, 0, 0, 0);
      arr = arr.filter(e => new Date(e.created_date).getTime() >= s.getTime());
    }
    if (end) {
      const en = new Date(end); en.setHours(23, 59, 59, 999);
      arr = arr.filter(e => new Date(e.created_date).getTime() <= en.getTime());
    }
    return arr;
  }, [events, severity, type, start, end]);

  // Blocked IPs set for quick lookup
  const blockedSet = useMemo(() => {
    const now = Date.now();
    const set = new Set();
    blocked.forEach(b => {
      if (b.active && new Date(b.blocked_until).getTime() > now) set.add(b.ip_address);
    });
    return set;
  }, [blocked]);

  // Filter blocked IPs by view
  const filteredBlocked = useMemo(() => {
    const now = Date.now();
    return blockedAll.filter(rec => {
      const isActive = rec.active && new Date(rec.blocked_until).getTime() > now;
      if (blockedView === 'active') return isActive;
      if (blockedView === 'inactive') return !isActive;
      return true;
    });
  }, [blockedAll, blockedView]);

  // Collect IPs for threat intel - only top IPs to reduce API load
  const indicators = useMemo(() => {
    // Only collect IPs if we have a detail view open or explicitly need intel
    if (!details && !showBlockedIPs) return [];
    const s = new Set();
    // Prioritize IP from current detail view
    if (details?.ip_address) s.add(details.ip_address);
    // Add top IPs from filtered events (limit to 20)
    const ipCounts = {};
    filtered.forEach(e => {
      if (e.ip_address) ipCounts[e.ip_address] = (ipCounts[e.ip_address] || 0) + 1;
    });
    Object.entries(ipCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .forEach(([ip]) => s.add(ip));
    return Array.from(s);
  }, [filtered, details, showBlockedIPs]);

  // Threat intel lookup - deep lookup for richer data
  const { data: intel = { results: {} } } = useQuery({
    queryKey: ['threat-intel-deep', indicators.slice(0, 10).join(',')],
    queryFn: async () => {
      if (indicators.length === 0) return { results: {} };
      const res = await base44.functions.invoke('threatIntelLookup', { 
        indicators: indicators.slice(0, 20),
        deep_lookup: true // Enable rich threat intel with mitigations and MITRE mapping
      });
      return res?.data || { results: {} };
    },
    enabled: indicators.length > 0 && (!!details || showBlockedIPs),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 0,
  });

  const intelMap = intel?.results || {};

  // Handlers
  const openBlockIp = useCallback((ip) => {
    setBlockIp({ open: true, ip });
  }, []);

  const closeBlockIp = useCallback((open) => {
    if (!open) setBlockIp({ open: false, ip: '' });
  }, []);

  const unblockIp = useCallback(async (rec) => {
    try {
      await base44.entities.BlockedIP.update(rec.id, { active: false });
      toast.success(`Unblocked ${rec.ip_address}`);
      qc.invalidateQueries({ queryKey: ['blocked-ips'] });
      qc.invalidateQueries({ queryKey: ['blocked-all'] });
    } catch {
      toast.error('Unblock failed');
    }
  }, [qc]);

  const openDetails = useCallback((event) => setDetails(event), []);
  const closeDetails = useCallback((open) => !open && setDetails(null), []);
  
  // Toggle handlers - memoized for performance
  const toggleCharts = useCallback(() => setShowCharts(p => !p), []);
  const toggleConfig = useCallback(() => setShowConfig(p => !p), []);
  const toggleBlockedIPs = useCallback(() => setShowBlockedIPs(p => !p), []);
  const toggleAIInsights = useCallback(() => setShowAIInsights(p => !p), []);
  const togglePlaybooks = useCallback(() => setShowPlaybooks(p => !p), []);
  const toggleSIEM = useCallback(() => setShowSIEM(p => !p), []);
  const toggleIOC = useCallback(() => setShowIOC(p => !p), []);
  const toggleThreatHunting = useCallback(() => setShowThreatHunting(p => !p), []);
  const toggleThreatIntel = useCallback(() => setShowThreatIntel(p => !p), []);
  const toggleIncidentTriage = useCallback(() => setShowIncidentTriage(p => !p), []);
  const toggleAutoResponse = useCallback(() => setShowAutoResponse(p => !p), []);

  // Loading state
  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    );
  }

  // Auth check
  if (!user) {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <Card>
          <CardHeader><CardTitle className="text-base sm:text-lg">Sign in required</CardTitle></CardHeader>
          <CardContent className="text-sm">Please log in to access the Security Dashboard.</CardContent>
        </Card>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <Card>
          <CardHeader><CardTitle className="text-base sm:text-lg">Not authorized</CardTitle></CardHeader>
          <CardContent className="text-sm">Only administrators can access the Security Dashboard.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-4 lg:p-6 bg-stone-100">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-serif font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600" />
            Security Dashboard
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => refetch()} 
              disabled={isFetching} 
              className="h-8 w-8"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            <Link to={createPageUrl('Admin')}>
              <Button variant="outline" className="h-8 sm:h-9 text-xs sm:text-sm">Admin</Button>
            </Link>
          </div>
        </div>

        {/* Error State */}
        {isError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-4 flex items-center justify-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm text-red-700">Failed to load security events</span>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <SecurityStatsCards events={events} />

        {/* Filters */}
        <SecurityFilters
          severity={severity}
          setSeverity={setSeverity}
          type={type}
          setType={setType}
          start={start}
          setStart={setStart}
          end={end}
          setEnd={setEnd}
          types={types}
        />

        {/* All sections collapsed by default for mobile - expand on demand */}
        <div className="space-y-2">
          {/* Charts */}
          <CollapsibleSection title={showCharts ? 'Hide Charts' : 'Show Charts'} isOpen={showCharts} onToggle={toggleCharts}>
            <SecurityCharts events={filtered} />
          </CollapsibleSection>

          {/* AI Insights */}
          <CollapsibleSection title={showAIInsights ? 'Hide AI Insights' : 'AI Security Insights'} isOpen={showAIInsights} onToggle={toggleAIInsights}>
            <AISecurityInsights events={filtered} />
          </CollapsibleSection>

          {/* Investigation Playbooks */}
          <CollapsibleSection title={showPlaybooks ? 'Hide Playbooks' : 'Investigation Playbooks'} isOpen={showPlaybooks} onToggle={togglePlaybooks}>
            <InvestigationPlaybooks />
          </CollapsibleSection>

          {/* SIEM Correlation */}
          <CollapsibleSection title={showSIEM ? 'Hide SIEM' : 'SIEM Correlation Engine'} isOpen={showSIEM} onToggle={toggleSIEM}>
            <SIEMCorrelationEngine />
          </CollapsibleSection>

          {/* IOC Sweep */}
          <CollapsibleSection title={showIOC ? 'Hide IOC Sweep' : 'IOC Sweep Panel'} isOpen={showIOC} onToggle={toggleIOC}>
            <IOCSweepPanel />
          </CollapsibleSection>

          {/* Threat Hunting */}
          <CollapsibleSection title={showThreatHunting ? 'Hide Threat Hunting' : 'Threat Hunting'} isOpen={showThreatHunting} onToggle={toggleThreatHunting}>
            <ThreatHuntingDashboard />
          </CollapsibleSection>

          {/* Threat Intel */}
          <CollapsibleSection title={showThreatIntel ? 'Hide Threat Intel' : 'Threat Intelligence'} isOpen={showThreatIntel} onToggle={toggleThreatIntel}>
            <ThreatIntelPanel initialIndicators={indicators.slice(0, 10)} onBlockIp={openBlockIp} />
          </CollapsibleSection>

          {/* Incident Triage */}
          <CollapsibleSection title={showIncidentTriage ? 'Hide Triage' : 'Incident Triage'} isOpen={showIncidentTriage} onToggle={toggleIncidentTriage}>
            <IncidentTriageManager events={filtered} />
          </CollapsibleSection>

          {/* Auto-Response */}
          <CollapsibleSection title={showAutoResponse ? 'Hide Auto-Response' : 'Auto-Response Rules'} isOpen={showAutoResponse} onToggle={toggleAutoResponse}>
            <AutoResponseManager />
          </CollapsibleSection>

          {/* Alert Config */}
          <CollapsibleSection title={showConfig ? 'Hide Alert Config' : 'Alert Configuration'} isOpen={showConfig} onToggle={toggleConfig}>
            <AlertConfigPanel />
          </CollapsibleSection>
        </div>

        {/* Blocked IPs - Collapsible */}
        <Card>
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <Button
                variant="ghost"
                className="p-0 h-auto text-sm sm:text-base font-semibold justify-start gap-1.5 touch-manipulation"
                onClick={toggleBlockedIPs}
              >
                {showBlockedIPs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Blocked IPs {showBlockedIPs && `(${filteredBlocked.length})`}
              </Button>
              {showBlockedIPs && (
                <Select value={blockedView} onValueChange={setBlockedView}>
                  <SelectTrigger className="w-24 sm:w-28 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          {showBlockedIPs && (
            <CardContent className="px-2 sm:px-6">
              <Suspense fallback={<div className="py-4 flex justify-center"><div className="w-5 h-5 border-2 border-stone-300 border-t-transparent rounded-full animate-spin" /></div>}>
                <BlockedIPsTable
                  records={filteredBlocked}
                  intelMap={intelMap}
                  isLoading={blockedLoading}
                  onUnblock={unblockIp}
                />
              </Suspense>
            </CardContent>
          )}
        </Card>

        {/* Events Table - optimized for mobile */}
        <Card>
          <CardHeader className="pb-2 px-2 sm:px-6">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm sm:text-base">
                Events ({filtered.length})
              </CardTitle>
              <ExportDropdown events={filtered} />
            </div>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-stone-500 text-sm">
                <div className="w-4 h-4 mr-2 border-2 border-stone-300 border-t-transparent rounded-full animate-spin" /> Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-stone-500 text-xs sm:text-sm">
                No events match filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm min-w-[500px]">
                  <thead className="bg-stone-50 sticky top-0">
                    <tr>
                      <th className="p-1.5 text-left text-[10px] sm:text-xs font-medium">When</th>
                      <th className="p-1.5 text-left text-[10px] sm:text-xs font-medium">Sev</th>
                      <th className="p-1.5 text-left text-[10px] sm:text-xs font-medium hidden sm:table-cell">Type</th>
                      <th className="p-1.5 text-left text-[10px] sm:text-xs font-medium">Message</th>
                      <th className="p-1.5 text-left text-[10px] sm:text-xs font-medium">IP</th>
                      <th className="p-1.5 text-left text-[10px] sm:text-xs font-medium">Act</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.slice(0, 50).map(e => (
                      <SecurityEventRow
                        key={e.id}
                        event={e}
                        isBlocked={blockedSet.has(e.ip_address)}
                        intelMatch={intelMap[e.ip_address]?.matched}
                        onView={openDetails}
                        onBlockIp={openBlockIp}
                      />
                    ))}
                  </tbody>
                </table>
                {filtered.length > 50 && (
                  <p className="text-center py-2 text-[10px] sm:text-xs text-stone-500">
                    Showing 50 of {filtered.length}. Filter to see more.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialogs - Lazy loaded */}
        {details && (
          <Suspense fallback={null}>
            <EventDetailDialog
              event={details}
              open={!!details}
              onOpenChange={closeDetails}
              blockedSet={blockedSet}
              intelMap={intelMap}
              onBlockIp={openBlockIp}
            />
          </Suspense>
        )}

        {blockIp.open && (
          <Suspense fallback={null}>
            <BlockIPDialog
              ip={blockIp.ip}
              open={blockIp.open}
              onOpenChange={closeBlockIp}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}

export default SecurityDashboard;