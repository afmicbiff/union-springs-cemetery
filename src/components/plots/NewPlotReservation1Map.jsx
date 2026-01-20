import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Search, Info, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import ZoomPan from "@/components/common/ZoomPan";
import debounce from "lodash/debounce";

const STATUS_COLORS = {
  Available: "bg-green-500 border-green-700",
  "Pending Reservation": "bg-amber-500 border-amber-600",
  Reserved: "bg-yellow-400 border-yellow-600",
  Occupied: "bg-red-500 border-red-700",
  Veteran: "bg-blue-600 border-blue-800",
  Unavailable: "bg-gray-600 border-gray-800",
  Unknown: "bg-purple-500 border-purple-700",
  "Not Usable": "bg-gray-400 border-gray-600",
  Default: "bg-gray-300 border-gray-500",
};

const ROW_PALETTES = {
  A: "bg-blue-100 border-blue-300 text-blue-900",
  B: "bg-green-100 border-green-300 text-green-900",
  C: "bg-rose-100 border-rose-300 text-rose-900",
  D: "bg-amber-100 border-amber-300 text-amber-900",
  E: "bg-purple-100 border-purple-300 text-purple-900",
  F: "bg-lime-100 border-lime-300 text-lime-900",
  G: "bg-cyan-100 border-cyan-300 text-cyan-900",
  H: "bg-orange-100 border-orange-300 text-orange-900",
  I: "bg-pink-100 border-pink-300 text-pink-900",
  J: "bg-teal-100 border-teal-300 text-teal-900",
};

const Tooltip = React.memo(({ data, position, visible }) => {
  if (!visible || !data) return null;

  const statusKey = STATUS_COLORS[data.Status] ? data.Status : "Default";
  const statusColor = STATUS_COLORS[statusKey];
  const bgClass = statusColor.split(" ").find((c) => c.startsWith("bg-"));

  return (
    <div
      className="fixed z-50 bg-white p-4 rounded-lg shadow-2xl border border-gray-200 w-72 text-sm pointer-events-none"
      style={{
        left: `${position.x + 12}px`,
        top: `${position.y + 12}px`,
        opacity: visible ? 1 : 0,
        transition: "opacity 120ms ease-out",
      }}
    >
      <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
        <div className="flex items-center space-x-2">
          <span className={`w-3 h-3 rounded-full ${bgClass}`}></span>
          <span className="font-bold text-gray-800 text-lg">Grave {data.Grave}</span>
        </div>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Row {data.Row}
        </span>
      </div>

      {data.Status === "Occupied" || data.FirstName || data.lastname ? (
        <div className="space-y-2">
          <div className="bg-gray-50 p-2 rounded border border-gray-100">
            <p className="text-xs text-gray-400 uppercase font-bold">Occupant</p>
            <p className="font-bold text-gray-800 text-base">
              {data.FirstName} {data.lastname}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-400">Born</p>
              <p className="font-medium text-gray-700">{data.Birth || "Unknown"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Died</p>
              <p className="font-medium text-gray-700">{data.Death || "Unknown"}</p>
            </div>
          </div>
          {(data.Notes || data.FamilyName) && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400">Details</p>
              {data.FamilyName && (
                <p className="text-xs text-gray-600">Family: {data.FamilyName}</p>
              )}
              {data.Notes && <p className="text-xs text-gray-600 italic">{data.Notes}</p>}
            </div>
          )}
        </div>
      ) : (
        <div className="text-gray-500 py-2 italic text-center bg-gray-50 rounded">
          Status: {data.Status}
        </div>
      )}
    </div>
  );
});

const GravePlot = React.memo(({ data, baseColorClass, onHover, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  if (data?.isSpacer) {
    return (
      <div className="w-16 h-8 m-0.5 border border-dashed border-gray-300 bg-gray-50/50 rounded-[1px]"></div>
    );
  }

  const statusColorFull = STATUS_COLORS[data.Status] || STATUS_COLORS.Default;
  const statusBg = statusColorFull.split(" ").find((cls) => cls.startsWith("bg-")) || "bg-gray-400";

  const baseClass = `${baseColorClass} opacity-90 hover:opacity-100 transition-transform`;
  const hoverClass = `${baseColorClass.replace("100", "200")} scale-110 z-20 shadow-xl ring-2 ring-blue-400 ring-opacity-75`;
  const activeClass = isHovered ? hoverClass : baseClass;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (onClick && data) onClick(data);
      }}
      onMouseEnter={(e) => {
        setIsHovered(true);
        onHover(e, data);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onHover(null, null);
      }}
      className={`
        relative transition-all duration-200 ease-in-out cursor-pointer
        border rounded-[1px] 
        flex flex-row items-center justify-between px-1.5
        w-16 h-8 m-0.5 text-[8px] overflow-hidden select-none font-bold shadow-sm
        ${activeClass}
        plot-element
      `}
      title={`Row: ${data.Row}, Grave: ${data.Grave}`}
    >
      <span className="text-[10px] leading-none font-black text-gray-800">{data.Grave}</span>
      <span className="text-[8px] leading-none text-gray-600 font-mono tracking-tighter truncate max-w-full">
        {data.Row}
      </span>
      <div className={`w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm ${statusBg}`}></div>
    </div>
  );
});

const LegendItem = React.memo(({ label, colorClass, onClick, active }) => {
  const bgClass = colorClass.split(" ").find((c) => c.startsWith("bg-"));
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!active}
      className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 bg-white h-12 px-3 rounded-full border border-gray-200 shadow-sm transition-colors hover:bg-green-100 ${
        active ? "ring-2 ring-green-500" : ""
      } w-24 sm:w-auto text-center`}
    >
      <div className={`w-4 h-4 rounded-full border border-gray-300 ${bgClass}`}></div>
      <span className="text-xs font-semibold text-gray-600">{label}</span>
    </button>
  );
});

const RowSection = React.memo(({ rowLetter, plots, isCollapsed, onToggle, onHover, onPlotClick }) => {
  const palette = ROW_PALETTES[rowLetter] || "bg-gray-100 border-gray-300 text-gray-900";
  const [bgColor, borderColor, textColor] = palette.split(" ");

  // Define the 8 column ranges for each row letter
  // Order: 225-232, 217-224, 209-216, 201-208, 125-132, 117-124, 109-116, 101-108 (right to left)
  const columnRanges = [
    { start: 225, end: 232, label: "225-232" },
    { start: 217, end: 224, label: "217-224" },
    { start: 209, end: 216, label: "209-216" },
    { start: 201, end: 208, label: "201-208" },
    { start: 125, end: 132, label: "125-132" },
    { start: 117, end: 124, label: "117-124" },
    { start: 109, end: 116, label: "109-116" },
    { start: 101, end: 108, label: "101-108" },
  ];

  // Group plots by the numeric part of Row into 8 columns
  const groupedByRange = useMemo(() => {
    const groups = {};
    columnRanges.forEach((range) => {
      groups[range.label] = [];
    });

    plots.forEach((plot) => {
      const rowNum = parseInt(String(plot.Row || "").replace(/\D/g, "")) || 0;
      // Find which range this plot belongs to
      const range = columnRanges.find((r) => rowNum >= r.start && rowNum <= r.end);
      if (range) {
        groups[range.label].push(plot);
      }
    });

    // Sort each group by the row number (ascending so bottom is first in flex-col-reverse)
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => {
        const numA = parseInt(String(a.Row || "").replace(/\D/g, "")) || 0;
        const numB = parseInt(String(b.Row || "").replace(/\D/g, "")) || 0;
        return numA - numB;
      });
    });
    return groups;
  }, [plots]);

  return (
    <div id={`row-${rowLetter}`} className="relative">
      <div
        className="flex items-end mb-3 ml-1 cursor-pointer group select-none"
        onClick={() => onToggle(rowLetter)}
      >
        <div
          className={`mr-2 mb-1 p-1 rounded-full transition-colors ${
            isCollapsed
              ? "bg-gray-200 text-gray-600"
              : `bg-white shadow-sm`
          }`}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
        </div>
        <h2 className={`text-2xl font-bold ${textColor}`}>Row {rowLetter}</h2>
        <div className="ml-4 h-px flex-grow bg-gray-200 mb-2 group-hover:bg-gray-300 transition-colors"></div>
        <span className="mb-1 text-xs font-mono text-gray-400 ml-2">{plots.length} Plots</span>
      </div>

      {!isCollapsed && (
        <div
          className={`rounded-xl border-2 border-dashed p-6 transition-colors duration-500 ${borderColor} ${bgColor} bg-opacity-30 overflow-x-auto`}
        >
          <div className="flex gap-4 justify-start overflow-x-auto pb-4">
            {columnRanges.map((range) => (
              <div
                key={range.label}
                className="flex flex-col-reverse gap-1 items-center justify-start min-w-[4rem] border-r border-dashed border-gray-300 last:border-0 pr-2"
              >
                <div className="text-[9px] text-gray-400 font-mono mt-1">{rowLetter}-{range.label}</div>
                {groupedByRange[range.label].map((plot) => (
                  <GravePlot
                    key={plot.id}
                    data={plot}
                    baseColorClass={`${bgColor.replace("100", "100")} ${borderColor}`}
                    onHover={onHover}
                    onClick={onPlotClick}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default function NewPlotReservation1Map({ filters = {}, onPlotClick }) {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoverData, setHoverData] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [collapsedRows, setCollapsedRows] = useState({});
  const [statusFilter, setStatusFilter] = useState("All");

  const debouncedSetQuery = useMemo(() => debounce((v) => setSearchQuery(v), 250), []);

  useEffect(() => {
    debouncedSetQuery(searchInput);
    return () => {
      if (debouncedSetQuery.cancel) debouncedSetQuery.cancel();
    };
  }, [searchInput, debouncedSetQuery]);

  // Sync external filters
  useEffect(() => {
    if (filters?.search !== undefined) {
      setSearchInput(filters.search || "");
    }
    if (filters?.status) {
      setStatusFilter(filters.status);
    }
  }, [filters?.search, filters?.status]);

  // Fetch all NewPlotReservation1 records
  const { data: plots = [], isLoading } = useQuery({
    queryKey: ["newPlotReservation1-map"],
    queryFn: async () => base44.entities.NewPlotReservation1.list("Grave", 2000),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  // Filter plots based on search and status
  const filteredPlots = useMemo(() => {
    return plots.filter((plot) => {
      // Status filter
      const currentStatus = statusFilter !== "All" ? statusFilter : filters?.status;
      if (currentStatus && currentStatus !== "All" && plot.Status !== currentStatus) {
        return false;
      }

      // Search filter
      const query = searchQuery.toLowerCase();
      if (query) {
        const searchable = [
          plot.Grave,
          plot.Row,
          plot.FirstName,
          plot.lastname,
          plot.FamilyName,
          plot.Notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(query)) return false;
      }

      // Owner filter
      if (filters?.owner) {
        const family = String(plot.FamilyName || "").toLowerCase();
        if (!family.includes(filters.owner.toLowerCase())) return false;
      }

      // Plot number filter
      if (filters?.plot) {
        const plotStr = String(plot.Grave || "").toLowerCase();
        const wanted = filters.plot.toLowerCase();
        const numItem = parseInt(plotStr.replace(/\D/g, "")) || 0;
        const numWanted = /^[0-9]+$/.test(wanted) ? parseInt(wanted, 10) : null;
        if (numWanted != null) {
          if (numItem !== numWanted) return false;
        } else if (!plotStr.includes(wanted)) {
          return false;
        }
      }

      return true;
    });
  }, [plots, searchQuery, statusFilter, filters?.status, filters?.owner, filters?.plot]);

  // Group by row letter (A-J)
  const groupedByRow = useMemo(() => {
    const groups = {};
    filteredPlots.forEach((plot) => {
      const rowStr = String(plot.Row || "").toUpperCase();
      const letterMatch = rowStr.match(/^([A-J])/);
      const key = letterMatch ? letterMatch[1] : "Other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(plot);
    });
    return groups;
  }, [filteredPlots]);

  const rowLetters = Object.keys(groupedByRow).sort().reverse(); // J to A

  const handleHover = useCallback((e, data) => {
    if (!data) {
      setIsTooltipVisible(false);
      return;
    }
    const rect = e.target.getBoundingClientRect();
    setMousePos({ x: rect.right, y: rect.top + rect.height / 2 });
    setHoverData(data);
    setIsTooltipVisible(true);
  }, []);

  const toggleRow = useCallback((rowLetter) => {
    setCollapsedRows((prev) => ({
      ...prev,
      [rowLetter]: !prev[rowLetter],
    }));
  }, []);

  const handlePlotClick = useCallback(
    (plot) => {
      if (onPlotClick) {
        onPlotClick({
          id: plot.id,
          plot_number: plot.Grave,
          row_number: plot.Row,
          status: plot.Status,
          first_name: plot.FirstName,
          last_name: plot.lastname,
          family_name: plot.FamilyName,
        });
      }
    },
    [onPlotClick]
  );

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 text-sm text-gray-500">
        Loading plots…
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
      {/* Search */}
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search grave # or name"
            className="pl-8"
          />
        </div>
        {searchQuery && (
          <div className="mt-2 text-xs text-gray-500">{filteredPlots.length} match(es)</div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white border-b border-gray-200 py-3 mb-4 overflow-x-auto">
        <div className="flex flex-wrap items-center gap-2 justify-center">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center">
            <Info size={14} className="mr-1" /> Status
          </span>
          <LegendItem
            label="Available"
            colorClass={STATUS_COLORS.Available}
            onClick={() => setStatusFilter((prev) => (prev === "Available" ? "All" : "Available"))}
            active={statusFilter === "Available"}
          />
          <LegendItem
            label="Pending"
            colorClass={STATUS_COLORS["Pending Reservation"]}
            onClick={() =>
              setStatusFilter((prev) =>
                prev === "Pending Reservation" ? "All" : "Pending Reservation"
              )
            }
            active={statusFilter === "Pending Reservation"}
          />
          <LegendItem
            label="Reserved"
            colorClass={STATUS_COLORS.Reserved}
            onClick={() => setStatusFilter((prev) => (prev === "Reserved" ? "All" : "Reserved"))}
            active={statusFilter === "Reserved"}
          />
          <LegendItem
            label="Occupied"
            colorClass={STATUS_COLORS.Occupied}
            onClick={() => setStatusFilter((prev) => (prev === "Occupied" ? "All" : "Occupied"))}
            active={statusFilter === "Occupied"}
          />
          <LegendItem
            label="Veteran"
            colorClass={STATUS_COLORS.Veteran}
            onClick={() => setStatusFilter((prev) => (prev === "Veteran" ? "All" : "Veteran"))}
            active={statusFilter === "Veteran"}
          />
        </div>
      </div>

      {/* Map with Zoom/Pan */}
      <ZoomPan
        className="w-full min-h-[70vh] md:min-h-[78vh] rounded-lg border border-gray-200 overflow-auto"
        minScale={0.35}
        maxScale={2.5}
        initialScale={0.9}
      >
        <div className="p-4 inline-block min-w-max space-y-8">
          {rowLetters.length === 0 ? (
            <div className="text-sm text-gray-500">No plots found.</div>
          ) : (
            rowLetters.map((rowLetter) => (
              <RowSection
                key={rowLetter}
                rowLetter={rowLetter}
                plots={groupedByRow[rowLetter]}
                isCollapsed={collapsedRows[rowLetter]}
                onToggle={toggleRow}
                onHover={handleHover}
                onPlotClick={handlePlotClick}
              />
            ))
          )}
        </div>
      </ZoomPan>

      {/* Tooltip */}
      <Tooltip data={hoverData} visible={isTooltipVisible} position={mousePos} />
    </div>
  );
}