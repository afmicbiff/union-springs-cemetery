import React, { useState, useMemo, useCallback, useRef } from "react";
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

export default function NewPlots() {
  const [selected, setSelected] = useState(null);
  const [zoom, setZoom] = useState(1);
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

  // Resizable container state
  const BASE_WIDTH = 900;
  const [containerSize, setContainerSize] = useState({ width: BASE_WIDTH, height: 650 });
  const resizeRef = useRef(null);
  // Lock factor - grid scales proportionally with image width
  const lockScale = containerSize.width / BASE_WIDTH;
  const effectiveZoom = zoom * lockScale;

  const startResize = useCallback((e, dir) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = containerSize.width;
    const startH = containerSize.height;

    const onMove = (ev) => {
      let newW = startW;
      let newH = startH;
      if (dir.includes("e")) newW = Math.max(200, startW + (ev.clientX - startX));
      if (dir.includes("w")) newW = Math.max(200, startW - (ev.clientX - startX));
      if (dir.includes("s")) newH = Math.max(200, startH + (ev.clientY - startY));
      if (dir.includes("n")) newH = Math.max(200, startH - (ev.clientY - startY));
      setContainerSize({ width: newW, height: newH });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [containerSize]);

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <Breadcrumbs items={[{ label: "New Plots" }]} />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight font-serif mt-1">New Plots</h1>
            <p className="text-xs sm:text-sm text-gray-500">{totalPlots} plots · 5 ft × 10 ft each · Click a plot to edit</p>
          </div>
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-sm px-1 py-0.5 self-start md:self-auto">
            <button onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40" disabled={zoom <= 0.25} title="Zoom out">
              <ZoomOut className="w-4 h-4 text-gray-600" />
            </button>
            <div className="flex items-center">
              <input
                type="number"
                min="25"
                max="500"
                value={Math.round(zoom * 100)}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (Number.isFinite(val) && val > 0) setZoom(Math.max(0.25, Math.min(5, val / 100)));
                }}
                className="w-14 text-xs font-mono text-gray-700 text-center border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-teal-500"
              />
              <span className="text-xs font-mono text-gray-500 ml-0.5">%</span>
            </div>
            <button onClick={() => setZoom((z) => Math.min(5, +(z + 0.25).toFixed(2)))} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40" disabled={zoom >= 5} title="Zoom in">
              <ZoomIn className="w-4 h-4 text-gray-600" />
            </button>
            <div className="w-px h-5 bg-gray-200 mx-0.5" />
            <button onClick={() => setZoom(1)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40" disabled={zoom === 1} title="Reset zoom">
              <RotateCcw className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Filters bar */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto space-y-3">
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
      <main className="p-4 sm:p-6 overflow-auto">
        <div className="max-w-full mx-auto pb-20">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            </div>
          ) : (
            <div
              ref={resizeRef}
              className="relative p-4 rounded-lg mx-auto overflow-auto"
              style={{
                width: `${containerSize.width}px`,
                height: `${containerSize.height}px`,
                maxWidth: "100%",
                backgroundImage: "url('https://media.base44.com/images/public/693cd1f0c20a0662b5f281d5/02100bab5_GraveyardPICadobe2.jpg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            >
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

              <div className="flex justify-end">
                <div className="inline-block origin-top-right" style={{ transform: `scale(${effectiveZoom})`, transformOrigin: "top right" }}>
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