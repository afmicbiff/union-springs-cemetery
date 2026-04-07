import React, { memo, useMemo } from "react";
import ExcelGridCell from "./ExcelGridCell";

/**
 * EXCEL-FAITHFUL CEMETERY GRID
 * 
 * Mirrors the uploaded spreadsheet exactly:
 * 
 * Structure:
 * - 9 cemetery columns, each with LEFT and RIGHT sub-columns
 * - Columns 1-4: Only rows A through E (Section 1)
 * - Columns 5-9: Rows A through U
 *   - Rows A-Q: Sections 2/3/4 (plots 185-963)
 *   - Rows R-U: Section 5 (plots 1001-1100) — cols 5-8 only
 *   - Column 9 starts at row Q for sections 2-4
 * 
 * Row A at bottom, Row U at top
 * NORTH at top, SOUTH at bottom
 */

const ALL_ROWS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U'];
const SECTION1_ROWS = ['A','B','C','D','E']; // Columns 1-4
const SECTION1_COLS = [1,2,3,4];
const ALL_COLS = [1,2,3,4,5,6,7,8,9];

// How many visual sub-rows per letter row in the spreadsheet
// Most rows have 2 sub-rows (left pair = top, right pair = bottom within that row)
// But some (like U, T, S, R, Q) have more due to Section 5 stacking

export default memo(function ExcelGrid({ plots, isAdmin, onHover, onEdit }) {
  
  // Build lookup: "plotNumber" -> plot data for quick matching
  const plotsByRowCol = useMemo(() => {
    const map = new Map(); // "A-1" -> [plots sorted by plot_number desc]
    
    for (const p of (plots || [])) {
      const rowNum = p.Row || p.row_number || '';
      const match = rowNum.match(/^([A-U])\s*-\s*(\d+)$/i);
      if (!match) continue;
      const key = `${match[1].toUpperCase()}-${match[2]}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    }
    
    // Sort: higher plot number first (left sub-col), lower second (right sub-col)
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

  // Check if a column has data for a given row
  const hasDataForRow = (colNum, rowLetter) => {
    if (colNum <= 4) {
      return SECTION1_ROWS.includes(rowLetter);
    }
    return true; // Columns 5-9 span all rows
  };

  if (!plots || plots.length === 0) {
    return <div className="text-gray-400 text-center py-12">No plot data loaded</div>;
  }

  // Render rows from top (U) to bottom (A)
  const rowsTopToBottom = [...ALL_ROWS].reverse();

  return (
    <div className="inline-block select-none" style={{ minWidth: '1300px' }}>
      {/* NORTH label */}
      <div className="text-center mb-2">
        <span className="text-sm font-bold text-stone-600 tracking-[0.3em] uppercase">↑ NORTH ↑</span>
      </div>

      {/* Column number headers */}
      <div className="flex items-end mb-1">
        <div className="w-7 shrink-0" /> {/* row label spacer */}
        {ALL_COLS.map(col => (
          <div key={col} className="text-center" style={{ width: col <= 4 ? '130px' : '140px' }}>
            <span className="text-[10px] font-bold text-gray-500">{col}</span>
          </div>
        ))}
        <div className="w-7 shrink-0" />
      </div>

      {/* Main grid */}
      <div className="border border-gray-400 rounded overflow-hidden bg-white">
        {rowsTopToBottom.map((rowLetter) => {
          const isSection1Row = SECTION1_ROWS.includes(rowLetter);
          // Section divider between Q and R (gap in spreadsheet)
          const showDivider = rowLetter === 'Q';
          
          return (
            <React.Fragment key={rowLetter}>
              {showDivider && (
                <div className="h-4 bg-stone-200 border-y border-stone-300 flex items-center justify-center">
                  <span className="text-[8px] text-stone-500 font-bold tracking-wider">— GAP —</span>
                </div>
              )}
              <div className="flex items-stretch border-b border-gray-200 last:border-b-0">
                {/* Left row label */}
                <div className="w-7 shrink-0 flex items-center justify-center bg-stone-100 border-r border-gray-300">
                  <span className="text-[11px] font-bold text-stone-700">{rowLetter}</span>
                </div>

                {/* Columns 1-4 (Section 1) */}
                {SECTION1_COLS.map(col => {
                  const cell = getCell(rowLetter, col);
                  const hasData = hasDataForRow(col, rowLetter);
                  const isLastS1 = col === 4;
                  
                  return (
                    <div
                      key={col}
                      className={`flex ${isLastS1 ? 'border-r-2 border-r-stone-500' : 'border-r border-gray-200'} ${
                        hasData ? 'bg-blue-50/60' : 'bg-stone-100/40'
                      }`}
                      style={{ width: '130px', minHeight: '36px' }}
                    >
                      {hasData ? (
                        <>
                          <ExcelGridCell item={cell.left} isAdmin={isAdmin} onHover={onHover} onEdit={onEdit} />
                          <ExcelGridCell item={cell.right} isAdmin={isAdmin} onHover={onHover} onEdit={onEdit} />
                        </>
                      ) : (
                        <div className="w-full" />
                      )}
                    </div>
                  );
                })}

                {/* Columns 5-9 (Sections 2-5) */}
                {[5,6,7,8,9].map(col => {
                  const cell = getCell(rowLetter, col);
                  const isSection5 = ['R','S','T','U'].includes(rowLetter) && col >= 5 && col <= 8;
                  const bgClass = isSection5 ? 'bg-purple-50/50' : 'bg-green-50/50';
                  
                  // Check for MOW LANE (row A, cols 5+)
                  const isMowLane = rowLetter === 'A' && col >= 5 && !cell.left && !cell.right;
                  
                  return (
                    <div
                      key={col}
                      className={`flex ${bgClass} border-r border-gray-200 last:border-r-0`}
                      style={{ width: '140px', minHeight: '36px' }}
                    >
                      {isMowLane ? (
                        <div className="w-full flex items-center justify-center">
                          <span className="text-[8px] font-bold text-amber-600 tracking-wider uppercase">Mow Lane</span>
                        </div>
                      ) : (
                        <>
                          <ExcelGridCell item={cell.left} isAdmin={isAdmin} onHover={onHover} onEdit={onEdit} />
                          <ExcelGridCell item={cell.right} isAdmin={isAdmin} onHover={onHover} onEdit={onEdit} />
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

      {/* Column numbers at bottom */}
      <div className="flex items-start mt-1">
        <div className="w-7 shrink-0" />
        {ALL_COLS.map(col => (
          <div key={col} className="text-center" style={{ width: col <= 4 ? '130px' : '140px' }}>
            <span className="text-[10px] font-bold text-gray-500">{col}</span>
          </div>
        ))}
        <div className="w-7 shrink-0" />
      </div>

      {/* SOUTH label */}
      <div className="text-center mt-2">
        <span className="text-sm font-bold text-stone-600 tracking-[0.3em] uppercase">↓ SOUTH ↓</span>
      </div>

      {/* Section labels */}
      <div className="flex mt-3 gap-1">
        <div className="w-7 shrink-0" />
        <div className="bg-blue-100 border border-blue-200 rounded px-2 py-1 text-[10px] font-bold text-blue-800 text-center" style={{ width: '520px' }}>
          Section 1 — Cols 1-4, Rows A-E
        </div>
        <div className="bg-green-100 border border-green-200 rounded px-2 py-1 text-[10px] font-bold text-green-800 text-center" style={{ width: '700px' }}>
          Sections 2/3/4 — Cols 5-9, Rows A-Q
        </div>
      </div>
      <div className="flex mt-1 gap-1">
        <div className="w-7 shrink-0" />
        <div style={{ width: '520px' }} />
        <div className="bg-purple-100 border border-purple-200 rounded px-2 py-1 text-[10px] font-bold text-purple-800 text-center" style={{ width: '560px' }}>
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