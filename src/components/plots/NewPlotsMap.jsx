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
      const rowStrRaw = String(r.row_number || '').toUpperCase();
      const cleanedRow = rowStrRaw.replace(/^(ROW|SECTION)\s*:?\s*/i, '').trim();
      let letterMatch = cleanedRow.match(/[A-Z]/);
      const plotStr = String(r.plot_number || '').toUpperCase();
      if (!letterMatch && plotStr) letterMatch = plotStr.match(/[A-Z]/);
      const sectionKey = (r.section || 'Unassigned').replace(/Section\s*/i, '').trim() || 'Unassigned';
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
              const rowNorm = (r) => String(r.row_number || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
              const canonicalA1Number = (row) => {
                const pnRaw = String(row.plot_number || '').toUpperCase();
                const pn = pnRaw.replace(/\s+/g, '');
                // If label starts with A1, try to derive canonical 101-132
                if (pn.startsWith('A1')) {
                  const after = pn.slice(2);
                  const m = after.match(/(\d{1,3})/);
                  if (m) {
                    const d = parseInt(m[1], 10);
                    if (d >= 100 && d <= 999) return d; // A110, A111 etc
                    if (d >= 1 && d <= 32) return 100 + d; // A1-07 => 107
                  }
                }
                // Try a 3-digit group first (e.g., 101)
                const m3 = pn.match(/(\d{3})/);
                if (m3) return parseInt(m3[1], 10);
                // Then try 1-2 digits and map to 100+
                const m2 = pn.match(/(\d{1,2})/);
                if (m2) {
                  const d2 = parseInt(m2[1], 10);
                  if (d2 >= 1 && d2 <= 32) return 100 + d2;
                }
                // Fallback to row number like A1xx
                const rn = String(row.row_number || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
                const mr = rn.match(/A1(\d{1,2})/);
                if (mr) return 100 + parseInt(mr[1], 10);
                return NaN;
              };
              const a1 = aRows.filter((r) => {
                const cn = canonicalA1Number(r);
                return (!isNaN(cn) && cn >= 101 && cn <= 132) || rowNorm(r).includes('A1');
              });
              const a2 = aRows.filter((r) => {
                const n = numFromPlot(r);
                const pn = String(r.plot_number || '').toUpperCase().replace(/[^A-Z0-9]/g,'');
                return (
                  (n >= 201 && n <= 232) ||
                  (n >= 1201 && n <= 1232) ||
                  rowNorm(r).includes('A2') ||
                  pn.startsWith('A2')
                );
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
                  <div className="flex flex-col gap-6 w-full items-start">
                    {/* Left: A-2 */}
                    {a2.length > 0 && (
                      <div className="w-full">
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
                      <div className="w-full">
                        <div className="text-sm font-semibold text-gray-700 mb-2">Section A-1</div>
                        {(() => {
                          const byNum = {};
                          const dupes = {};
                          a1.forEach((r) => {
                            const cn = canonicalA1Number(r);
                            if (!isNaN(cn) && cn >= 101 && cn <= 132) {
                              if (byNum[cn]) {
                                dupes[cn] = dupes[cn] ? [...dupes[cn], r] : [r];
                              } else {
                                byNum[cn] = r;
                              }
                            }
                          });
                          const rows = [
                            [132,124,116,108],
                            [121,123,115,107],
                            [130,122,114,106],
                            [129,121,113,105],
                            [128,120,112,104],
                            [127,119,111,103],
                            [126,118,110,102],
                            [125,117,109,101],
                          ];

                          // Compute diagnostics
                          const missing = [];
                          for (let n = 101; n <= 132; n++) {
                            if (!byNum[n]) missing.push(n);
                          }
                          const unplaced = a1.filter((r) => {
                            const cn = canonicalA1Number(r);
                            return isNaN(cn) || cn < 101 || cn > 132;
                          });
                          const othersInA = aRows.filter((r) => !a1.includes(r) && !a2.includes(r));

                          return (
                            <div className="space-y-3">
                              <div className="grid grid-cols-4 gap-2">
                                {rows.map((row, ri) => (
                                  <React.Fragment key={ri}>
                                    {row.map((n, ci) => {
                                      const r = byNum[n];
                                      if (!r) return null;
                                      const key = r.id;
                                      const st = r.status && STATUS_COLORS[r.status] ? r.status : 'Default';
                                      const bg = STATUS_COLORS[st] || STATUS_COLORS.Default;
                                      const occupant = [r.first_name, r.last_name].filter(Boolean).join(' ') || r.family_name || '';
                                      const tip = `A-1 • Plot ${r.plot_number} • Row ${r.row_number || '-' } • ${r.status || 'Unknown'}${occupant ? ' • ' + occupant : ''}`;
                                      return (
                                        <div key={key} title={tip} className="border border-gray-200 rounded-md p-2 bg-gray-50 hover:bg-gray-100 transition">
                                          <div className="flex items-center justify-between">
                                            <div className="text-[11px] font-mono text-gray-800 font-semibold">{r.plot_number}</div>
                                            <span className={`w-3 h-3 rounded-full ${bg}`}></span>
                                          </div>
                                          <div className="mt-1 text-[11px] text-gray-600 truncate">Row: {r.row_number || '-'}</div>
                                          <div className="mt-0.5 text-[11px] text-gray-600 truncate">{occupant}</div>
                                        </div>
                                      );
                                    })}
                                  </React.Fragment>
                                ))}
                              </div>

                              {(missing.length > 0 || unplaced.length > 0 || Object.keys(dupes).length > 0 || othersInA.length > 0) && (
                                <div className="mt-2 space-y-2">
                                  {missing.length > 0 && (
                                    <div className="text-xs text-gray-700">
                                      Missing canonical A-1 numbers:
                                      <span className="ml-1 font-mono">{missing.join(', ')}</span>
                                    </div>
                                  )}
                                  {Object.keys(dupes).length > 0 && (
                                    <div className="text-xs text-gray-700">
                                      Duplicate entries for numbers:
                                      {Object.entries(dupes).map(([n, arr]) => (
                                        <span key={n} className="inline-block ml-2 bg-amber-50 border border-amber-200 text-amber-800 rounded px-1.5 py-0.5 mr-1 mb-1">
                                          {n}: {arr.map(d => d.plot_number).join(' / ')}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {unplaced.length > 0 && (
                                    <div className="text-xs text-gray-700">
                                      A-1 labeled but not placed:
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {unplaced.map((r) => (
                                          <span key={r.id} className="inline-block bg-blue-50 border border-blue-200 text-blue-800 rounded px-1.5 py-0.5">
                                            {String(r.plot_number || '').trim() || '(no plot#)'}{r.row_number ? ` • Row ${r.row_number}` : ''}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {othersInA.length > 0 && (
                                    <div className="text-xs text-gray-700">
                                      Also in Section A (not A-1/A-2):
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {othersInA.map((r) => (
                                          <span key={r.id} className="inline-block bg-slate-50 border border-slate-200 text-slate-700 rounded px-1.5 py-0.5">
                                            {String(r.plot_number || '').trim() || '(no plot#)'}{r.row_number ? ` • Row ${r.row_number}` : ''}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}
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