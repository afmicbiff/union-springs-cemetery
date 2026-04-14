import React, { memo, useMemo } from "react";
import OldPlotCell from "./OldPlotCell";

/**
 * Old Cemetery Plot Grid
 * 
 * Mirrors the uploaded spreadsheet layout:
 * - 9 cemetery columns, each with LEFT and RIGHT sub-columns
 * - Columns 1-4: Only rows A through E (Section 1)
 * - Columns 5-9: Rows A through U (Sections 2-5)
 *   - Rows R-U: Section 5 (plots 1001-1100, cols 5-8 only)
 * - Row A at bottom, Row U at top
 */

const ALL_ROWS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U'];
const SECTION1_ROWS = new Set(['A','B','C','D','E']);
const SECTION5_ROWS = new Set(['R','S','T','U']);
const ALL_COLS = [1,2,3,4,5,6,7,8,9];

export default memo(function OldPlotGrid({ plots, isAdmin, onHover, onEdit }) {
  // Build lookup: "RowLetter-ColNum" -> [plots sorted by plot_number desc]
  const plotsByRowCol = useMemo(() => {
    const map = new Map();
    for (const p of (plots || [])) {
      const rowNum = p.Row || p.row_number || '';
      const match = rowNum.match(/^([A-U])\s*-\s*(\d+)$/i);
      if (!match) continue;
      const key = `${match[1].toUpperCase()}-${match[2]}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => {
        const na = parseInt(String(a.Grave || a.plot_number || '').replace(/\D/g, '')) || 0;
        const nb = parseInt(String(b.Grave || b.plot_number || '').replace(/\D/g, '')) || 0;
        return nb - na;
      });
    }
    return map;
  }, [plots]);

  const getCell = (rowLetter, colNum) => {
    const key = `${rowLetter}-${colNum}`;
    const arr = plotsByRowCol.get(key) || [];
    return { left: arr[0] || null, right: arr[1] || null };
  };

  const rowsTopToBottom = useMemo(() => [...ALL_ROWS].reverse(), []);

  if (!plots || plots.length === 0) {
    return <div className="text-gray-400 text-center py-12">No plot data loaded</div>;
  }

  return (
    <div className="inline-block select-none" style={{ minWidth: '1350px' }}>
      {/* NORTH */}
      <div className="text-center mb-2">
        <span className="text-sm font-bold text-stone-600 tracking-[0.3em] uppercase">↑ NORTH ↑</span>
      </div>

      {/* Column headers */}
      <div className="flex items-end mb-1">
        <div className="w-7 shrink-0" />
        {ALL_COLS.map(col => (
          <div key={col} className="text-center" style={{ width: col <= 4 ? '136px' : '142px' }}>
            <span className="text-[10px] font-bold text-gray-500">Col {col}</span>
          </div>
        ))}
        <div className="w-7 shrink-0" />
      </div>

      {/* Grid body */}
      <div className="border border-gray-400 rounded overflow-hidden bg-white">
        {rowsTopToBottom.map((rowLetter) => {
          const showGap = rowLetter === 'Q';
          const isS1 = SECTION1_ROWS.has(rowLetter);
          const isS5 = SECTION5_ROWS.has(rowLetter);

          return (
            <React.Fragment key={rowLetter}>
              {showGap && (
                <div className="h-5 bg-stone-200 border-y border-stone-300 flex items-center justify-center">
                  <span className="text-[9px] text-stone-500 font-bold tracking-wider uppercase">Section 5 ↑ / Sections 2-4 ↓</span>
                </div>
              )}
              <div className="flex items-stretch border-b border-gray-200 last:border-b-0">
                {/* Left row label */}
                <div className="w-7 shrink-0 flex items-center justify-center bg-stone-100 border-r border-gray-300">
                  <span className="text-[11px] font-bold text-stone-700">{rowLetter}</span>
                </div>

                {ALL_COLS.map(col => {
                  const cell = getCell(rowLetter, col);
                  const isSection1Col = col <= 4;
                  const hasData = isSection1Col ? isS1 : true;
                  const isS5Cell = isS5 && col >= 5 && col <= 8;
                  const isS5Col9 = isS5 && col === 9; // Col 9 doesn't extend to Section 5
                  const colWidth = isSection1Col ? '136px' : '142px';
                  const borderClass = col === 4 ? 'border-r-2 border-r-stone-500' : 'border-r border-gray-200';
                  
                  let bgClass = 'bg-white';
                  if (!hasData || isS5Col9) bgClass = 'bg-stone-100/60';
                  else if (isS5Cell) bgClass = 'bg-purple-50/60';
                  else if (isSection1Col) bgClass = 'bg-blue-50/40';
                  else bgClass = 'bg-green-50/40';

                  // MOW LANE: Row A, cols 5+ sometimes
                  const isMowLane = rowLetter === 'A' && !isSection1Col && !cell.left && !cell.right;

                  return (
                    <div key={col} className={`flex ${borderClass} ${bgClass}`} style={{ width: colWidth, minHeight: '38px' }}>
                      {!hasData || isS5Col9 ? (
                        <div className="w-full" />
                      ) : isMowLane ? (
                        <div className="w-full flex items-center justify-center">
                          <span className="text-[8px] font-bold text-amber-600 tracking-wider uppercase">Mow Lane</span>
                        </div>
                      ) : (
                        <>
                          <OldPlotCell item={cell.left} isAdmin={isAdmin} onHover={onHover} onEdit={onEdit} />
                          <OldPlotCell item={cell.right} isAdmin={isAdmin} onHover={onHover} onEdit={onEdit} />
                        </>
                      )}
                    </div>
                  );
                })}

                {/* Right row label */}
                <div className="w-7 shrink-0 flex items-center justify-center bg-stone-100 border-l border-gray-300">
                  <span className="text-[11px] font-bold text-stone-700">{rowLetter}</span>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Bottom column numbers */}
      <div className="flex items-start mt-1">
        <div className="w-7 shrink-0" />
        {ALL_COLS.map(col => (
          <div key={col} className="text-center" style={{ width: col <= 4 ? '136px' : '142px' }}>
            <span className="text-[10px] font-bold text-gray-500">Col {col}</span>
          </div>
        ))}
        <div className="w-7 shrink-0" />
      </div>

      {/* SOUTH */}
      <div className="text-center mt-2">
        <span className="text-sm font-bold text-stone-600 tracking-[0.3em] uppercase">↓ SOUTH ↓</span>
      </div>

      {/* Section labels */}
      <div className="flex mt-3 gap-1">
        <div className="w-7 shrink-0" />
        <div className="bg-blue-100 border border-blue-200 rounded px-2 py-1 text-[10px] font-bold text-blue-800 text-center" style={{ width: '544px' }}>
          Section 1 — Cols 1-4, Rows A-E
        </div>
        <div className="bg-green-100 border border-green-200 rounded px-2 py-1 text-[10px] font-bold text-green-800 text-center flex-1">
          Sections 2-4 — Cols 5-9, Rows A-Q
        </div>
      </div>
      <div className="flex mt-1 gap-1">
        <div className="w-7 shrink-0" />
        <div style={{ width: '544px' }} />
        <div className="bg-purple-100 border border-purple-200 rounded px-2 py-1 text-[10px] font-bold text-purple-800 text-center" style={{ width: '568px' }}>
          Section 5 — Cols 5-8, Rows R-U (Plots 1001-1100)
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-4 flex-wrap">
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Legend:</span>
        {[
          ['bg-green-500', 'Available'],
          ['bg-yellow-400', 'Reserved'],
          ['bg-red-500', 'Occupied'],
          ['bg-blue-600', 'Veteran'],
          ['bg-gray-500', 'Unavailable'],
          ['bg-purple-500', 'Unknown'],
          ['bg-gray-400', 'Not Usable'],
        ].map(([bg, label]) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-full ${bg}`} />
            <span className="text-[10px] text-gray-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
});