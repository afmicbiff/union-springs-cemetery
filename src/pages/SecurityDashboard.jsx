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

// Critical path components - loaded immediately
import SecurityStatsCards from '@/components/security/SecurityStatsCards';
import SecurityFilters from '@/components/security/SecurityFilters';
import SecurityEventRow from '@/components/security/SecurityEventRow';
import ExportDropdown from '@/components/security/ExportDropdown';

// Lazy load heavy/non-critical components
const SecurityCharts = lazy(() => import('@/components/security/SecurityCharts'));
const BlockedIPsTable = lazy(() => import('@/components/security/BlockedIPsTable'));
const AISecurityInsights = lazy(() => import('@/components/security/AISecurityInsights'));
const AlertConfigPanel = lazy(() => import('@/components/security/AlertConfigPanel'));
const EventDetailDialog = lazy(() => import('@/components/security/EventDetailDialog'));
const BlockIPDialog = lazy(() => import('@/components/security/BlockIPDialog'));

// Skeleton loader for lazy components
const CardSkeleton = () => (
  <Card>
    <CardContent className="py-8 flex justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
    </CardContent>
  </Card>
);

function SecurityDashboard() {
  const qc = useQueryClient();
  
  // Filter state
  const [severity, setSeverity] = useState('all');
  const [type, setType] = useState('all');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  
  // UI state
  const [details, setDetails] = useState(null);
  const [blockIp, setBlockIp] = useState({ open: false, ip: '' });
  const [blockedView, setBlockedView] = useState('active');
  const [showCharts, setShowCharts] = useState(false); // Default collapsed for faster initial load
  const [showConfig, setShowConfig] = useState(false);
  const [showBlockedIPs, setShowBlockedIPs] = useState(false); // Lazy load blocked IPs section

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

  // Threat intel lookup - only when needed and with debounce
  const { data: intel = { results: {} } } = useQuery({
    queryKey: ['threat-intel', indicators.slice(0, 10).join(',')], // Further limit query key
    queryFn: async () => {
      if (indicators.length === 0) return { results: {} };
      const res = await base44.functions.invoke('threatIntelLookup', { indicators: indicators.slice(0, 30) });
      return res?.data || { results: {} };
    },
    enabled: indicators.length > 0 && (!!details || showBlockedIPs), // Only when viewing details or blocked IPs
    staleTime: 10 * 60_000, // Cache for 10 mins
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 0, // Don't retry on failure
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

        {/* Charts Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCharts(!showCharts)}
          className="h-7 text-xs gap-1"
        >
          {showCharts ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {showCharts ? 'Hide Charts' : 'Show Charts'}
        </Button>

        {/* Charts - Lazy loaded */}
        {showCharts && (
          <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-3 gap-3"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>}>
            <SecurityCharts events={filtered} />
          </Suspense>
        )}

        {/* AI Insights - Lazy loaded */}
        <Suspense fallback={<CardSkeleton />}>
          <AISecurityInsights events={filtered} />
        </Suspense>

        {/* Alert Configuration (collapsible) */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowConfig(!showConfig)}
          className="h-7 text-xs gap-1"
        >
          {showConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {showConfig ? 'Hide Alert Configuration' : 'Show Alert Configuration'}
        </Button>
        {showConfig && (
          <Suspense fallback={<CardSkeleton />}>
            <AlertConfigPanel />
          </Suspense>
        )}

        {/* Blocked IPs - Collapsible to reduce initial load */}
        <Card>
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <Button
                variant="ghost"
                className="p-0 h-auto text-sm sm:text-base lg:text-lg font-semibold justify-start gap-1"
                onClick={() => setShowBlockedIPs(!showBlockedIPs)}
              >
                {showBlockedIPs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Blocked IPs {showBlockedIPs && `(${filteredBlocked.length})`}
              </Button>
              {showBlockedIPs && (
                <Select value={blockedView} onValueChange={setBlockedView}>
                  <SelectTrigger className="w-28 sm:w-32 h-7 sm:h-8 text-xs sm:text-sm">
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
            <CardContent className="px-3 sm:px-6">
              <Suspense fallback={<div className="py-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>}>
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

        {/* Events Table */}
        <Card>
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-sm sm:text-base lg:text-lg">
                Events ({filtered.length})
              </CardTitle>
              <ExportDropdown events={filtered} />
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 sm:py-12 text-stone-500 text-sm">
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" /> Loading events…
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-stone-500 text-sm">
                No security events match your filters.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="p-1.5 sm:p-2 text-left text-[10px] sm:text-xs font-medium">When</th>
                      <th className="p-1.5 sm:p-2 text-left text-[10px] sm:text-xs font-medium">Severity</th>
                      <th className="p-1.5 sm:p-2 text-left text-[10px] sm:text-xs font-medium">Type</th>
                      <th className="p-1.5 sm:p-2 text-left text-[10px] sm:text-xs font-medium">Message</th>
                      <th className="p-1.5 sm:p-2 text-left text-[10px] sm:text-xs font-medium">IP</th>
                      <th className="p-1.5 sm:p-2 text-left text-[10px] sm:text-xs font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.slice(0, 100).map(e => (
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
                {filtered.length > 100 && (
                  <p className="text-center py-3 text-xs text-stone-500">
                    Showing first 100 of {filtered.length} events. Use filters to narrow results.
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