import React, { useState, useMemo, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from "@/api/base44Client";
import { filterEntity, clearEntityCache } from "@/components/gov/dataClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin, ArrowLeft, Search, X, SlidersHorizontal, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import OldPlotTooltip from "@/components/plots/OldPlotTooltip";

const OldPlotGrid = lazy(() => import("@/components/plots/OldPlotGrid"));
const PlotEditDialog = lazy(() => import("@/components/plots/PlotEditDialog"));
const DraggableResizable = lazy(() => import("@/components/plots/DraggableResizable"));

const STATUS_COLORS = {
  Available: 'bg-green-500', Reserved: 'bg-yellow-400', Occupied: 'bg-red-500',
  Veteran: 'bg-blue-600', Unavailable: 'bg-gray-500', Unknown: 'bg-purple-500',
  'Not Usable': 'bg-gray-400',
};

export default function OldPlotsAndMap() {
  const queryClient = useQueryClient();
  const location = useLocation();

  const [hoverData, setHoverData] = useState(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editPlot, setEditPlot] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [plotFilter, setPlotFilter] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [activeLayer, setActiveLayer] = useState('grid'); // 'grid' or 'image' - which is on top

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
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

  // Fetch all Plot entities
  const { data: plotEntities = [], isLoading } = useQuery({
    queryKey: ['oldPlotsMap'],
    queryFn: () => filterEntity('Plot', {}, { sort: '-updated_date', limit: 3000, persist: true, ttlMs: 120000 }),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  // Transform to grid-compatible format
  const parsedData = useMemo(() => {
    const raw = (plotEntities || []).map(p => ({
      _id: p.id, Section: p.section, Row: p.row_number,
      Grave: p.plot_number, Status: p.status || 'Unknown',
      'First Name': p.first_name, 'Last Name': p.last_name,
      'Family Name': p.family_name, Birth: p.birth_date, Death: p.death_date,
      Notes: p.notes || '', _updated: p.updated_date, ...p,
    })).filter(r => r.Grave);
    // Dedupe by plot number, keep most recently updated
    const byNum = new Map();
    raw.forEach(item => {
      const num = String(item.Grave || '').trim();
      if (!num) return;
      const existing = byNum.get(num);
      if (!existing || new Date(item._updated || 0) > new Date(existing._updated || 0)) byNum.set(num, item);
    });
    return Array.from(byNum.values());
  }, [plotEntities]);

  // Apply filters
  const filteredData = useMemo(() => {
    return parsedData.filter(item => {
      if (statusFilter) {
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

  // Mutations
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await base44.functions.invoke('updatePlot', { id, data });
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      clearEntityCache('Plot');
      queryClient.invalidateQueries({ queryKey: ['oldPlotsMap'] });
      toast.success("Plot updated");
    },
    onError: (err) => toast.error(`Update failed: ${err.message}`),
  });

  const handleSave = useCallback((plot) => {
    updateMutation.mutate({
      id: plot._id,
      data: {
        section: plot.Section, row_number: plot.Row, plot_number: plot.Grave,
        status: plot.Status, first_name: plot['First Name'], last_name: plot['Last Name'],
        family_name: plot['Family Name'], birth_date: plot.Birth, death_date: plot.Death,
        notes: plot.Notes, capacity: plot.capacity, current_occupancy: plot.current_occupancy,
        burial_type: plot.burial_type, burial_type_options: plot.burial_type_options,
        container_type: plot.container_type, liner_vault_options: plot.liner_vault_options,
      },
    });
  }, [updateMutation]);

  const handleCreate = useCallback(async (newPlot) => {
    await base44.entities.Plot.create({
      section: newPlot.Section, row_number: newPlot.Row, plot_number: newPlot.Grave,
      status: newPlot.Status, first_name: newPlot['First Name'], last_name: newPlot['Last Name'],
      family_name: newPlot['Family Name'], birth_date: newPlot.Birth, death_date: newPlot.Death,
      notes: newPlot.Notes,
    });
    clearEntityCache('Plot');
    queryClient.invalidateQueries({ queryKey: ['oldPlotsMap'] });
    toast.success("Plot created");
  }, [queryClient]);

  const handleHover = useCallback((e, data) => {
    if (!data) { setTooltipVisible(false); return; }
    setHoverData(data);
    setTooltipVisible(true);
  }, []);

  const handleEdit = useCallback((plot) => {
    setEditPlot(plot);
    setEditOpen(true);
  }, []);

  const locatePlot = useCallback(() => {
    if (!targetPlotNum) return;
    window.dispatchEvent(new CustomEvent('plot-stop-all-blink'));
    const el = document.querySelector(`[data-plot-num="${targetPlotNum}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      setTimeout(() => window.dispatchEvent(new CustomEvent('plot-start-blink', { detail: { targetPlotNum } })), 400);
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
    if (matches.length === 0) { toast.info('No plots found matching your search'); return; }
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

  const clearFilters = useCallback(() => {
    setStatusFilter(''); setOwnerFilter(''); setPlotFilter(''); setSearchQuery('');
  }, []);

  // Auto-locate plot when arriving from search
  const autoLocatedRef = useRef(false);
  useEffect(() => {
    if (autoLocatedRef.current || !fromSearch || !targetPlotNum || isLoading || parsedData.length === 0) return;
    autoLocatedRef.current = true;
    // Small delay to let the grid render
    const timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('plot-stop-all-blink'));
      const el = document.querySelector(`[data-plot-num="${targetPlotNum}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        setTimeout(() => window.dispatchEvent(new CustomEvent('plot-start-blink', { detail: { targetPlotNum } })), 500);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [fromSearch, targetPlotNum, isLoading, parsedData]);

  const hasFilters = statusFilter || ownerFilter || plotFilter;

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight font-serif">Old Plots & Map</h1>
            <p className="text-xs sm:text-sm text-gray-500">Historic cemetery plot grid — matches the official spreadsheet layout</p>
          </div>
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-sm px-1 py-0.5">
            <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40" disabled={zoom <= 0.3}>
              <ZoomOut className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-xs font-mono text-gray-500 min-w-[36px] text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40" disabled={zoom >= 2}>
              <ZoomIn className="w-4 h-4 text-gray-600" />
            </button>
            <div className="w-px h-5 bg-gray-200 mx-0.5" />
            <button onClick={() => setZoom(1)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40" disabled={zoom === 1}>
              <RotateCcw className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Filters bar */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {fromSearch && (
              <Link to={backSearchUrl} className="inline-flex items-center text-teal-800 hover:text-teal-900 font-medium text-sm shrink-0">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Search
              </Link>
            )}
            {fromSearch && targetPlotNum && (
              <button onClick={locatePlot}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-lg bg-teal-600 text-white hover:bg-teal-700 ring-2 ring-teal-400 ring-offset-2 shrink-0"
                style={{ animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }}>
                <MapPin className="w-4 h-4" /> Locate #{targetPlotNum}
              </button>
            )}
            {/* Search */}
            <div className="relative w-full sm:w-auto sm:min-w-[280px] sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-600" />
              <Input placeholder="Search name, plot #, family..."
                className="w-full h-10 pl-9 pr-24 text-sm rounded-lg border-2 border-gray-200 focus:border-teal-500"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchLocate()} />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-20 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                  <X className="h-4 w-4" />
                </button>
              )}
              <div className="absolute right-1 top-1/2 -translate-y-1/2">
                <Button className="h-8 px-3 bg-teal-700 hover:bg-teal-800 text-white text-sm" onClick={handleSearchLocate}>
                  <Search className="h-4 w-4 mr-1" /> Find
                </Button>
              </div>
            </div>
            <Button variant="outline" onClick={() => setShowAdvanced(!showAdvanced)}
              className={`h-10 px-3 text-sm font-medium shrink-0 ${showAdvanced ? 'border-teal-500 bg-teal-50 text-teal-700' : ''}`}>
              <SlidersHorizontal className="h-4 w-4 mr-1" /> Filters
            </Button>
            {/* Status legend buttons */}
            <div className="flex items-center gap-1.5 flex-wrap ml-auto">
              {Object.entries(STATUS_COLORS).map(([label, bgClass]) => (
                <button key={label} type="button"
                  onClick={() => setStatusFilter(prev => prev === label ? '' : label)}
                  className={`flex items-center gap-1 h-8 px-2 rounded-full border border-gray-200 shadow-sm hover:bg-green-50 shrink-0 ${statusFilter === label ? 'ring-2 ring-green-500' : ''}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${bgClass}`} />
                  <span className="text-[10px] font-semibold text-gray-600">{label}</span>
                </button>
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

      {/* Grid */}
      <main className="p-4 sm:p-6 overflow-auto">
        <div className="max-w-full mx-auto pb-20">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Loader2 size={48} className="mb-4 animate-spin text-teal-500" />
              <p className="text-lg font-medium">Loading Plots...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <p className="text-lg font-medium">No plots match your filters</p>
              {hasFilters && <Button variant="outline" onClick={clearFilters} className="mt-3">Clear Filters</Button>}
            </div>
          ) : (
            <div className="relative w-full border border-gray-200 rounded-lg bg-stone-50 overflow-auto" style={{ height: '80vh', minHeight: '600px' }}>
              <div className="relative" style={{ width: '3000px', height: '2000px' }}>
                <Suspense fallback={null}>
                  {/* Aerial image layer */}
                  <DraggableResizable
                    initialX={40}
                    initialY={40}
                    initialWidth={700}
                    initialHeight={900}
                    minWidth={150}
                    minHeight={150}
                    label="Aerial Image"
                    zIndex={activeLayer === 'image' ? 20 : 10}
                    onFocus={() => setActiveLayer('image')}
                  >
                    {({ width, height }) => (
                      <img
                        src="https://media.base44.com/images/public/693cd1f0c20a0662b5f281d5/a21339067_GraveyardPICadobe2.jpg"
                        alt="Aerial view of Union Springs Cemetery"
                        className="rounded-md shadow-md border border-stone-200 pointer-events-none"
                        style={{ width, height, objectFit: 'fill' }}
                        draggable={false}
                      />
                    )}
                  </DraggableResizable>

                  {/* Grid layer */}
                  <DraggableResizable
                    initialX={800}
                    initialY={40}
                    initialWidth={1400}
                    initialHeight={900}
                    minWidth={300}
                    minHeight={300}
                    label="Plot Grid"
                    zIndex={activeLayer === 'grid' ? 20 : 10}
                    onFocus={() => setActiveLayer('grid')}
                  >
                    {({ width, height }) => (
                      <div className="w-full h-full overflow-auto p-2" style={{ width, height }}>
                        <div className="inline-block origin-top-left" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
                          <Suspense fallback={<div className="flex items-center text-sm text-gray-500"><Loader2 className="w-5 h-5 animate-spin mr-2" />Loading grid…</div>}>
                            <OldPlotGrid plots={filteredData} isAdmin={isAdmin} onHover={handleHover} onEdit={isAdmin ? handleEdit : undefined} />
                          </Suspense>
                        </div>
                      </div>
                    )}
                  </DraggableResizable>
                </Suspense>
              </div>
            </div>
          )}
        </div>
      </main>

      {tooltipVisible && hoverData && <OldPlotTooltip data={hoverData} visible={tooltipVisible} />}

      {editOpen && (
        <Suspense fallback={null}>
          <PlotEditDialog isOpen={editOpen} onClose={() => setEditOpen(false)}
            plot={editPlot} onSave={handleSave} onCreate={handleCreate} />
        </Suspense>
      )}
    </div>
  );
}