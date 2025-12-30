import React from "react";
import { useGovernedQuery } from "@/components/gov/hooks";
import { filterEntity } from "@/components/gov/dataClient";
import { format, parseISO, isValid, startOfMonth } from "date-fns";
import { Loader2, BarChart2 } from "lucide-react";
import ReportParams from "@/components/reports/ReportParams";
import ReportCharts from "@/components/reports/ReportCharts";
import AIInsights from "@/components/reports/AIInsights";

function monthKey(d) {
  const dt = typeof d === 'string' ? parseISO(d) : d;
  if (!isValid(dt)) return null;
  return format(startOfMonth(dt), 'yyyy-MM');
}

function lastNMonths(n = 12) {
  const now = new Date();
  const arr = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    arr.push({ key: format(d, 'yyyy-MM'), label: format(d, 'MMM yyyy') });
  }
  return arr;
}

export default function ReportsPage() {
  const defaultParams = React.useMemo(() => {
    const to = format(new Date(), 'yyyy-MM-dd');
    const from = format(new Date(new Date().setMonth(new Date().getMonth() - 11)), 'yyyy-MM-01');
    return { type: 'sales', from, to, granularity: 'monthly', ai: true };
  }, []);

  const [params, setParams] = React.useState(defaultParams);
  const runReport = (p) => setParams(p);

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

  // Aggregations
  const seriesMonths = React.useMemo(() => lastNMonths(12), [params.from, params.to]);

  const salesSeries = React.useMemo(() => {
    if (!salesQuery.data) return [];
    const map = new Map(seriesMonths.map((m) => [m.key, { label: m.label, total: 0 }]));
    salesQuery.data.forEach((inv) => {
      if (params.invoiceStatus && params.invoiceStatus !== 'all' && inv.status !== params.invoiceStatus) return;
      const key = monthKey(inv.paid_date || inv.due_date);
      if (key && map.has(key)) {
        map.get(key).total += Number(inv.amount || 0);
      }
    });
    return Array.from(map.values());
  }, [salesQuery.data, seriesMonths, params.invoiceStatus]);

  const plotUtil = React.useMemo(() => {
    if (!plotsQuery.data) return [];
    const counts = {};
    plotsQuery.data.forEach((p) => {
      if (params.section && String(p.section || '').replace(/Section\s*/i,'').trim() !== String(params.section).trim()) return;
      counts[p.status || 'Unknown'] = (counts[p.status || 'Unknown'] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [plotsQuery.data, params.section]);

  const deceasedBuckets = React.useMemo(() => {
    if (!deceasedQuery.data) return [];
    const inRange = (d) => {
      if (!params.from && !params.to) return true;
      const dt = typeof d === 'string' ? parseISO(d) : d;
      if (!isValid(dt)) return false;
      const fromOk = params.from ? new Date(params.from) <= dt : true;
      const toOk = params.to ? dt <= new Date(params.to + 'T23:59:59') : true;
      return fromOk && toOk;
    };
    const buckets = { '<40':0, '40-59':0, '60-79':0, '80+':0 };
    deceasedQuery.data.forEach((d) => {
      if (params.veteranOnly && !d.veteran_status) return;
      if (!inRange(d.date_of_death)) return;
      const dob = d.date_of_birth ? parseISO(d.date_of_birth) : null;
      const dod = d.date_of_death ? parseISO(d.date_of_death) : null;
      if (!isValid(dob) || !isValid(dod)) return;
      const age = Math.max(0, Math.floor((dod - dob) / (365.25*24*3600*1000)));
      if (age < 40) buckets['<40']++; else if (age < 60) buckets['40-59']++; else if (age < 80) buckets['60-79']++; else buckets['80+']++;
    });
    return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
  }, [deceasedQuery.data, params.from, params.to, params.veteranOnly]);

  // Predictive simple baseline (naive): copy last 3 actuals
  const predicted = React.useMemo(() => {
    if (params.type !== 'predictive') return [];
    const tail = salesSeries.slice(-3);
    return tail.map((t) => ({ label: t.label, value: t.total }));
  }, [params.type, salesSeries]);

  const summaryInput = React.useMemo(() => ({
    type: params.type,
    window: { from: params.from, to: params.to, granularity: params.granularity },
    sales: salesSeries,
    utilization: plotUtil,
    demographics: deceasedBuckets,
  }), [params, salesSeries, plotUtil, deceasedBuckets]);

  const isLoading = salesQuery.isLoading || plotsQuery.isLoading || deceasedQuery.isLoading;
  const hasError = salesQuery.error || plotsQuery.error || deceasedQuery.error;

  return (
    <div className="min-h-screen bg-stone-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-6 h-6 text-teal-700" />
          <h1 className="text-2xl font-serif">Advanced Reports</h1>
        </div>

        <ReportParams initial={defaultParams} onRun={runReport} />

        {isLoading ? (
          <div className="flex items-center gap-2 text-stone-600"><Loader2 className="w-5 h-5 animate-spin"/> Loading data…</div>
        ) : hasError ? (
          <div className="text-red-600 text-sm">Failed to load report data.</div>
        ) : (
          <>
            {params.type === 'sales' && (<ReportCharts type="sales" data={salesSeries} />)}
            {params.type === 'plot' && (<ReportCharts type="plot" data={plotUtil} />)}
            {params.type === 'deceased' && (<ReportCharts type="deceased" data={deceasedBuckets} />)}
            {params.type === 'predictive' && (<ReportCharts type="predictive" data={salesSeries} predicted={predicted} />)}

            {params.ai && (
              <AIInsights params={params} summaryInput={summaryInput} />
            )}
          </>
        )}
      </div>
    </div>
  );
}