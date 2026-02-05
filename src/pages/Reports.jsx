import React, { memo, useMemo, useState, useCallback, lazy, Suspense } from "react";
import { useGovernedQuery } from "@/components/gov/hooks";
import { filterEntity } from "@/components/gov/dataClient";
import { format, parseISO, isValid, startOfMonth } from "date-fns";
import { Loader2, BarChart2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Lazy load heavy chart components
const ReportParams = lazy(() => import("@/components/reports/ReportParams"));
const ReportCharts = lazy(() => import("@/components/reports/ReportCharts"));
const AIInsights = lazy(() => import("@/components/reports/AIInsights"));

// Loading fallback
const ChartSkeleton = memo(() => (
  <div className="bg-white border rounded-lg p-3 animate-pulse">
    <div className="h-64 sm:h-80 bg-stone-100 rounded" />
  </div>
));

// Memoized utility functions
const monthKey = (d) => {
  if (!d) return null;
  try {
    const dt = typeof d === 'string' ? parseISO(d) : d;
    return isValid(dt) ? format(startOfMonth(dt), 'yyyy-MM') : null;
  } catch { return null; }
};

const lastNMonths = (n = 12) => {
  const now = new Date();
  const arr = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    arr.push({ key: format(d, 'yyyy-MM'), label: format(d, 'MMM yyyy') });
  }
  return arr;
};

export default memo(function ReportsPage() {
  const defaultParams = useMemo(() => {
    const to = format(new Date(), 'yyyy-MM-dd');
    const from = format(new Date(new Date().setMonth(new Date().getMonth() - 11)), 'yyyy-MM-01');
    return { type: 'sales', from, to, granularity: 'monthly', ai: true };
  }, []);

  const [params, setParams] = useState(defaultParams);
  const runReport = useCallback((p) => setParams(p), []);

  // SALES DATA
  const salesQuery = useGovernedQuery({
    key: ["report-sales", params.from, params.to, params.invoiceStatus],
    enabled: params.type === 'sales' || params.type === 'predictive',
    selectFields: ["id","amount","status","paid_date","due_date"],
    queryFn: async ({ signal }) => {
      const res = await filterEntity("Invoice", {}, { sort: "-paid_date", limit: 1000, select: ["id","amount","status","paid_date","due_date"] }, { signal });
      return res;
    },
    staleTime: 30_000,
  });

  // PLOTS DATA
  const plotsQuery = useGovernedQuery({
    key: ["report-plots", params.section || "all"],
    enabled: params.type === 'plot' || params.type === 'predictive',
    selectFields: ["id","status","section"],
    queryFn: async ({ signal }) => {
      const res = await filterEntity("Plot", {}, { sort: "-updated_date", limit: 5000, select: ["id","status","section"] }, { signal });
      return res;
    },
    staleTime: 60_000,
  });

  // DECEASED DATA
  const deceasedQuery = useGovernedQuery({
    key: ["report-deceased", params.from, params.to, params.veteranOnly ? 'v' : 'a'],
    enabled: params.type === 'deceased' || params.type === 'predictive',
    selectFields: ["id","date_of_birth","date_of_death","veteran_status","plot_location"],
    queryFn: async ({ signal }) => {
      const res = await filterEntity("Deceased", {}, { sort: "-date_of_death", limit: 2000, select: ["id","date_of_birth","date_of_death","veteran_status","plot_location"] }, { signal });
      return res;
    },
    staleTime: 60_000,
  });

  // Aggregations - memoized with stable dependencies
  const seriesMonths = useMemo(() => lastNMonths(12), []);

  const salesSeries = useMemo(() => {
    if (!salesQuery.data?.length) return [];
    const map = new Map(seriesMonths.map((m) => [m.key, { label: m.label, total: 0 }]));
    const statusFilter = params.invoiceStatus && params.invoiceStatus !== 'all' ? params.invoiceStatus : null;
    for (let i = 0; i < salesQuery.data.length; i++) {
      const inv = salesQuery.data[i];
      if (statusFilter && inv.status !== statusFilter) continue;
      const key = monthKey(inv.paid_date || inv.due_date);
      if (key && map.has(key)) {
        map.get(key).total += Number(inv.amount) || 0;
      }
    }
    return Array.from(map.values());
  }, [salesQuery.data, seriesMonths, params.invoiceStatus]);

  const plotUtil = useMemo(() => {
    if (!plotsQuery.data?.length) return [];
    const counts = {};
    const sectionFilter = params.section ? String(params.section).trim() : null;
    for (let i = 0; i < plotsQuery.data.length; i++) {
      const p = plotsQuery.data[i];
      if (sectionFilter && String(p.section || '').replace(/Section\s*/i,'').trim() !== sectionFilter) continue;
      const status = p.status || 'Unknown';
      counts[status] = (counts[status] || 0) + 1;
    }
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [plotsQuery.data, params.section]);

  const deceasedBuckets = useMemo(() => {
    if (!deceasedQuery.data?.length) return [];
    const fromDate = params.from ? new Date(params.from) : null;
    const toDate = params.to ? new Date(params.to + 'T23:59:59') : null;
    const buckets = { '<40':0, '40-59':0, '60-79':0, '80+':0 };
    const msPerYear = 365.25 * 24 * 3600 * 1000;
    
    for (let i = 0; i < deceasedQuery.data.length; i++) {
      const d = deceasedQuery.data[i];
      if (params.veteranOnly && !d.veteran_status) continue;
      
      const dod = d.date_of_death ? parseISO(d.date_of_death) : null;
      if (!dod || !isValid(dod)) continue;
      if (fromDate && dod < fromDate) continue;
      if (toDate && dod > toDate) continue;
      
      const dob = d.date_of_birth ? parseISO(d.date_of_birth) : null;
      if (!dob || !isValid(dob)) continue;
      
      const age = Math.max(0, Math.floor((dod - dob) / msPerYear));
      if (age < 40) buckets['<40']++;
      else if (age < 60) buckets['40-59']++;
      else if (age < 80) buckets['60-79']++;
      else buckets['80+']++;
    }
    return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
  }, [deceasedQuery.data, params.from, params.to, params.veteranOnly]);

  // Predictive simple baseline (naive): copy last 3 actuals
  const predicted = useMemo(() => {
    if (params.type !== 'predictive' || !salesSeries.length) return [];
    return salesSeries.slice(-3).map((t) => ({ label: t.label, value: t.total }));
  }, [params.type, salesSeries]);

  const summaryInput = useMemo(() => ({
    type: params.type,
    window: { from: params.from, to: params.to, granularity: params.granularity },
    sales: salesSeries,
    utilization: plotUtil,
    demographics: deceasedBuckets,
  }), [params.type, params.from, params.to, params.granularity, salesSeries, plotUtil, deceasedBuckets]);

  const isLoading = salesQuery.isLoading || plotsQuery.isLoading || deceasedQuery.isLoading;
  const hasError = salesQuery.error || plotsQuery.error || deceasedQuery.error;
  
  const handleRetry = useCallback(() => {
    salesQuery.refetch?.();
    plotsQuery.refetch?.();
    deceasedQuery.refetch?.();
  }, [salesQuery, plotsQuery, deceasedQuery]);

  return (
    <div className="min-h-screen bg-stone-100 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <BarChart2 className="w-5 h-5 sm:w-6 sm:h-6 text-teal-700" />
          <h1 className="text-xl sm:text-2xl font-serif">Advanced Reports</h1>
        </div>

        <Suspense fallback={<div className="bg-white border rounded-lg p-4 animate-pulse h-48" />}>
          <ReportParams initial={defaultParams} onRun={runReport} />
        </Suspense>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-stone-600 py-12">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading report data…</span>
          </div>
        ) : hasError ? (
          <div className="text-center py-8 sm:py-12 border-2 border-dashed border-red-200 rounded-lg bg-red-50">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-600 font-medium">Failed to load report data</p>
            <p className="text-xs text-red-500 mt-1">Please check your connection</p>
            <Button variant="outline" size="sm" onClick={handleRetry} className="mt-3 h-8 text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry
            </Button>
          </div>
        ) : (
          <Suspense fallback={<ChartSkeleton />}>
            {params.type === 'sales' && <ReportCharts type="sales" data={salesSeries} />}
            {params.type === 'plot' && <ReportCharts type="plot" data={plotUtil} />}
            {params.type === 'deceased' && <ReportCharts type="deceased" data={deceasedBuckets} />}
            {params.type === 'predictive' && <ReportCharts type="predictive" data={salesSeries} predicted={predicted} />}

            {params.ai && <AIInsights params={params} summaryInput={summaryInput} />}
          </Suspense>
        )}
      </div>
    </div>
  );
});