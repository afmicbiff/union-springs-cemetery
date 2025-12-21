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
      const rowStr = String(r.row_number || '').trim();
      const letterMatch = rowStr.match(/^[A-Za-z]/);
      const sectionKey = (r.section || "Unassigned").replace(/Section\s*/i, "").trim() || "Unassigned";
      const key = letterMatch ? letterMatch[0].toUpperCase() : sectionKey;
      if (!g[key]) g[key] = [];
      g[key].push(r);
    });

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
    const aLetter = /^[A-Za-z]$/.test(a);
    const bLetter = /^[A-Za-z]$/.test(b);
    // Reverse alphabetical for letter sections (e.g., J..A)
    if (aLetter && bLetter) return b.localeCompare(a);
    // Keep letters before others
    if (aLetter) return -1;
    if (bLetter) return 1;
    // Numeric sections ascending
    const na = parseInt(a);
    const nb = parseInt(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    if (!isNaN(na)) return -1; // numeric before non-numeric/other
    if (!isNaN(nb)) return 1;
    // Put Unassigned last
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    // Fallback alpha
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
          sectionKeys.map((section) => {
            if (section === 'A') {
              const aRows = grouped[section] || [];
              const numFromPlot = (row) => {
                const digits = String(row.plot_number || '').replace(/\D/g, '');
                return digits ? parseInt(digits, 10) : NaN;
              };
              const rowStr = (r) => String(r.row_number || '').toUpperCase();
              const a1 = aRows.filter((r) => {
                const n = numFromPlot(r);
                return (n >= 101 && n <= 132) || rowStr(r).includes('A-1') || rowStr(r).startsWith('A1');
              });
              const a2 = aRows.filter((r) => {
                const n = numFromPlot(r);
                return (n >= 201 && n <= 232) || rowStr(r).includes('A-2') || rowStr(r).startsWith('A2');
              });

              // Fallback: if nothing matched our A-1/A-2 criteria, render default A section
              if ((a1.length + a2.length) === 0) {
                return (
                  <div key={section}>
                    <div className="flex items-end gap-3 mb-3">
                      <h3 className="text-xl font-semibold text-gray-900">Section A</h3>
                      <span className="text-xs text-gray-500">{aRows.length} plots</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                      {aRows.map((r) => {
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
                );
              }

              return (
                <div key={section}>
                  <div className="flex items-end gap-3 mb-3">
                    <h3 className="text-xl font-semibold text-gray-900">Section A</h3>
                    <span className="text-xs text-gray-500">{aRows.length} plots</span>
                  </div>
                  <div className="flex flex-col md:flex-row md:justify-between gap-6">
                    {/* Left: A-2 */}
                    {a2.length > 0 && (
                      <div>
                        <div className="text-sm font-semibold text-gray-700 mb-2">Section A-2</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                          {a2.map((r) => {
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
                    )}
                    {/* Right: A-1 */}
                    {a1.length > 0 && (
                      <div className="md:ml-auto">
                        <div className="text-sm font-semibold text-gray-700 mb-2 text-right md:text-left">Section A-1</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 transform rotate-90 origin-top-left">
                          {a1.map((r) => {
                            const key = r.id;
                            const st = r.status && STATUS_COLORS[r.status] ? r.status : "Default";
                            const bg = STATUS_COLORS[st] || STATUS_COLORS.Default;
                            const occupant = [r.first_name, r.last_name].filter(Boolean).join(" ") || r.family_name || "";
                            const tip = `A-1 • Plot ${r.plot_number} • Row ${r.row_number || "-"} • ${r.status || "Unknown"}${occupant ? " • " + occupant : ""}`;
                            return (
                              <div key={key} title={tip} className="border border-gray-200 rounded-md p-2 bg-gray-50 hover:bg-gray-100 transition">
                                <div className="flex items-center justify-between">
                                  <div className="text-[11px] font-mono text-gray-800 font-semibold">{r.plot_number}</div>
                                  <span className={`w-3 h-3 rounded-full ${bg}`}></span>
                                </div>
                                <div className="mt-1 text-[11px] text-gray-600 truncate">Row: {r.row_number || "-"}</div>
                                <div className="mt-0.5 text-[11px] text-gray-600 truncate">{occupant}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            return (
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
            );
          })
        )}
      </div>
    </div>
  );
}