import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import NewPlotEditDialog from "@/components/newplots/NewPlotEditDialog";
import Breadcrumbs from "@/components/Breadcrumbs";

// Column configs: rightmost column first. Higher columns render further to the left.
const COLUMNS = [
  { column: 1, total: 82, blankStart: 62, blankEnd: 66 },
  { column: 2, total: 61, blankStart: null, blankEnd: null },
];

const STATUS_COLORS = {
  Available: "bg-green-100 border-green-400 hover:bg-green-200",
  Reserved: "bg-yellow-100 border-yellow-400 hover:bg-yellow-200",
  Occupied: "bg-red-100 border-red-400 hover:bg-red-200",
  Unavailable: "bg-gray-200 border-gray-400 hover:bg-gray-300",
};

function PlotCell({ plot, pos, isBlank, onClick }) {
  const status = plot?.status || "Available";
  const colorCls = isBlank ? "bg-white border-stone-300 hover:bg-stone-50" : (STATUS_COLORS[status] || STATUS_COLORS.Available);
  const occupant = plot ? [plot.first_name, plot.last_name].filter(Boolean).join(" ") : "";
  return (
    <button
      onClick={onClick}
      className={`border-2 rounded flex items-center px-3 transition-all ${colorCls}`}
      style={{ width: "150px", height: "75px" }}
      title={isBlank ? `Plot ${pos}` : `${plot?.row_label || `Plot ${pos}`}${plot?.plot_number ? ` (#${plot.plot_number})` : ""} - ${status}${occupant ? ` - ${occupant}` : ""}`}
    >
      {!isBlank && (
        <div className="flex flex-col items-start text-left w-full leading-tight">
          <div className="flex items-baseline gap-2 w-full">
            <span className="text-sm font-bold text-stone-900">{plot?.row_label || `#${pos}`}</span>
            {plot?.plot_number && (
              <span className="text-[10px] text-stone-500">#{plot.plot_number}</span>
            )}
          </div>
          <span className="text-[9px] text-stone-600">{status}</span>
          {occupant && (
            <span className="text-[11px] font-medium text-stone-800 truncate w-full">{occupant}</span>
          )}
          {plot?.family_name && (
            <span className="text-[10px] text-stone-600 italic truncate w-full">{plot.family_name}</span>
          )}
          {(plot?.birth_date || plot?.death_date) && (
            <span className="text-[9px] text-stone-500 truncate w-full">
              {plot?.birth_date || "?"} – {plot?.death_date || "?"}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

export default function NewPlots() {
  const [selected, setSelected] = useState(null);

  const { data: plots = [], isLoading } = useQuery({
    queryKey: ["new-plots-simple"],
    queryFn: () => base44.entities.NewPlotSimple.list("position", 500),
    initialData: [],
  });

  // Index plots by column -> position
  const plotsByColPos = useMemo(() => {
    const map = {};
    plots.forEach((p) => {
      const col = p.column || 1;
      if (!map[col]) map[col] = {};
      map[col][p.position] = p;
    });
    return map;
  }, [plots]);

  const totalPlots = COLUMNS.reduce((sum, c) => sum + c.total, 0);

  return (
    <div className="min-h-screen bg-stone-100 py-6 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <Breadcrumbs items={[{ label: "New Plots" }]} />

        <div className="text-center">
          <h1 className="text-3xl font-serif text-stone-900">New Plots</h1>
          <p className="text-stone-600 mt-1 text-sm">
            {totalPlots} plots · 5 ft × 10 ft each · Click a plot to edit
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 text-xs">
          {Object.entries(STATUS_COLORS).map(([status, cls]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className={`w-4 h-4 rounded border ${cls}`} />
              <span className="text-stone-700">{status}</span>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
          </div>
        ) : (
          <div className="bg-white p-4 rounded-lg shadow-md border border-stone-200 mx-auto overflow-x-auto" style={{ width: "fit-content", maxWidth: "100%" }}>
            <div className="flex gap-3">
              {/* Render columns with higher column numbers on the left */}
              {[...COLUMNS].sort((a, b) => b.column - a.column).map((col) => {
                const positions = Array.from({ length: col.total }, (_, i) => col.total - i);
                return (
                  <div key={col.column} className="flex flex-col gap-1">
                    {positions.map((pos) => {
                      const plot = plotsByColPos[col.column]?.[pos];
                      const isBlank = col.blankStart != null && pos >= col.blankStart && pos <= col.blankEnd;
                      return (
                        <PlotCell
                          key={`${col.column}-${pos}`}
                          plot={plot}
                          pos={pos}
                          isBlank={isBlank}
                          onClick={() => setSelected({ position: pos, plot, column: col.column })}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <NewPlotEditDialog
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        plot={selected?.plot}
        position={selected?.position}
      />
    </div>
  );
}