import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, X, SlidersHorizontal, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import NewPlotEditDialog from "@/components/newplots/NewPlotEditDialog";
import Breadcrumbs from "@/components/Breadcrumbs";

const COL1_TOTAL = 82;
const COL2_TOTAL = 82;
const COL3_TOTAL = 82;
const COL4_TOTAL = 82;
const COL5_TOTAL = 82;
const COL6_TOTAL = 82;
const COL7_TOTAL = 82;
const COL8_TOTAL = 82;
const COL9_TOTAL = 82;

const STATUS_DOT = {
  Available: "bg-green-500",
  Reserved: "bg-yellow-400",
  Occupied: "bg-red-500",
  Unavailable: "bg-gray-500",
};

function PlotTile({ pos, plot, isBlank, onClick, isHighlighted }) {
  const status = plot?.status || "Available";
  const dotCls = STATUS_DOT[status] || STATUS_DOT.Available;
  const occupant = plot ? [plot.first_name, plot.last_name].filter(Boolean).join(" ") : "";
  const highlightCls = isHighlighted ? "ring-4 ring-teal-500 ring-offset-1 z-10 relative animate-pulse" : "";
  return (
    <button
      onClick={onClick}
      className={`rounded flex items-center px-1 gap-1 transition-all hover:bg-stone-100 ${highlightCls}`}
      style={{ width: "75px", height: "38px" }}
      title={isBlank ? `Plot ${pos}` : `${plot?.row_label || `Plot ${pos}`}${plot?.plot_number ? ` (#${plot.plot_number})` : ""} - ${status}${occupant ? ` - ${occupant}` : ""}`}
    >
      {!isBlank && (
        <>
          <div className={`w-2 h-2 rounded-full shrink-0 ${dotCls}`} />
          <div className="flex flex-col leading-none min-w-0 text-left">
            <span className="text-[9px] font-bold text-stone-800 truncate">#{plot?.plot_number || pos}</span>
            {plot?.row_label && (
              <span className="text-[7px] text-stone-500 truncate">{plot.row_label}</span>
            )}
            {(plot?.last_name || plot?.first_name) && (
              <span className="text-[7px] text-stone-600 truncate">{[plot?.first_name, plot?.last_name].filter(Boolean).join(" ")}</span>
            )}
          </div>
        </>
      )}
    </button>
  );
}

const STORAGE_KEY = "newPlotsContainerSize";
const GRID_STORAGE_KEY = "newPlotsGridScale";

export default function NewPlots() {
  const [selected, setSelected] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [plotFilter, setPlotFilter] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [highlightedIds, setHighlightedIds] = useState(new Set());

  const { data: plots = [], isLoading } = useQuery({
    queryKey: ["new-plots-simple"],
    queryFn: () => base44.entities.NewPlotSimple.list("position", 1000),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const { col1Map, col2Map, col3Map, col4Map, col6Map, col7Map, col8Map, col9Map } = useMemo(() => {
    const c1 = {}, c2 = {}, c3 = {}, c4 = {}, c6 = {}, c7 = {}, c8 = {}, c9 = {};
    plots.forEach((p) => {
      if (p.column === 9) c9[p.position] = p;
      else if (p.column === 8) c8[p.position] = p;
      else if (p.column === 7) c7[p.position] = p;
      else if (p.column === 6) c6[p.position] = p;
      else if (p.column === 4) c4[p.position] = p;
      else if (p.column === 3) c3[p.position] = p;
      else if (p.column === 2) c2[p.position] = p;
      else c1[p.position] = p;
    });
    return { col1Map: c1, col2Map: c2, col3Map: c3, col4Map: c4, col6Map: c6, col7Map: c7, col8Map: c8, col9Map: c9 };
  }, [plots]);

  const col1Positions = useMemo(() => Array.from({ length: COL1_TOTAL }, (_, i) => COL1_TOTAL - i), []);
  const col2Positions = useMemo(() => Array.from({ length: COL2_TOTAL }, (_, i) => COL2_TOTAL - i), []);
  const col3Positions = useMemo(() => Array.from({ length: COL3_TOTAL }, (_, i) => COL3_TOTAL - i), []);
  const col4Positions = useMemo(() => Array.from({ length: COL4_TOTAL }, (_, i) => COL4_TOTAL - i), []);
  const col6Positions = useMemo(() => Array.from({ length: COL6_TOTAL }, (_, i) => COL6_TOTAL - i), []);
  const col7Positions = useMemo(() => Array.from({ length: COL7_TOTAL }, (_, i) => COL7_TOTAL - i), []);
  const col8Positions = useMemo(() => Array.from({ length: COL8_TOTAL }, (_, i) => COL8_TOTAL - i), []);
  const col9Positions = useMemo(() => Array.from({ length: COL9_TOTAL }, (_, i) => COL9_TOTAL - i), []);

  // Apply filters to determine visibility matches (still show all plots, but could be used for highlighting)
  const matchesFilter = useCallback((plot) => {
    if (!plot) return false;
    if (statusFilter && plot.status !== statusFilter) return false;
    if (ownerFilter) {
      const owner = String(plot.family_name || "").toLowerCase();
      if (!owner.includes(ownerFilter.toLowerCase())) return false;
    }
    if (plotFilter) {
      const s = String(plot.plot_number || "").toLowerCase();
      if (!s.includes(plotFilter.toLowerCase())) return false;
    }
    return true;
  }, [statusFilter, ownerFilter, plotFilter]);

  const hasFilters = statusFilter || ownerFilter || plotFilter;

  const filteredHighlightIds = useMemo(() => {
    if (!hasFilters) return new Set();
    const ids = new Set();
    plots.forEach((p) => { if (matchesFilter(p)) ids.add(p.id); });
    return ids;
  }, [plots, hasFilters, matchesFilter]);

  const handleSearch = useCallback(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) { setHighlightedIds(new Set()); return; }
    const matches = plots.filter((p) => {
      const text = [p.plot_number, p.row_label, p.first_name, p.last_name, p.family_name]
        .filter(Boolean).join(" ").toLowerCase();
      return text.includes(term);
    });
    if (matches.length === 0) {
      toast.info("No plots found matching your search");
      setHighlightedIds(new Set());
      return;
    }
    toast.success(`Found ${matches.length} plot(s)`);
    setHighlightedIds(new Set(matches.map((m) => m.id)));
  }, [searchQuery, plots]);

  const clearFilters = useCallback(() => {
    setStatusFilter(""); setOwnerFilter(""); setPlotFilter("");
    setSearchQuery(""); setHighlightedIds(new Set());
  }, []);

  const totalPlots = plots.length;
  const highlightSet = highlightedIds.size > 0 ? highlightedIds : filteredHighlightIds;

  // Resizable container state — image and grid are locked together at a fixed aspect ratio.
  // Resizing any handle (or using the zoom magnifier) scales both dimensions uniformly (1:1 proportional).
  // Size is persisted to localStorage so it stays the same across page visits.
  const BASE_WIDTH = 1800;
  const BASE_HEIGHT = 1300;
  const ASPECT = BASE_WIDTH / BASE_HEIGHT;
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [viewportWidth, setViewportWidth] = useState(() => typeof window !== "undefined" ? window.innerWidth : 1200);

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 768);
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const [containerSize, setContainerSize] = useState(() => {
    if (typeof window === "undefined") return { width: BASE_WIDTH, height: BASE_HEIGHT };
    // On mobile, always auto-fit the viewport — ignore saved size
    if (window.innerWidth < 768) {
      const w = window.innerWidth - 16;
      return { width: w, height: w / ASPECT };
    }
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.width > 0 && parsed?.height > 0) return parsed;
      }
    } catch {}
    return { width: BASE_WIDTH, height: BASE_HEIGHT };
  });

  // Keep mobile container fit to viewport on orientation/resize
  useEffect(() => {
    if (isMobile) {
      const w = viewportWidth - 16;
      setContainerSize({ width: w, height: w / ASPECT });
    }
  }, [isMobile, viewportWidth, ASPECT]);

  const resizeRef = useRef(null);
  // Lock factor — grid scales proportionally with image width (1:1 with container)
  const lockScale = containerSize.width / BASE_WIDTH;

  // Independent grid scale (X and Y) — multiplies on top of lockScale so the grid
  // can be resized independently of the image. Persisted to localStorage.
  const [gridScale, setGridScale] = useState(() => {
    if (typeof window === "undefined") return { x: 1, y: 1 };
    try {
      const saved = window.localStorage.getItem(GRID_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.x > 0 && parsed?.y > 0) return parsed;
      }
    } catch {}
    return { x: 0.47, y: 0.40 };
  });

  // Persist container size whenever it changes
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(containerSize));
    } catch {}
  }, [containerSize]);

  // Persist grid scale whenever it changes
  useEffect(() => {
    try {
      window.localStorage.setItem(GRID_STORAGE_KEY, JSON.stringify(gridScale));
    } catch {}
  }, [gridScale]);

  // Independent grid resize — orange handles. Scales grid X and/or Y relative to the container.
  const startGridResize = useCallback((e, dir) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startSX = gridScale.x;
    const startSY = gridScale.y;
    // Use container size as a reference so drag distance maps intuitively to scale changes.
    const refW = containerSize.width;
    const refH = containerSize.height;

    const onMove = (ev) => {
      let nx = startSX;
      let ny = startSY;
      if (dir.includes("e")) nx = Math.max(0.1, startSX + (ev.clientX - startX) / refW);
      if (dir.includes("w")) nx = Math.max(0.1, startSX - (ev.clientX - startX) / refW);
      if (dir.includes("s")) ny = Math.max(0.1, startSY + (ev.clientY - startY) / refH);
      if (dir.includes("n")) ny = Math.max(0.1, startSY - (ev.clientY - startY) / refH);
      setGridScale({ x: nx, y: ny });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [gridScale, containerSize]);

  const resetGridScale = useCallback(() => setGridScale({ x: 1, y: 1 }), []);

  // Zoom magnifier scales the whole container (image + grid together, 1:1).
  // Current zoom percent is derived from container width vs base width.
  const zoomPercent = Math.round(lockScale * 100);
  const setZoomPercent = useCallback((pct) => {
    const clamped = Math.max(1, Math.min(500, pct));
    const newW = (BASE_WIDTH * clamped) / 100;
    const newH = newW / ASPECT;
    setContainerSize({ width: newW, height: newH });
  }, [ASPECT]);

  const startResize = useCallback((e, dir) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = containerSize.width;

    const onMove = (ev) => {
      // Choose the larger delta so diagonal drags feel natural; horizontal/vertical handles still work.
      const dx = dir.includes("e") ? (ev.clientX - startX) : dir.includes("w") ? -(ev.clientX - startX) : 0;
      const dy = dir.includes("s") ? (ev.clientY - startY) : dir.includes("n") ? -(ev.clientY - startY) : 0;
      const delta = Math.abs(dx) >= Math.abs(dy) ? dx : dy * ASPECT;
      const newW = Math.max(200, startW + delta);
      const newH = newW / ASPECT;
      setContainerSize({ width: newW, height: newH });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [containerSize, ASPECT]);

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-2 sm:py-4 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-3">
          <div>
            <Breadcrumbs items={[{ label: "New Plots" }]} />
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight font-serif mt-1">New Plots</h1>
            <p className="text-[11px] sm:text-sm text-gray-500">{totalPlots} plots · 5 ft × 10 ft each · Tap a plot to edit</p>
          </div>
          {/* Zoom controls — scales the whole container (image + grid together, 1:1) */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-sm px-1 py-0.5 self-start md:self-auto">
            <button onClick={() => setZoomPercent(zoomPercent - 5)} className="p-1.5 rounded hover:bg-gray-100" title="Zoom out">
              <ZoomOut className="w-4 h-4 text-gray-600" />
            </button>
            <div className="flex items-center">
              <input
                type="number"
                min="1"
                max="500"
                value={zoomPercent}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (Number.isFinite(val) && val > 0) setZoomPercent(val);
                }}
                className="w-14 text-xs font-mono text-gray-700 text-center border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-teal-500"
              />
              <span className="text-xs font-mono text-gray-500 ml-0.5">%</span>
            </div>
            <button onClick={() => setZoomPercent(zoomPercent + 5)} className="p-1.5 rounded hover:bg-gray-100" title="Zoom in">
              <ZoomIn className="w-4 h-4 text-gray-600" />
            </button>
            <div className="w-px h-5 bg-gray-200 mx-0.5" />
            <button onClick={() => setZoomPercent(100)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40" disabled={zoomPercent === 100} title="Reset zoom">
              <RotateCcw className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Filters bar */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-2 sm:py-3">
        <div className="max-w-7xl mx-auto space-y-2 sm:space-y-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-auto sm:min-w-[280px] sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-600" />
              <Input
                placeholder="Search name, plot #, row..."
                className="w-full h-10 pl-9 pr-24 text-sm rounded-lg border-2 border-gray-200 focus:border-teal-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setHighlightedIds(new Set()); }} className="absolute right-20 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                  <X className="h-4 w-4" />
                </button>
              )}
              <div className="absolute right-1 top-1/2 -translate-y-1/2">
                <Button className="h-8 px-3 bg-teal-700 hover:bg-teal-800 text-white text-sm" onClick={handleSearch}>
                  <Search className="h-4 w-4 mr-1" /> Find
                </Button>
              </div>
            </div>

            <Button variant="outline" onClick={() => setShowAdvanced(!showAdvanced)}
              className={`h-10 px-3 text-sm font-medium shrink-0 ${showAdvanced ? "border-teal-500 bg-teal-50 text-teal-700" : ""}`}>
              <SlidersHorizontal className="h-4 w-4 mr-1" /> Filters
            </Button>

            {/* Status legend buttons (click to filter) */}
            <div className="flex items-center gap-1.5 flex-wrap ml-auto">
              {Object.entries(STATUS_DOT).map(([label, bgClass]) => (
                <button key={label} type="button"
                  onClick={() => setStatusFilter((prev) => prev === label ? "" : label)}
                  className={`flex items-center gap-1 h-8 px-2 rounded-full border border-gray-200 shadow-sm hover:bg-green-50 shrink-0 ${statusFilter === label ? "ring-2 ring-green-500" : ""}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${bgClass}`} />
                  <span className="text-[10px] font-semibold text-gray-600">{label}</span>
                </button>
              ))}
            </div>

            {(hasFilters || searchQuery) && (
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
                <Input placeholder="e.g. 1103" value={plotFilter} onChange={(e) => setPlotFilter(e.target.value)} className="h-11" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <main className="p-2 sm:p-6 overflow-auto">
        <div className="max-w-full mx-auto pb-10 sm:pb-20">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            </div>
          ) : (
            <div
              ref={resizeRef}
              className="relative rounded-lg mx-auto"
              style={{
                width: `${containerSize.width}px`,
                height: `${containerSize.height}px`,
              }}
            >
              {/* Image layer — fills the container, positioned behind grid */}
              <img
                src="https://media.base44.com/images/public/693cd1f0c20a0662b5f281d5/02100bab5_GraveyardPICadobe2.jpg"
                alt="Aerial view"
                className="absolute inset-0 w-full h-full object-fill rounded-lg pointer-events-none select-none"
                style={{ zIndex: 1 }}
                draggable={false}
              />

              {/* Resize handles — hidden on mobile (touch devices) */}
              {!isMobile && (
                <>
                  {/* Edge resize handles */}
                  <div onMouseDown={(e) => startResize(e, "n")} className="absolute top-0 left-2 right-2 h-1.5 cursor-ns-resize bg-teal-400/40 hover:bg-teal-500/70 z-20" title="Resize top" />
                  <div onMouseDown={(e) => startResize(e, "s")} className="absolute bottom-0 left-2 right-2 h-1.5 cursor-ns-resize bg-teal-400/40 hover:bg-teal-500/70 z-20" title="Resize bottom" />
                  <div onMouseDown={(e) => startResize(e, "w")} className="absolute top-2 bottom-2 left-0 w-1.5 cursor-ew-resize bg-teal-400/40 hover:bg-teal-500/70 z-20" title="Resize left" />
                  <div onMouseDown={(e) => startResize(e, "e")} className="absolute top-2 bottom-2 right-0 w-1.5 cursor-ew-resize bg-teal-400/40 hover:bg-teal-500/70 z-20" title="Resize right" />
                  {/* Corner resize handles */}
                  <div onMouseDown={(e) => startResize(e, "nw")} className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize bg-teal-500 hover:bg-teal-600 z-20 rounded-br" />
                  <div onMouseDown={(e) => startResize(e, "ne")} className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize bg-teal-500 hover:bg-teal-600 z-20 rounded-bl" />
                  <div onMouseDown={(e) => startResize(e, "sw")} className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize bg-teal-500 hover:bg-teal-600 z-20 rounded-tr" />
                  <div onMouseDown={(e) => startResize(e, "se")} className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize bg-teal-500 hover:bg-teal-600 z-20 rounded-tl" />

                  {/* Independent grid resize handles (orange) — resize the grid on 4 sides without affecting the image */}
                  <div onMouseDown={(e) => startGridResize(e, "n")} className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-2 cursor-ns-resize bg-orange-400/80 hover:bg-orange-500 z-30 rounded shadow" title="Resize grid top (independent)" />
                  <div onMouseDown={(e) => startGridResize(e, "s")} className="absolute bottom-4 left-1/2 -translate-x-1/2 w-20 h-2 cursor-ns-resize bg-orange-400/80 hover:bg-orange-500 z-30 rounded shadow" title="Resize grid bottom (independent)" />
                  <div onMouseDown={(e) => startGridResize(e, "w")} className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-20 cursor-ew-resize bg-orange-400/80 hover:bg-orange-500 z-30 rounded shadow" title="Resize grid left (independent)" />
                  <div onMouseDown={(e) => startGridResize(e, "e")} className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-20 cursor-ew-resize bg-orange-400/80 hover:bg-orange-500 z-30 rounded shadow" title="Resize grid right (independent)" />
                  {(gridScale.x !== 1 || gridScale.y !== 1) && (
                    <button onClick={resetGridScale} className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow" title="Reset grid scale">
                      Reset Grid ({Math.round(gridScale.x * 100)}×{Math.round(gridScale.y * 100)}%)
                    </button>
                  )}
                </>
              )}

              {/* Grid layer — scales with zoom, positioned on top of image */}
              <div className="absolute inset-0 flex justify-end" style={{ zIndex: 10, padding: "16px", paddingRight: `${16 + (225 + 100 - 200 - 25) * lockScale}px` }}>
                <div className="relative inline-block origin-top-right" style={{ transform: `scale(${lockScale * gridScale.x}, ${lockScale * gridScale.y})`, transformOrigin: "top right" }}>
                  <div className="flex gap-0 items-end">
                  {/* Column 9 (far left) */}
                  <div className="flex flex-col gap-0">
                    {col9Positions.map((pos) => {
                      const plot = col9Map[pos];
                      const isBlank = !plot;
                      return (
                        <PlotTile key={`c9-${pos}`} pos={pos} plot={plot} isBlank={isBlank}
                          isHighlighted={plot && highlightSet.has(plot.id)}
                          onClick={() => setSelected({ position: pos, column: 9, plot })} />
                      );
                    })}
                  </div>
                  {/* Column 8 */}
                  <div className="flex flex-col gap-0">
                    {col8Positions.map((pos) => {
                      const plot = col8Map[pos];
                      const isBlank = !plot;
                      return (
                        <PlotTile key={`c8-${pos}`} pos={pos} plot={plot} isBlank={isBlank}
                          isHighlighted={plot && highlightSet.has(plot.id)}
                          onClick={() => setSelected({ position: pos, column: 8, plot })} />
                      );
                    })}
                  </div>
                  {/* Column 7 */}
                  <div className="flex flex-col gap-0">
                    {col7Positions.map((pos) => {
                      const plot = col7Map[pos];
                      const isBlank = !plot;
                      return (
                        <PlotTile key={`c7-${pos}`} pos={pos} plot={plot} isBlank={isBlank}
                          isHighlighted={plot && highlightSet.has(plot.id)}
                          onClick={() => setSelected({ position: pos, column: 7, plot })} />
                      );
                    })}
                  </div>
                  {/* Column 6 */}
                  <div className="flex flex-col gap-0">
                    {col6Positions.map((pos) => {
                      const plot = col6Map[pos];
                      const isBlank = !plot;
                      return (
                        <PlotTile key={`c6-${pos}`} pos={pos} plot={plot} isBlank={isBlank}
                          isHighlighted={plot && highlightSet.has(plot.id)}
                          onClick={() => setSelected({ position: pos, column: 6, plot })} />
                      );
                    })}
                  </div>
                  {/* Column 5 - 2ft × 10ft blank spacer plots */}
                  <div className="flex flex-col gap-0">
                    {Array.from({ length: COL5_TOTAL }, (_, i) => COL5_TOTAL - i).map((pos) => (
                      <div
                        key={`c5-${pos}`}
                        className="bg-transparent rounded"
                        style={{ width: "30px", height: "38px" }}
                        title={`Column 5, Plot ${pos} (2 ft × 10 ft)`}
                      />
                    ))}
                  </div>
                  {/* Column 4 */}
                  <div className="flex flex-col gap-0">
                    {col4Positions.map((pos) => {
                      const plot = col4Map[pos];
                      const isBlank = pos >= 62 && pos <= 66;
                      return (
                        <PlotTile key={`c4-${pos}`} pos={pos} plot={plot} isBlank={isBlank}
                          isHighlighted={plot && highlightSet.has(plot.id)}
                          onClick={() => setSelected({ position: pos, column: 4, plot })} />
                      );
                    })}
                  </div>
                  {/* Column 3 */}
                  <div className="flex flex-col gap-0">
                    {col3Positions.map((pos) => {
                      const plot = col3Map[pos];
                      const isBlank = pos >= 62 && pos <= 66;
                      return (
                        <PlotTile key={`c3-${pos}`} pos={pos} plot={plot} isBlank={isBlank}
                          isHighlighted={plot && highlightSet.has(plot.id)}
                          onClick={() => setSelected({ position: pos, column: 3, plot })} />
                      );
                    })}
                  </div>
                  {/* Column 2 */}
                  <div className="flex flex-col gap-0">
                    {col2Positions.map((pos) => {
                      const plot = col2Map[pos];
                      const isBlank = pos >= 62 && pos <= 66;
                      return (
                        <PlotTile key={`c2-${pos}`} pos={pos} plot={plot} isBlank={isBlank}
                          isHighlighted={plot && highlightSet.has(plot.id)}
                          onClick={() => setSelected({ position: pos, column: 2, plot })} />
                      );
                    })}
                  </div>
                  {/* Column 1 */}
                  <div className="flex flex-col gap-0">
                    {col1Positions.map((pos) => {
                      const plot = col1Map[pos];
                      const isBlank = pos >= 62 && pos <= 66;
                      return (
                        <PlotTile key={`c1-${pos}`} pos={pos} plot={plot} isBlank={isBlank}
                          isHighlighted={plot && highlightSet.has(plot.id)}
                          onClick={() => setSelected({ position: pos, column: 1, plot })} />
                      );
                    })}
                  </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <NewPlotEditDialog
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        plot={selected?.plot}
        position={selected?.position}
        column={selected?.column}
      />
    </div>
  );
}