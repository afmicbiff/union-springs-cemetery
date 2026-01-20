import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import Fuse from "fuse.js";
import debounce from "lodash/debounce";
import ZoomPan from "@/components/common/ZoomPan";

const STATUS_COLORS = {
        Available: "bg-green-500",
        "Pending Reservation": "bg-amber-500",
        Reserved: "bg-yellow-400",
        Occupied: "bg-red-500",
        Veteran: "bg-blue-600",
        Unavailable: "bg-gray-600",
        Unknown: "bg-purple-500",
        Default: "bg-gray-300",
      };

export default function NewPlotsMap({ batchId, filters = { status: 'All', section: 'All' }, showSearch = true, onPlotClick }) {
  const [query, setQuery] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  const deferredQuery = React.useDeferredValue(query);
  const debouncedSetQuery = React.useMemo(() => debounce((v) => setQuery(v), 250), []);
  const [fuzzyResults, setFuzzyResults] = React.useState(null);
  const [expandedSections, setExpandedSections] = React.useState({});

  // Debounce search input to avoid blocking UI while typing
  React.useEffect(() => {
    debouncedSetQuery(searchInput);
    return () => {
      if (debouncedSetQuery.cancel) debouncedSetQuery.cancel();
    };
  }, [searchInput, debouncedSetQuery]);
  const rowsQuery = useQuery({
    queryKey: ["newPlots-map", batchId],
    enabled: !!batchId,
    queryFn: async () => base44.entities.NewPlot.filter({ batch_id: batchId }, "plot_number", 2000),
    initialData: [],
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  // Sync external search into local fuzzy query
  React.useEffect(() => {
    if (filters && Object.prototype.hasOwnProperty.call(filters, 'search')) {
      const v = (filters.search || '').toString();
      setSearchInput(v);
      debouncedSetQuery(v);
    }
  }, [filters?.search, debouncedSetQuery]);

  const fuse = React.useMemo(() => {
    const list = rowsQuery.data || [];
    return new Fuse(list, {
      includeScore: true,
      threshold: 0.4,
      ignoreLocation: true,
      keys: [
        { name: "plot_number", weight: 0.6 },
        { name: "first_name", weight: 0.3 },
        { name: "last_name", weight: 0.3 },
        { name: "family_name", weight: 0.2 },
        { name: "row_number", weight: 0.15 },
      ],
    });
  }, [rowsQuery.data]);

  const handleClick = React.useCallback((row) => {
    if (onPlotClick) {
      onPlotClick(row);
    } else {
      // Avoid hard navigation when possible; fallback only if no handler provided
      window.location.href = createPageUrl('NewPlotDetails') + `?id=${row.id}`;
    }
  }, [onPlotClick]);

  const grouped = React.useMemo(() => {
    // Build base list from deferred fuzzy results or all data
    const baseList = (deferredQuery && deferredQuery.trim())
      ? (fuzzyResults || []).map(r => r.item)
      : (rowsQuery.data || []);

    // Apply filters
    const filtered = baseList.filter((r) => {
      const statusOk = !filters || filters.status === 'All' || r.status === filters.status;
      const secRaw = String(r.section || '').replace(/Section\s*/i, '').trim();
      const filterSec = (filters?.section || 'All').replace(/Section\s*/i, '').trim();
      const sectionOk = !filters || filterSec === 'All' || secRaw === filterSec;

      const ownerOk = !filters?.owner || String(r.family_name || '').toLowerCase().includes(String(filters.owner).toLowerCase());

      const plotFilter = (filters?.plot || '').toString().trim();
      let plotOk = true;
      if (plotFilter) {
        const plotStr = String(r.plot_number || '').toLowerCase();
        const wanted = plotFilter.toLowerCase();
        const numItem = parseInt(plotStr.replace(/\D/g, '')) || 0;
        const numWanted = /^[0-9]+$/.test(wanted) ? parseInt(wanted, 10) : null;
        plotOk = numWanted != null ? (numItem === numWanted) : plotStr.includes(wanted);
      }

      return statusOk && sectionOk && ownerOk && plotOk;
    });

    // Group filtered list
    const g2 = {};
    filtered.forEach((r) => {
      const rowStrRaw = String(r.row_number || '').toUpperCase();
      const cleanedRow = rowStrRaw.replace(/^(ROW|SECTION)\s*:?\s*/i, '').trim();
      let letterMatch = cleanedRow.match(/[A-Z]/);
      const plotStr = String(r.plot_number || '').toUpperCase();
      if (!letterMatch && plotStr) letterMatch = plotStr.match(/[A-Z]/);
      const sectionKey = (r.section || 'Unassigned').replace(/Section\s*/i, '').trim() || 'Unassigned';
      const key = letterMatch ? letterMatch[0].toUpperCase() : sectionKey;
      if (!g2[key]) g2[key] = [];
      g2[key].push(r);
    });

    Object.keys(g2).forEach((k) => {
      g2[k].sort((a, b) => {
        const na = parseInt(String(a.plot_number).replace(/\D/g, "")) || 0;
        const nb = parseInt(String(b.plot_number).replace(/\D/g, "")) || 0;
        if (na !== nb) return na - nb;
        return String(a.plot_number).localeCompare(String(b.plot_number));
      });
    });

    return g2;
  }, [rowsQuery.data, deferredQuery, fuzzyResults, filters?.status, filters?.section, filters?.owner, filters?.plot]);

  React.useEffect(() => {
    if (!deferredQuery.trim()) { setFuzzyResults(null); return; }
    const q = deferredQuery.trim();
    const results = fuse.search(q);
    setFuzzyResults(results);
  }, [deferredQuery, fuse]);

  // Always render consistently to avoid hook order changes
  const noBatchContent = (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 text-sm text-gray-500">
      Select an import batch to view plots.
    </div>
  );

  // Keep render path stable; show placeholders instead of early returns
  const loadingContent = (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 text-sm text-gray-500">
      Loading map…
    </div>
  );

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
      {/* Search (hidden when page-level filters control search) */}
      {showSearch && (
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search plot # or name (e.g., 118 or Smith)"
              className="pl-8"
            />
          </div>
          {deferredQuery && fuzzyResults && (
            <div className="mt-2 text-xs text-gray-500">{fuzzyResults.length} match(es)</div>
          )}
        </div>
      )}

      {/* If no batch or loading, show appropriate placeholder but keep layout stable */}
      {!batchId ? (
        noBatchContent
      ) : rowsQuery.isLoading ? (
        loadingContent
      ) : (
        <>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-4">
            {Object.entries({
              Available: STATUS_COLORS.Available,
              "Pending Reservation": STATUS_COLORS["Pending Reservation"],
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

          {/* Sections with Zoom/Pan */}
          <ZoomPan className="w-full min-h-[70vh] md:min-h-[78vh] rounded-lg border border-gray-200 overflow-auto" minScale={0.35} maxScale={2.5} initialScale={0.9}>
            <div className="p-2 inline-block min-w-max space-y-8">
              {/* First Row: 1103 A-101 (bottom) to 1179 J-108 (top) */}
              {(() => {
                // Filter plots in range 1103-1179 from the actual data
                const allData = rowsQuery.data || [];
                const firstRowPlots = allData.filter(r => {
                  const pn = parseInt(String(r.plot_number || '').replace(/\D/g, '')) || 0;
                  return pn >= 1103 && pn <= 1179;
                });

                // Apply filters
                const filteredFirstRow = firstRowPlots.filter((r) => {
                  const statusOk = !filters || filters.status === 'All' || r.status === filters.status;
                  const ownerOk = !filters?.owner || String(r.family_name || '').toLowerCase().includes(String(filters.owner).toLowerCase());
                  const plotFilter = (filters?.plot || '').toString().trim();
                  let plotOk = true;
                  if (plotFilter) {
                    const plotStr = String(r.plot_number || '').toLowerCase();
                    const wanted = plotFilter.toLowerCase();
                    const numItem = parseInt(plotStr.replace(/\D/g, '')) || 0;
                    const numWanted = /^[0-9]+$/.test(wanted) ? parseInt(wanted, 10) : null;
                    plotOk = numWanted != null ? (numItem === numWanted) : plotStr.includes(wanted);
                  }
                  return statusOk && ownerOk && plotOk;
                });

                if (filteredFirstRow.length === 0) return null;

                // Group by row letter (A-J), reversed so J is at top, A at bottom
                const byLetter = {};
                filteredFirstRow.forEach(r => {
                  const letter = (r.row_number || '').charAt(0).toUpperCase();
                  if (letter >= 'A' && letter <= 'J') {
                    if (!byLetter[letter]) byLetter[letter] = [];
                    byLetter[letter].push(r);
                  }
                });

                // Sort each letter's plots by the numeric part of row_number
                Object.keys(byLetter).forEach(letter => {
                  byLetter[letter].sort((a, b) => {
                    const na = parseInt(String(a.row_number || '').replace(/\D/g, '')) || 0;
                    const nb = parseInt(String(b.row_number || '').replace(/\D/g, '')) || 0;
                    return na - nb;
                  });
                });

                const letterOrder = ['J', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A']; // top to bottom

                return (
                  <div className="mb-8">
                    <div className="flex items-end gap-3 mb-3">
                      <h3 className="text-xl font-semibold text-gray-900">First Row</h3>
                      <span className="text-xs text-gray-500">{filteredFirstRow.length} plots (1103-1179)</span>
                    </div>
                    <div className="border-2 border-dashed border-blue-300 bg-blue-50/30 rounded-xl p-4">
                      <div className="flex flex-col gap-1">
                        {letterOrder.map(letter => {
                          const plots = byLetter[letter] || [];
                          if (plots.length === 0) return null;
                          return (
                            <div key={letter} className="flex items-center gap-1">
                              <span className="w-6 text-xs font-bold text-gray-700">{letter}</span>
                              <div className="flex gap-0.5">
                                {plots.map((r) => {
                                  const st = r.status && STATUS_COLORS[r.status] ? r.status : "Default";
                                  const bg = STATUS_COLORS[st] || STATUS_COLORS.Default;
                                  return (
                                    <div
                                      key={r.id || r.plot_number}
                                      className="relative w-16 h-8 m-0.5 border rounded-[1px] flex items-center justify-between px-1.5 bg-blue-100 border-blue-300 text-blue-900 opacity-90 hover:opacity-100 hover:scale-110 hover:z-20 hover:shadow-xl hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer plot-element"
                                      onClick={() => handleClick(r)}
                                      title={`Plot ${r.plot_number} • Row ${r.row_number} • ${r.status || 'Available'}`}
                                    >
                                      <span className="text-[10px] leading-none font-black text-gray-800">{r.plot_number}</span>
                                      <span className="text-[8px] leading-none text-gray-600 font-mono tracking-tighter truncate max-w-full">{r.row_number}</span>
                                      <div className={`w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm ${bg}`}></div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

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
                    // 1) PRIORITIZE row label like "A-101" or "A1-07"
                    const rnRaw = String(row.row_number || '').toUpperCase();
                    const rn = rnRaw.replace(/[^A-Z0-9]/g, ''); // A-101 -> A101
                    let mr3 = rn.match(/A1(\d{3})/);
                    if (mr3) {
                      const d = parseInt(mr3[1], 10);
                      if (d >= 101 && d <= 132) return d;
                    }
                    let mr2 = rn.match(/A1(\d{1,2})/);
                    if (mr2) {
                      const d = parseInt(mr2[1], 10);
                      if (d >= 1 && d <= 32) return 100 + d;
                    }

                    // 2) Analyze plot_number text
                    const pnRaw = String(row.plot_number || '').toUpperCase();
                    const pn = pnRaw.replace(/\s+/g, '');

                    if (pn.startsWith('A1')) {
                      const after = pn.slice(2);
                      const m = after.match(/(\d{1,3})/);
                      if (m) {
                        const d = parseInt(m[1], 10);
                        if (d >= 100 && d <= 999) return d; // A110 -> 110
                        if (d >= 1 && d <= 32) return 100 + d; // A1-07 -> 107
                      }
                    }

                    // Handle numeric encodings like 1103 -> 103, 1180 -> 118, 1257 -> 125, 1260 -> 120
                    const four = pn.match(/^(\d{4})$/);
                    if (four) {
                      const val = parseInt(four[1], 10);
                      if (val >= 1101 && val <= 1132) return 100 + (val % 100);
                      if (val >= 1180 && val <= 1199) return 100 + (val % 100);
                      if (val >= 1250 && val <= 1299) return 100 + (val % 100);
                      if (val >= 1260 && val <= 1299) return 100 + (val % 100);
                    }

                    // Then 3-digit group (e.g., 101)
                    const m3 = pn.match(/(\d{3})/);
                    if (m3) return parseInt(m3[1], 10);

                    // Then 1-2 digits and map to 100+
                    const m2 = pn.match(/(\d{1,2})/);
                    if (m2) {
                      const d2 = parseInt(m2[1], 10);
                      if (d2 >= 1 && d2 <= 32) return 100 + d2;
                    }

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
                              <div key={key} className="border border-gray-200 rounded-md p-2 bg-gray-50 hover:bg-gray-100 transition cursor-pointer" onClick={() => handleClick(r) }>
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
                            {(() => {
                              const canonicalA2Number = (row) => {
                                // Prefer row label like A-201 / A2-07
                                const rn = String(row.row_number || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
                                let mr3 = rn.match(/A2(\d{3})/);
                                if (mr3) { const d = parseInt(mr3[1], 10); if (d >= 201 && d <= 232) return d; }
                                let mr2 = rn.match(/A2(\d{1,2})/);
                                if (mr2) { const d = parseInt(mr2[1], 10); if (d >= 1 && d <= 32) return 200 + d; }

                                const pn = String(row.plot_number || '').toUpperCase().replace(/\s+/g, '');
                                // direct 3-digit 201-232
                                const m3pn = pn.match(/(\d{3})/);
                                if (m3pn) {
                                  const val = parseInt(m3pn[1], 10);
                                  if (val >= 201 && val <= 232) return val;
                                }
                                // 1201..1232 encoding => 201..232
                                const four = pn.match(/^(\d{4})$/);
                                if (four) {
                                  const val = parseInt(four[1], 10);
                                  if (val >= 1201 && val <= 1232) return 200 + (val % 100);
                                  // Heuristic for other encodings when row indicates A2
                                  if (/A2/.test(rn) && val >= 1400 && val <= 1599) {
                                    const last2 = val % 100;
                                    // Map 1411 -> 201, 1592 -> 232 examples
                                    if (val < 1500 && last2 >= 11 && last2 <= 42) return 200 + (last2 - 10);
                                    if (val >= 1500 && last2 >= 60 && last2 <= 92) return 200 + (last2 - 60);
                                  }
                                }
                                return NaN;
                              };

                              const byNum = {};
                              a2.forEach((r) => {
                                const cn = canonicalA2Number(r);
                                if (!isNaN(cn) && cn >= 201 && cn <= 232 && !byNum[cn]) byNum[cn] = r;
                              });

                              const rows = [
                                [232,224,216,208],
                                [231,223,215,207],
                                [230,222,214,206],
                                [229,221,213,205],
                                [228,220,212,204],
                                [227,219,211,203],
                                [226,218,210,202],
                                [225,217,209,201],
                              ];

                              return (
                                <div className="grid grid-cols-4 gap-2">
                                  {rows.map((row, ri) => (
                                    <React.Fragment key={`a2-row-${ri}`}>
                                      {row.map((n, ci) => {
                                        const r = byNum[n];
                                        if (!r) {
                                          return (
                                            <div key={`a2-placeholder-${n}`} className="border border-gray-200 rounded-md p-2 bg-gray-50 opacity-60">
                                              <div className="flex items-center justify-between">
                                                <div className="text-[11px] font-mono text-gray-400 font-semibold">{n}</div>
                                                <span className="w-3 h-3 rounded-full bg-gray-300"></span>
                                              </div>
                                              <div className="mt-1 text-[11px] text-gray-400 truncate">Row: A-{n}</div>
                                              <div className="mt-0.5 text-[11px] text-gray-400 truncate">&nbsp;</div>
                                            </div>
                                          );
                                        }
                                        const key = r.id;
                                        const st = r.status && STATUS_COLORS[r.status] ? r.status : 'Default';
                                        const bg = STATUS_COLORS[st] || STATUS_COLORS.Default;
                                        const occupant = [r.first_name, r.last_name].filter(Boolean).join(' ') || r.family_name || '';
                                        const tip = `A-2 • Plot ${r.plot_number} • Row ${r.row_number || '-' } • ${r.status || 'Unknown'}${occupant ? ' • ' + occupant : ''}`;
                                        return (
                                          <div key={key} title={tip} className="border border-gray-200 rounded-md p-2 bg-gray-50 hover:bg-gray-100 transition cursor-pointer" onClick={() => handleClick(r) }>
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
                              );
                            })()}
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
                                [131,123,115,107],
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
                                      <React.Fragment key={`a1-row-${ri}`}>
                                        {row.map((n, ci) => {
                                          const r = byNum[n];
                                          if (!r) {
                                            return (
                                              <div key={`placeholder-${n}`} className="border border-gray-200 rounded-md p-2 bg-gray-50 opacity-60">
                                                <div className="flex items-center justify-between">
                                                  <div className="text-[11px] font-mono text-gray-400 font-semibold">{n}</div>
                                                  <span className="w-3 h-3 rounded-full bg-gray-300"></span>
                                                </div>
                                                <div className="mt-1 text-[11px] text-gray-400 truncate">Row: A-{n}</div>
                                                <div className="mt-0.5 text-[11px] text-gray-400 truncate">&nbsp;</div>
                                              </div>
                                            );
                                          }
                                          const key = r.id;
                                          const st = r.status && STATUS_COLORS[r.status] ? r.status : 'Default';
                                          const bg = STATUS_COLORS[st] || STATUS_COLORS.Default;
                                          const occupant = [r.first_name, r.last_name].filter(Boolean).join(' ') || r.family_name || '';
                                          const tip = `A-1 • Plot ${r.plot_number} • Row ${r.row_number || '-' } • ${r.status || 'Unknown'}${occupant ? ' • ' + occupant : ''}`;
                                          return (
                                            <div key={key} title={tip} className="border border-gray-200 rounded-md p-2 bg-gray-50 hover:bg-gray-100 transition cursor-pointer" onClick={() => handleClick(r) }>
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
                    {(() => {
                      const items = grouped[section] || [];
                      const showAll = !!expandedSections[section];
                      const visible = showAll ? items : items.slice(0, 96);
                      return (
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                            {visible.map((r) => {
                              const key = r.id;
                              const st = r.status && STATUS_COLORS[r.status] ? r.status : "Default";
                              const bg = STATUS_COLORS[st] || STATUS_COLORS.Default;
                              return (
                                <div key={key} className="border border-gray-200 rounded-md p-2 bg-gray-50 hover:bg-gray-100 transition cursor-pointer" onClick={() => handleClick(r) }>
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
                          {!showAll && items.length > 96 && (
                            <div className="mt-3">
                              <button
                                type="button"
                                onClick={() => setExpandedSections(prev => ({ ...prev, [section]: true }))}
                                className="text-sm text-teal-700 hover:underline"
                              >
                                Show more ({items.length - 96} more)
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                );
              })
            )}
            </div>
          </ZoomPan>
        </>
      )}
    </div>
  );
}