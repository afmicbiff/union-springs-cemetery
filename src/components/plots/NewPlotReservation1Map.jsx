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

  const isVeteran = data.Status === 'Veteran' || (data.Notes && data.Notes.toLowerCase().includes('vet'));
  const isOccupied = data.Status === 'Occupied' || isVeteran;

  const statusKey = isVeteran ? 'Veteran' : (STATUS_COLORS[data.Status] ? data.Status : 'Default');
  const statusColor = STATUS_COLORS[statusKey];
  const bgClass = statusColor.split(' ').find(c => c.startsWith('bg-'));

  // Status badge colors
  const statusBadgeColors = {
    'Available': 'bg-green-100 text-green-800 border-green-300',
    'Pending Reservation': 'bg-amber-100 text-amber-800 border-amber-300',
    'Reserved': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'Occupied': 'bg-red-100 text-red-800 border-red-300',
    'Veteran': 'bg-blue-100 text-blue-800 border-blue-300',
    'Unavailable': 'bg-gray-100 text-gray-800 border-gray-300',
    'Unknown': 'bg-purple-100 text-purple-800 border-purple-300',
    'Not Usable': 'bg-gray-100 text-gray-600 border-gray-300',
    'Default': 'bg-gray-100 text-gray-600 border-gray-300'
  };

  const badgeClass = statusBadgeColors[statusKey] || statusBadgeColors.Default;

  return (
    <div 
      className="fixed z-[9999] inset-0 flex items-center justify-center pointer-events-none"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-80 max-w-[90vw] pointer-events-none overflow-hidden"
        style={{
          transform: visible ? 'scale(1)' : 'scale(0.95)',
          transition: 'transform 150ms ease-out, opacity 150ms ease-out',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* Header */}
        <div className={`px-5 py-4 ${bgClass} bg-opacity-20`}>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-3 h-3 rounded-full ${bgClass} ring-2 ring-white shadow-sm`}></span>
                <span className="font-bold text-gray-900 text-xl">Plot {data.Grave}</span>
              </div>
              <span className="text-sm text-gray-500 font-medium">Row {data.Row}</span>
            </div>
            <span className={`px-3 py-1 text-xs font-bold rounded-full border ${badgeClass}`}>
              {statusKey}
            </span>
          </div>
        </div>
        
        {/* Body */}
        <div className="p-5 space-y-4">
          {isOccupied || data.FirstName || data.lastname ? (
            <>
              {/* Occupant Info */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Occupant</p>
                <p className="font-bold text-gray-900 text-lg leading-tight">
                  {data.FirstName} {data.lastname}
                </p>
                {data.FamilyName && (
                  <p className="text-sm text-gray-500 mt-1">Family: {data.FamilyName}</p>
                )}
              </div>
              
              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <p className="text-[10px] text-blue-400 uppercase font-bold tracking-wider">Born</p>
                  <p className="font-semibold text-blue-900 text-sm">{data.Birth || '—'}</p>
                </div>
                <div className="bg-rose-50 p-3 rounded-lg border border-rose-100">
                  <p className="text-[10px] text-rose-400 uppercase font-bold tracking-wider">Died</p>
                  <p className="font-semibold text-rose-900 text-sm">{data.Death || '—'}</p>
                </div>
              </div>
              
              {/* Notes */}
              {data.Notes && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Notes</p>
                  <p className="text-sm text-gray-600 italic leading-relaxed">{data.Notes}</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <div className={`w-12 h-12 mx-auto mb-3 rounded-full ${bgClass} bg-opacity-30 flex items-center justify-center`}>
                <span className={`w-5 h-5 rounded-full ${bgClass}`}></span>
              </div>
              <p className="text-gray-700 font-medium">
                {data.Status === 'Reserved' 
                  ? `Reserved for ${data.FamilyName || data.Notes || 'Family'}` 
                  : data.Status === 'Available' 
                    ? 'This plot is available'
                    : data.Status === 'Pending Reservation'
                      ? 'Pending reservation approval'
                      : `Status: ${data.Status}`}
              </p>
              {data.Notes && data.Status !== 'Reserved' && (
                <p className="text-sm text-gray-500 mt-2 italic">{data.Notes}</p>
              )}
            </div>
          )}
        </div>
      </div>
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
      className={`flex flex-row items-center justify-center gap-2 bg-white h-10 md:h-12 px-4 rounded-full border border-gray-200 shadow-sm transition-colors hover:bg-green-100 ${
        active ? "ring-2 ring-green-500" : ""
      } min-w-[100px] w-auto text-center`}
    >
      <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full border border-gray-300 ${bgClass} flex-shrink-0`}></div>
      <span className="text-xs md:text-sm font-semibold text-gray-600 whitespace-nowrap">{label}</span>
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
      </div>

      {!isCollapsed && (
        <div
          className={`rounded-xl border-2 border-dashed p-6 transition-colors duration-500 ${borderColor} ${bgColor} bg-opacity-30`}
        >
          <div className="flex gap-4 justify-start pb-4">
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

  const rowLetters = ['J', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'].filter(r => groupedByRow[r]);

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
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-2 md:p-4">
        {/* Instruction */}
      <div className="mb-4 flex items-center justify-center">
        <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-amber-700 text-white text-xs sm:text-sm shadow font-medium">
          Click on the plot to start the reservation process.
        </span>
      </div>

      {/* Legend */}
      <div className="bg-white border-b border-gray-200 py-3 mb-4">
        <div className="flex flex-wrap justify-center items-center gap-2 px-2">
          <div className="w-full text-center mb-1 md:w-auto md:mb-0 md:mr-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider inline-flex items-center">
              <Info size={14} className="mr-1" /> Status
            </span>
          </div>
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
        <div className="p-4 pt-2 inline-block min-w-max space-y-8">
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