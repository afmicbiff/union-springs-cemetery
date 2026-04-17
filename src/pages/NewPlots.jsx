import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import NewPlotEditDialog from "@/components/newplots/NewPlotEditDialog";
import Breadcrumbs from "@/components/Breadcrumbs";

const COL1_TOTAL = 82;
const COL2_TOTAL = 82;
const COL3_TOTAL = 61;

const STATUS_COLORS = {
  Available: "bg-green-100 border-green-400 hover:bg-green-200",
  Reserved: "bg-yellow-100 border-yellow-400 hover:bg-yellow-200",
  Occupied: "bg-red-100 border-red-400 hover:bg-red-200",
  Unavailable: "bg-gray-200 border-gray-400 hover:bg-gray-300",
};

function PlotTile({ pos, plot, isBlank, onClick }) {
  const status = plot?.status || "Available";
  const colorCls = isBlank
    ? "bg-white border-stone-300 hover:bg-stone-50"
    : (STATUS_COLORS[status] || STATUS_COLORS.Available);
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

  const { col1Map, col2Map, col3Map } = useMemo(() => {
    const c1 = {}, c2 = {}, c3 = {};
    plots.forEach((p) => {
      if (p.column === 3) c3[p.position] = p;
      else if (p.column === 2) c2[p.position] = p;
      else c1[p.position] = p;
    });
    return { col1Map: c1, col2Map: c2, col3Map: c3 };
  }, [plots]);

  const col1Positions = useMemo(() => Array.from({ length: COL1_TOTAL }, (_, i) => COL1_TOTAL - i), []);
  const col2Positions = useMemo(() => Array.from({ length: COL2_TOTAL }, (_, i) => COL2_TOTAL - i), []);
  const col3Positions = useMemo(() => Array.from({ length: COL3_TOTAL }, (_, i) => COL3_TOTAL - i), []);

  const totalPlots = plots.length;

  return (
    <div className="min-h-screen bg-stone-100 py-6 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
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
          <div className="bg-white p-4 rounded-lg shadow-md border border-stone-200 mx-auto" style={{ width: "fit-content" }}>
            <div className="flex gap-4 items-end">
              {/* Column 3 (far left) */}
              <div className="flex flex-col gap-1">
                {col3Positions.map((pos) => {
                  const plot = col3Map[pos];
                  return (
                    <PlotTile
                      key={`c3-${pos}`}
                      pos={pos}
                      plot={plot}
                      isBlank={false}
                      onClick={() => setSelected({ position: pos, column: 3, plot })}
                    />
                  );
                })}
              </div>

              {/* Column 2 (middle) */}
              <div className="flex flex-col gap-1">
                {col2Positions.map((pos) => {
                  const plot = col2Map[pos];
                  const isBlank = pos >= 62 && pos <= 66;
                  return (
                    <PlotTile
                      key={`c2-${pos}`}
                      pos={pos}
                      plot={plot}
                      isBlank={isBlank}
                      onClick={() => setSelected({ position: pos, column: 2, plot })}
                    />
                  );
                })}
              </div>

              {/* Column 1 (right) */}
              <div className="flex flex-col gap-1">
                {col1Positions.map((pos) => {
                  const plot = col1Map[pos];
                  const isBlank = pos >= 62 && pos <= 66;
                  return (
                    <PlotTile
                      key={`c1-${pos}`}
                      pos={pos}
                      plot={plot}
                      isBlank={isBlank}
                      onClick={() => setSelected({ position: pos, column: 1, plot })}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

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