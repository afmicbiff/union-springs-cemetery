import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import NewPlotEditDialog from "@/components/newplots/NewPlotEditDialog";
import Breadcrumbs from "@/components/Breadcrumbs";

// New Plots grid page
const TOTAL_PLOTS = 77;

const STATUS_COLORS = {
  Available: "bg-green-100 border-green-400 hover:bg-green-200",
  Reserved: "bg-yellow-100 border-yellow-400 hover:bg-yellow-200",
  Occupied: "bg-red-100 border-red-400 hover:bg-red-200",
  Unavailable: "bg-gray-200 border-gray-400 hover:bg-gray-300",
};

export default function NewPlots() {
  const [selected, setSelected] = useState(null); // { position, plot }

  const { data: plots = [], isLoading } = useQuery({
    queryKey: ["new-plots-simple"],
    queryFn: () => base44.entities.NewPlotSimple.list("position", 200),
    initialData: [],
  });

  const plotsByPosition = useMemo(() => {
    const map = {};
    plots.forEach((p) => { map[p.position] = p; });
    return map;
  }, [plots]);

  const positions = useMemo(() => Array.from({ length: TOTAL_PLOTS }, (_, i) => i + 1), []);

  return (
    <div className="min-h-screen bg-stone-100 py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Breadcrumbs items={[{ label: "New Plots" }]} />

        <div className="text-center">
          <h1 className="text-3xl font-serif text-stone-900">New Plots</h1>
          <p className="text-stone-600 mt-1 text-sm">
            {TOTAL_PLOTS} plots · 5 ft × 10 ft each · Click a plot to edit
          </p>
        </div>

        {/* Legend */}
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
            <div className="flex flex-col gap-1">
              {positions.map((pos) => {
                const plot = plotsByPosition[pos];
                const status = plot?.status || "Available";
                const colorCls = STATUS_COLORS[status] || STATUS_COLORS.Available;
                const occupant = plot ? [plot.first_name, plot.last_name].filter(Boolean).join(" ") : "";
                return (
                  <button
                    key={pos}
                    onClick={() => setSelected({ position: pos, plot })}
                    className={`border-2 rounded flex items-center px-3 transition-all ${colorCls}`}
                    style={{ width: "150px", height: "75px" }}
                    title={`Plot ${pos} - ${status}${occupant ? ` - ${occupant}` : ""}`}
                  >
                    <div className="flex flex-col items-start text-left w-full">
                      <span className="text-sm font-bold text-stone-900">Plot #{pos}</span>
                      <span className="text-[10px] text-stone-600">{status}</span>
                      {occupant && (
                        <span className="text-[11px] text-stone-800 truncate w-full">{occupant}</span>
                      )}
                    </div>
                  </button>
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