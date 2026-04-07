// Plots page v2
import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from "@/api/base44Client";
import { filterEntity, clearEntityCache } from "@/components/gov/dataClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin, ArrowLeft, Search, X, SlidersHorizontal } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePlotsMapData } from "@/components/plots/usePlotsMapData";
import debounce from 'lodash/debounce';
import ResizableBackgroundImage from '@/components/plots/ResizableBackgroundImage';
import SEOHead from '@/components/common/SEOHead';
import DraggableMapContainer from "@/components/plots/DraggableMapContainer";
import { toast } from "sonner";

const PlotEditDialog = lazy(() => import("@/components/plots/PlotEditDialog"));
const MapControls = lazy(() => import("@/components/plots/MapControls"));
const ExcelGrid = lazy(() => import("@/components/plots/ExcelGrid"));

const STATUS_COLORS = {
  Available: 'bg-green-500', Reserved: 'bg-yellow-400', Occupied: 'bg-red-500',
  Veteran: 'bg-blue-600', Unavailable: 'bg-gray-500', Unknown: 'bg-purple-500',
  'Not Usable': 'bg-gray-400',
};

const Tooltip = React.memo(({ data, visible }) => {
  if (!visible || !data) return null;
  const isVet = data.Status === 'Veteran' || (data.Notes && data.Notes.toLowerCase().includes('vet'));
  const statusKey = isVet ? 'Veteran' : (STATUS_COLORS[data.Status] ? data.Status : 'Default');
  const bgClass = STATUS_COLORS[statusKey] || 'bg-gray-400';

  return (
    <div className="fixed z-[9999] inset-0 flex items-center justify-center pointer-events-none">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-72 max-w-[85vw] pointer-events-none p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-3 h-3 rounded-full ${bgClass}`} />
          <span className="font-bold text-gray-900">Plot {data.Grave}</span>
          <span className="text-xs text-gray-500 ml-auto">{statusKey}</span>
        </div>
        <p className="text-sm text-gray-600">Row {data.Row}</p>
        {data['Family Name'] && <p className="text-sm font-medium mt-2 text-teal-700">Family: {data['Family Name']}</p>}
        {(data['First Name'] || data['Last Name']) && <p className="text-sm font-medium mt-1">{data['First Name']} {data['Last Name']}</p>}
        {data.Birth && data.Death && <p className="text-xs text-gray-500">{data.Birth} - {data.Death}</p>}
      </div>
    </div>
  );
});

const LegendItem = React.memo(({ label, colorClass, onClick, active }) => (
  <button
    type="button" onClick={onClick} aria-pressed={!!active}
    className={`flex items-center gap-1.5 bg-white h-9 px-3 rounded-full border border-gray-200 shadow-sm hover:bg-green-50 shrink-0 touch-manipulation ${active ? 'ring-2 ring-green-500' : ''}`}
  >
    <div className={`w-3 h-3 rounded-full ${colorClass}`} />
    <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">{label}</span>
  </button>
));

export default function PlotsPage() {
  const queryClient = useQueryClient();
  const location = useLocation();

  const invalidatePlotsMap = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['plotsMap_v3_all'] });
  }, [queryClient]);

  const [hoverData, setHoverData] = useState(null);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPlotForModal, setSelectedPlotForModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState('');
  const [plotFilter, setPlotFilter] = useState('');

  const params = useMemo(() => new URLSearchParams(window.location.search), [location.search]);
  const fromSearch = params.get('from') === 'search';
  const targetPlotNum = useMemo(() => {
    const p = parseInt(params.get('plot') || '', 10);
    return Number.isFinite(p) ? p : null;
  }, [params]);
  const backSearchUrl = location.state?.search
    ? `${createPageUrl('Search')}${location.state.search}`
    : createPageUrl('Search');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me().catch(() => null),
    staleTime: 5 * 60_000,
  });
  const isAdmin = user?.role === 'admin';

  const openSections = useMemo(() => ['1', '2', '3', '5'], []);
  const { data: plotEntities = [], isLoading } = usePlotsMapData({
    activeTab: 'map',
    openSections,
    filterEntity,
  });

  const parsedData = useMemo(() => {
    const raw = (plotEntities || []).map((p) => ({
      _id: p.id,
      _entity: 'Plot',
      Section: p.section,
      Row: p.row_number,
      Grave: p.plot_number,
      Status: p.status || 'Unknown',
      'First Name': p.first_name,
      'Last Name': p.last_name,
      'Family Name': p.family_name,
      Birth: p.birth_date,
      Death: p.death_date,
      Notes: p.notes || '',
      _updated: p.updated_date,
      ...p,
    })).filter(r => r.Grave);

    const byNum = new Map();
    raw.forEach(item => {
      const num = String(item.Grave || '').trim();
      if (!num) return;
      const existing = byNum.get(num);
      if (!existing || new Date(item._updated || 0) > new Date(existing._updated || 0)) {
        byNum.set(num, item);
      }
    });
    return Array.from(byNum.values());
  }, [plotEntities]);

  const filteredData = useMemo(() => {
    return parsedData.filter(item => {
      if (statusFilter && statusFilter !== 'All') {
        const isVet = item.Status === 'Veteran' || ((item.Notes || '').toLowerCase().includes('vet') && item.Status === 'Occupied');
        if (statusFilter === 'Veteran' && !isVet) return false;
        if (statusFilter !== 'Veteran' && item.Status !== statusFilter) return false;
      }
      if (ownerFilter) {
        const owner = String(item['Family Name'] || '').toLowerCase();
        if (!owner.includes(ownerFilter.toLowerCase())) return false;
      }
      if (plotFilter) {
        const plotStr = String(item.Grave || '').toLowerCase();
        if (!plotStr.includes(plotFilter.toLowerCase())) return false;
      }
      return true;
    });
  }, [parsedData, statusFilter, ownerFilter, plotFilter]);

  const updatePlotMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await base44.functions.invoke('updatePlot', { id, data });
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      clearEntityCache('Plot');
      queryClient.invalidateQueries({ queryKey: ['plots'] });
      invalidatePlotsMap();
      toast.success("Plot updated");
    },
    onError: (err) => toast.error(`Update failed: ${err.message}`),
  });

  const handleUpdatePlot = useCallback((updatedPlot) => {
    updatePlotMutation.mutate({
      id: updatedPlot._id,
      data: {
        section: updatedPlot.Section, row_number: updatedPlot.Row, plot_number: updatedPlot.Grave,
        status: updatedPlot.Status, first_name: updatedPlot['First Name'], last_name: updatedPlot['Last Name'],
        family_name: updatedPlot['Family Name'], birth_date: updatedPlot.Birth, death_date: updatedPlot.Death,
        notes: updatedPlot.Notes, capacity: updatedPlot.capacity, current_occupancy: updatedPlot.current_occupancy,
        burial_type: updatedPlot.burial_type, burial_type_options: updatedPlot.burial_type_options,
        container_type: updatedPlot.container_type, liner_vault_options: updatedPlot.liner_vault_options,
      },
    });
  }, [updatePlotMutation]);

  const handleCreatePlot = useCallback(async (newPlotData) => {
    try {
      await base44.entities.Plot.create({
        section: newPlotData.Section, row_number: newPlotData.Row, plot_number: newPlotData.Grave,
        status: newPlotData.Status, first_name: newPlotData['First Name'], last_name: newPlotData['Last Name'],
        family_name: newPlotData['Family Name'], birth_date: newPlotData.Birth, death_date: newPlotData.Death,
        notes: newPlotData.Notes,
      });
      clearEntityCache('Plot');
      queryClient.invalidateQueries({ queryKey: ['plots'] });
      invalidatePlotsMap();
      toast.success("Plot created");
    } catch (err) {
      toast.error(`Failed: ${err.message}`);
    }
  }, [queryClient, invalidatePlotsMap]);

  const handleHover = useCallback((e, data) => {
    if (!data) { setIsTooltipVisible(false); return; }
    setHoverData(data);
    setIsTooltipVisible(true);
  }, []);

  const handleEditClick = useCallback((plot) => {
    setSelectedPlotForModal(plot);
    setIsEditModalOpen(true);
  }, []);

  const locatePlot = useCallback(() => {
    if (!targetPlotNum) return;
    window.dispatchEvent(new CustomEvent('plot-stop-all-blink'));
    const el = document.querySelector(`[data-plot-num="${targetPlotNum}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('plot-start-blink', { detail: { targetPlotNum } }));
      }, 400);
    } else {
      toast.info(`Plot #${targetPlotNum} not found in the grid`);
    }
  }, [targetPlotNum]);

  const handleSearchLocate = useCallback(() => {
    if (!searchQuery.trim()) return;
    window.dispatchEvent(new CustomEvent('plot-stop-all-blink'));

    const term = searchQuery.toLowerCase().trim();
    const matches = parsedData.filter(p => {
      const text = [p.Grave, p.Row, p['First Name'], p['Last Name'], p['Family Name']].filter(Boolean).join(' ').toLowerCase();
      return text.includes(term);
    });

    if (matches.length === 0) {
      toast.info('No plots found matching your search');
      return;
    }

    toast.success(`Found ${matches.length} plot(s)`);

    const firstNum = parseInt(String(matches[0].Grave || '').replace(/\D/g, '')) || null;
    if (firstNum) {
      const el = document.querySelector(`[data-plot-num="${firstNum}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        setTimeout(() => {
          matches.forEach(m => {
            const n = parseInt(String(m.Grave || '').replace(/\D/g, '')) || null;
            if (n) window.dispatchEvent(new CustomEvent('plot-search-blink', { detail: { targetPlotNum: n } }));
          });
        }, 400);
      }
    }
  }, [searchQuery, parsedData]);

  useEffect(() => {
    if (fromSearch) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [fromSearch]);

  const clearFilters = useCallback(() => {
    setStatusFilter('');
    setOwnerFilter('');
    setPlotFilter('');
    setSearchQuery('');
  }, []);

  const hasFilters = statusFilter || ownerFilter || plotFilter;

  return (
    <div className="min-h-screen flex flex-col font-sans relative bg-white">
      <ResizableBackgroundImage
        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/7901d9501_GraveyardPICadobe2.jpg"
        contain
      />

      <div className="relative z-[2] flex flex-col min-h-screen">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sm:py-6 shadow-sm sticky top-0 z-30">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="text-center md:text-left">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Old Plots and Maps</h1>
                <p className="text-xs sm:text-sm text-gray-500">Explore our historic cemetery plots — layout matches the official spreadsheet.</p>
              </div>
              <div className="flex items-center justify-center md:justify-end space-x-3">
                <Suspense fallback={null}>
                  <MapControls />
                </Suspense>
              </div>
            </div>
          </div>
        </header>

        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {fromSearch && (
                <Link to={backSearchUrl} className="inline-flex items-center text-teal-800 hover:text-teal-900 font-medium text-sm shrink-0">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back to Deceased Search
                </Link>
              )}

              {fromSearch && targetPlotNum && (
                <button onClick={locatePlot}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-lg bg-teal-600 text-white hover:bg-teal-700 ring-2 ring-teal-400 ring-offset-2 shrink-0 touch-manipulation"
                  style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
                  <MapPin className="w-4 h-4" />
                  <span>Locate Grave #{targetPlotNum}</span>
                </button>
              )}

              <div className="relative w-full sm:w-auto sm:min-w-[280px] sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-600" />
                <Input
                  placeholder="Search name, plot #, family..."
                  className="w-full h-10 pl-9 pr-24 text-sm rounded-lg border-2 border-gray-200 focus:border-teal-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchLocate()}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')}
                    className="absolute right-20 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                    <X className="h-4 w-4" />
                  </button>
                )}
                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                  <Button className="h-8 px-3 bg-teal-700 hover:bg-teal-800 text-white text-sm" onClick={handleSearchLocate}>
                    <Search className="h-4 w-4 mr-1" /> Search
                  </Button>
                </div>
              </div>

              <Button variant="outline" onClick={() => setShowAdvanced(!showAdvanced)}
                className={`h-10 px-3 text-sm font-medium shrink-0 ${showAdvanced ? 'border-teal-500 bg-teal-50 text-teal-700' : ''}`}>
                <SlidersHorizontal className="h-4 w-4 mr-1" /> Filters
              </Button>

              <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                {Object.entries(STATUS_COLORS).map(([label, bgClass]) => (
                  <LegendItem key={label} label={label} colorClass={bgClass}
                    onClick={() => setStatusFilter(prev => prev === label ? '' : label)}
                    active={statusFilter === label} />
                ))}
              </div>

              {hasFilters && (
                <Button onClick={clearFilters} variant="ghost" className="h-10 px-3 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0">
                  <X className="h-4 w-4 mr-1" /> Clear
                </Button>
              )}
            </div>

            {showAdvanced && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Family Name</Label>
                  <Input placeholder="e.g. Smith" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Plot Number</Label>
                  <Input placeholder="e.g. 123" value={plotFilter} onChange={(e) => setPlotFilter(e.target.value)} className="h-11" inputMode="numeric" />
                </div>
              </div>
            )}
          </div>
        </div>

        <main className="flex-grow p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-full mx-auto pb-20">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Loader2 size={48} className="mb-4 animate-spin text-blue-500" />
                <p className="text-lg font-medium">Loading Plots...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <p className="text-lg font-medium">No plots match your filters</p>
                {hasFilters && (
                  <Button variant="outline" onClick={clearFilters} className="mt-3">Clear Filters</Button>
                )}
              </div>
            ) : (
              <DraggableMapContainer>
                <div className="bg-white/50 rounded-lg border border-gray-200 overflow-auto map-zoom-container inline-block max-w-full">
                  <div className="p-4 inline-block map-zoom-inner origin-top-left">
                    <Suspense fallback={<div className="text-sm text-gray-500 flex items-center"><Loader2 className="w-5 h-5 animate-spin mr-2" />Loading grid…</div>}>
                      <ExcelGrid
                        plots={filteredData}
                        isAdmin={isAdmin}
                        onHover={handleHover}
                        onEdit={isAdmin ? handleEditClick : undefined}
                      />
                    </Suspense>
                  </div>
                </div>
              </DraggableMapContainer>
            )}
          </div>
        </main>

        {isTooltipVisible && hoverData && <Tooltip data={hoverData} visible={isTooltipVisible} />}

        {isEditModalOpen && (
          <Suspense fallback={null}>
            <PlotEditDialog
              isOpen={isEditModalOpen}
              onClose={() => setIsEditModalOpen(false)}
              plot={selectedPlotForModal}
              onSave={handleUpdatePlot}
              onCreate={handleCreatePlot}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}