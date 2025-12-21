import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

const STATUS_COLORS = {
  Available: "bg-green-500",
  Reserved: "bg-yellow-400",
  Occupied: "bg-red-500",
  Veteran: "bg-blue-600",
  Unavailable: "bg-gray-600",
  Unknown: "bg-purple-500",
  Default: "bg-gray-300",
};

export default function NewPlotsMap({ batchId }) {
  const rowsQuery = useQuery({
    queryKey: ["newPlots-map", batchId],
    enabled: !!batchId,
    queryFn: async () => base44.entities.NewPlot.filter({ batch_id: batchId }, "plot_number", 2000),
    initialData: [],
  });

  const grouped = React.useMemo(() => {
    const g = {};
    (rowsQuery.data || []).forEach((r) => {
      const key = (r.section || "Unassigned").replace(/Section\s*/i, "").trim() || "Unassigned";
      g[key] = g[key] || [];
      g[key].push(r);
    });

    // Separate all rows whose row_number starts with 'A' into a dedicated section 'A'
    const isA = (row) => String(row.row_number || '').trim().toUpperCase().startsWith('A');
    const aRows = [];
    Object.keys(g).forEach((k) => {
      const remaining = [];
      g[k].forEach((r) => {
        if (isA(r)) aRows.push(r); else remaining.push(r);
      });
      g[k] = remaining;
    });
    if (aRows.length) {
      aRows.sort((a, b) => {
        const na = parseInt(String(a.plot_number).replace(/\D/g, "")) || 0;
        const nb = parseInt(String(b.plot_number).replace(/\D/g, "")) || 0;
        if (na !== nb) return na - nb;
        return String(a.plot_number).localeCompare(String(b.plot_number));
      });
      g['A'] = aRows;
    }

    // Sort plots within each remaining section and drop empty groups
    Object.keys(g).forEach((k) => {
      if (!g[k] || g[k].length === 0) {
        delete g[k];
        return;
      }
      g[k].sort((a, b) => {
        const na = parseInt(String(a.plot_number).replace(/\D/g, "")) || 0;
        const nb = parseInt(String(b.plot_number).replace(/\D/g, "")) || 0;
        if (na !== nb) return na - nb;
        return String(a.plot_number).localeCompare(String(b.plot_number));
      });
    });

    return g;
  }, [rowsQuery.data]);

  if (!batchId) return null;

  if (rowsQuery.isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 text-sm text-gray-500">
        Loading map…
      </div>
    );
  }

  const sectionKeys = Object.keys(grouped).sort((a, b) => {
    // Always show 'A' first, then numeric sections ascending, then others alphabetically
    if (a === 'A') return -1;
    if (b === 'A') return 1;
    const na = parseInt(a);
    const nb = parseInt(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    if (!isNaN(na)) return -1; // numeric before non-numeric
    if (!isNaN(nb)) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries({
          Available: STATUS_COLORS.Available,
          Reserved: STATUS_COLORS.Reserved,
          Occupied: STATUS_COLORS.Occupied,
          Veteran: STATUS_COLORS.Veteran,
        }).map(([label, cls]) => (
          <div key={label} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
            <span className={`w-4 h-4 rounded-full ${cls}`}></span>
            <span className="text-xs text-gray-700 font-medium">{label}</span>
          </div>
        ))}
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {sectionKeys.length === 0 ? (
          <div className="text-sm text-gray-500">No rows for this batch.</div>
        ) : (
          sectionKeys.map((section) => (
            <div key={section}>
              <div className="flex items-end gap-3 mb-3">
                <h3 className="text-xl font-semibold text-gray-900">Section {section}</h3>
                <span className="text-xs text-gray-500">{grouped[section].length} plots</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                {grouped[section].map((r) => {
                  const key = r.id;
                  const st = r.status && STATUS_COLORS[r.status] ? r.status : "Default";
                  const bg = STATUS_COLORS[st] || STATUS_COLORS.Default;
                  return (
                    <div key={key} className="border border-gray-200 rounded-md p-2 bg-gray-50 hover:bg-gray-100 transition">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-mono text-gray-800 font-semibold">{r.plot_number}</div>
                        <span className={`w-3 h-3 rounded-full ${bg}`}></span>
                      </div>
                      <div className="mt-1 text-[11px] text-gray-600 truncate">Row: {r.row_number || "-"}</div>
                      <div className="mt-0.5 text-[11px] text-gray-600 truncate">{[r.first_name, r.last_name].filter(Boolean).join(" ") || r.family_name || ""}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}