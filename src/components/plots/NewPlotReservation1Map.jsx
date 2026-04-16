import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
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

const STATUS_DOT = {
  Available: 'bg-green-500',
  "Pending Reservation": 'bg-amber-500',
  Reserved: 'bg-yellow-400',
  Occupied: 'bg-red-500',
  Veteran: 'bg-blue-600',
  Unavailable: 'bg-gray-500',
  Unknown: 'bg-purple-500',
  "Not Usable": 'bg-gray-400',
  Default: 'bg-gray-300',
};

const GravePlot = React.memo(({ data, onHover, onClick }) => {
  if (data?.isSpacer) {
    return <div className="w-[68px] h-[38px] border-r border-gray-100/50" />;
  }

  const isVet = data.Status === 'Veteran' || ((data.Notes || '').toLowerCase().includes('vet') && data.Status === 'Occupied');
  const statusKey = isVet ? 'Veteran' : (data.Status || 'Unknown');
  const dotBg = STATUS_DOT[statusKey] || STATUS_DOT.Default;
  const lastName = data.lastname || data.FamilyName || '';
  const display = lastName.length > 9 ? lastName.substring(0, 9) + '…' : lastName;
  const graveLabel = data.Grave || '';

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (onClick && data) onClick(data);
      }}
      onMouseEnter={(e) => onHover(e, data)}
      onMouseLeave={() => onHover(null, null)}
      className="w-[68px] h-[38px] px-0.5 flex items-center gap-0.5 border-r border-gray-200/50 cursor-pointer hover:bg-yellow-50 transition-colors plot-element"
      title={`#${graveLabel} ${data.Row || ''} - ${statusKey}`}
    >
      <div className={`w-2 h-2 rounded-full shrink-0 ${dotBg}`} />
      <div className="flex flex-col leading-none min-w-0 overflow-hidden">
        <span className="text-[9px] font-bold text-gray-800 truncate">#{graveLabel}</span>
        {display && <span className="text-[7px] text-gray-500 truncate">{display}</span>}
      </div>
    </div>
  );
});



// Column ranges define the 8 columns, ordered left-to-right visually
// (225-232 on the left, 101-113 on the right - extended by 5 for spacers after 1163)
const COLUMN_RANGES = [
  { start: 225, end: 232, label: "225-232" },
  { start: 217, end: 224, label: "217-224" },
  { start: 209, end: 216, label: "209-216" },
  { start: 201, end: 208, label: "201-208" },
  { start: 125, end: 132, label: "125-132" },
  { start: 117, end: 124, label: "117-124" },
  { start: 109, end: 116, label: "109-116" },
  { start: 101, end: 113, label: "101-113" },
];

// Spacer config: insert 5 blank plots before Grave 1163 (Row H-105)
const SPACER_CONFIG = {
  beforeGrave: '1163',
  count: 5,
};

// Row letters ordered top-to-bottom (J at top, A at bottom)
const ROW_LETTERS = ['J', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];

export default function NewPlotReservation1Map({ filters = {}, onPlotClick }) {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoverData, setHoverData] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");

  const debouncedSetQuery = useMemo(() => debounce((v) => setSearchQuery(v), 250), []);

  useEffect(() => {
    debouncedSetQuery(searchInput);
    return () => {
      if (debouncedSetQuery.cancel) debouncedSetQuery.cancel();
    };
  }, [searchInput, debouncedSetQuery]);

  useEffect(() => {
    if (filters?.search !== undefined) setSearchInput(filters.search || "");
    if (filters?.status) setStatusFilter(filters.status);
  }, [filters?.search, filters?.status]);

  const { data: plots = [], isLoading } = useQuery({
    queryKey: ["newPlotReservation1-map"],
    queryFn: async () => base44.entities.NewPlotReservation1.list("Grave", 2000),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const filteredPlots = useMemo(() => {
    return plots.filter((plot) => {
      const currentStatus = statusFilter !== "All" ? statusFilter : filters?.status;
      if (currentStatus && currentStatus !== "All" && plot.Status !== currentStatus) return false;
      const query = searchQuery.toLowerCase();
      if (query) {
        const searchable = [plot.Grave, plot.Row, plot.FirstName, plot.lastname, plot.FamilyName, plot.Notes].filter(Boolean).join(" ").toLowerCase();
        if (!searchable.includes(query)) return false;
      }
      if (filters?.owner) {
        if (!String(plot.FamilyName || "").toLowerCase().includes(filters.owner.toLowerCase())) return false;
      }
      if (filters?.plot) {
        const plotStr = String(plot.Grave || "").toLowerCase();
        const wanted = filters.plot.toLowerCase();
        const numItem = parseInt(plotStr.replace(/\D/g, "")) || 0;
        const numWanted = /^[0-9]+$/.test(wanted) ? parseInt(wanted, 10) : null;
        if (numWanted != null) { if (numItem !== numWanted) return false; }
        else if (!plotStr.includes(wanted)) return false;
      }
      return true;
    });
  }, [plots, searchQuery, statusFilter, filters?.status, filters?.owner, filters?.plot]);

  // Build unified grid: each row letter gets plots grouped into 8 columns
  // Grid rows ordered J (top) → A (bottom), columns ordered 225-232 (left) → 101-108 (right)
  const grid = useMemo(() => {
    // Group all plots by row letter
    const byLetter = {};
    filteredPlots.forEach((plot) => {
      const rowStr = String(plot.Row || "").toUpperCase();
      const match = rowStr.match(/^([A-J])/);
      const letter = match ? match[1] : null;
      if (!letter) return;
      if (!byLetter[letter]) byLetter[letter] = {};

      const rowNum = parseInt(rowStr.replace(/\D/g, "")) || 0;
      const range = COLUMN_RANGES.find((r) => rowNum >= r.start && rowNum <= r.end);
      if (!range) return;
      if (!byLetter[letter][range.label]) byLetter[letter][range.label] = [];
      byLetter[letter][range.label].push(plot);
    });

    // Sort within each cell descending (highest number at top, lowest at bottom)
    Object.values(byLetter).forEach((cols) => {
      Object.keys(cols).forEach((key) => {
        cols[key].sort((a, b) => {
          const numA = parseInt(String(a.Row || "").replace(/\D/g, "")) || 0;
          const numB = parseInt(String(b.Row || "").replace(/\D/g, "")) || 0;
          return numB - numA;
        });
      });
    });

    return byLetter;
  }, [filteredPlots]);

  const activeRowLetters = ROW_LETTERS.filter((r) => grid[r]);

  const handleHover = useCallback((e, data) => {
    if (!data) { setIsTooltipVisible(false); return; }
    const rect = e.target.getBoundingClientRect();
    setMousePos({ x: rect.right, y: rect.top + rect.height / 2 });
    setHoverData(data);
    setIsTooltipVisible(true);
  }, []);

  const handlePlotClick = useCallback((plot) => {
    if (onPlotClick) {
      onPlotClick({
        id: plot.id, plot_number: plot.Grave, row_number: plot.Row,
        status: plot.Status, first_name: plot.FirstName,
        last_name: plot.lastname, family_name: plot.FamilyName,
      });
    }
  }, [onPlotClick]);

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 text-sm text-gray-500">
        Loading plots…
      </div>
    );
  }

  return (
    <div className="inline-block select-none">
      <ZoomPan
        className="w-full min-h-[70vh] md:min-h-[78vh] rounded-lg border border-gray-200 overflow-auto bg-white/50"
        minScale={0.35}
        maxScale={2.5}
        initialScale={0.9}
      >
        <div className="p-4 inline-block min-w-max">
          {activeRowLetters.length === 0 ? (
            <div className="text-sm text-gray-500">No plots found.</div>
          ) : (
            <div className="border border-gray-300 rounded overflow-hidden bg-white">
              {/* Unified grid: each row letter is a horizontal band, columns are vertical */}
              <div className="flex">
                {COLUMN_RANGES.map((range) => (
                  <div key={range.label} className="flex flex-col border-r border-gray-200 last:border-r-0">
                    {activeRowLetters.map((letter) => {
                      const cellPlots = (grid[letter] && grid[letter][range.label]) || [];
                      if (cellPlots.length === 0) {
                        return <div key={letter} className="w-[68px] h-[38px] border-b border-gray-100" />;
                      }
                      // Build items list, injecting spacers before the target grave
                      const items = [];
                      cellPlots.forEach((plot) => {
                        if (plot.Grave === SPACER_CONFIG.beforeGrave) {
                          for (let s = 0; s < SPACER_CONFIG.count; s++) {
                            items.push({ type: 'spacer', key: `spacer-${plot.Grave}-${s}` });
                          }
                        }
                        items.push({ type: 'plot', plot });
                      });
                      return items.map((item) => (
                        item.type === 'spacer'
                          ? <div key={item.key} className="w-[68px] h-[38px] border-b border-gray-100 bg-gray-50" />
                          : <div key={item.plot.id} className="border-b border-gray-100 last:border-b-0">
                              <GravePlot data={item.plot} onHover={handleHover} onClick={handlePlotClick} />
                            </div>
                      ));
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ZoomPan>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-4 flex-wrap">
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Legend:</span>
        {[
          ['bg-green-500', 'Available'],
          ['bg-amber-500', 'Pending'],
          ['bg-yellow-400', 'Reserved'],
          ['bg-red-500', 'Occupied'],
          ['bg-blue-600', 'Veteran'],
          ['bg-gray-500', 'Unavailable'],
          ['bg-purple-500', 'Unknown'],
        ].map(([bg, label]) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-full ${bg}`} />
            <span className="text-[10px] text-gray-600">{label}</span>
          </div>
        ))}
      </div>

      <Tooltip data={hoverData} visible={isTooltipVisible} position={mousePos} />
    </div>
  );
}