import React, { memo, useMemo } from "react";
import ExcelGridCell from "./ExcelGridCell";

/**
 * EXCEL-FAITHFUL CEMETERY GRID
 * 
 * Mirrors the spreadsheet layout exactly:
 * - Rows: A (bottom) through U (top) — 21 lettered rows
 * - Columns: 1 through 9, each column = 2 sub-columns (left & right)
 * - Section 1: Cols 1-4, plots 1-184
 * - Section 2/3/4: Cols 5-9, plots 185-963 
 * - Section 5: Cols 5-8, rows R-U only, plots 1001-1100
 * - A-1 is at the bottom-left corner
 */

const ROW_LETTERS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U'];
const COL_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// Section colors by column number
const SECTION_STYLES = {
  1: { bg: 'bg-blue-50', border: 'border-blue-200', label: 'Section 1' },
  2: { bg: 'bg-blue-50', border: 'border-blue-200', label: 'Section 1' },
  3: { bg: 'bg-blue-50', border: 'border-blue-200', label: 'Section 1' },
  4: { bg: 'bg-blue-50', border: 'border-blue-200', label: 'Section 1' },
  5: { bg: 'bg-green-50', border: 'border-green-200', label: 'Section 2' },
  6: { bg: 'bg-green-50', border: 'border-green-200', label: 'Section 2' },
  7: { bg: 'bg-green-50', border: 'border-green-200', label: 'Section 2' },
  8: { bg: 'bg-green-50', border: 'border-green-200', label: 'Section 2' },
  9: { bg: 'bg-green-50', border: 'border-green-200', label: 'Section 2' },
};

export default memo(function ExcelGrid({ plots, isAdmin, onHover, onEdit }) {
  
  // Build grid: group plots by row_number (e.g. "A-1" -> [plot1, plot2])
  const { grid, unplacedPlots } = useMemo(() => {
    const byPosition = new Map(); // "A-1" -> [plots sorted by plot_number]
    const unplaced = [];
    
    for (const p of (plots || [])) {
      const rowNum = p.Row || p.row_number || '';
      const match = rowNum.match(/^([A-Z])\s*-\s*(\d+)$/i);
      if (!match) {
        unplaced.push(p);
        continue;
      }
      const key = `${match[1].toUpperCase()}-${match[2]}`;
      if (!byPosition.has(key)) byPosition.set(key, []);
      byPosition.get(key).push(p);
    }
    
    // Sort each position's plots by plot number (lower number = left sub-col)
    for (const [, arr] of byPosition) {
      arr.sort((a, b) => {
        const na = parseInt(String(a.Grave || a.plot_number || '').replace(/\D/g, '')) || 0;
        const nb = parseInt(String(b.Grave || b.plot_number || '').replace(/\D/g, '')) || 0;
        return na - nb;
      });
    }
    
    // Build 2D grid: grid[rowLetterIdx][colNumIdx] = { left, right }
    const g = [];
    for (let ri = 0; ri < ROW_LETTERS.length; ri++) {
      const row = [];
      for (let ci = 0; ci < COL_NUMBERS.length; ci++) {
        const key = `${ROW_LETTERS[ri]}-${COL_NUMBERS[ci]}`;
        const arr = byPosition.get(key) || [];
        row.push({ left: arr[0] || null, right: arr[1] || null });
      }
      g.push(row);
    }
    
    return { grid: g, unplacedPlots: unplaced };
  }, [plots]);

  if (!plots || plots.length === 0) {
    return <div className="text-gray-400 text-center py-12">No plot data loaded</div>;
  }

  return (
    <div className="inline-block">
      {/* "NORTH" label at top */}
      <div className="text-center mb-2">
        <span className="text-sm font-bold text-stone-500 tracking-[0.3em] uppercase">↑ North</span>
      </div>

      {/* Column headers */}
      <div className="flex items-end mb-1">
        <div className="w-7 shrink-0" />
        {COL_NUMBERS.map((colNum) => {
          const style = SECTION_STYLES[colNum];
          return (
            <div key={colNum} className="flex flex-col items-center" style={{ width: '132px' }}>
              <span className="text-[10px] text-gray-400 font-medium">{style.label}</span>
              <span className="text-xs font-bold text-gray-600">Col {colNum}</span>
            </div>
          );
        })}
        <div className="w-7 shrink-0" />
      </div>

      {/* Grid: render rows from TOP (U) to BOTTOM (A) */}
      <div className="border border-gray-300 rounded-md overflow-hidden">
        {[...Array(ROW_LETTERS.length)].map((_, reverseIdx) => {
          const rowIdx = ROW_LETTERS.length - 1 - reverseIdx;
          const rowLetter = ROW_LETTERS[rowIdx];

          return (
            <div key={rowLetter} className="flex items-stretch border-b border-gray-200 last:border-b-0">
              {/* Left row label */}
              <div className="w-7 shrink-0 flex items-center justify-center bg-stone-100 border-r border-gray-300">
                <span className="text-[11px] font-bold text-stone-600">{rowLetter}</span>
              </div>

              {/* Cells for each column */}
              {COL_NUMBERS.map((colNum, colIdx) => {
                const cell = grid[rowIdx]?.[colIdx];
                const style = SECTION_STYLES[colNum];
                const isSection1 = colNum <= 4;
                const isLastS1Col = colNum === 4;

                return (
                  <div
                    key={colNum}
                    className={`flex ${style.bg} ${isLastS1Col ? 'border-r-2 border-r-stone-400' : 'border-r border-gray-200'}`}
                    style={{ width: '132px' }}
                  >
                    <ExcelGridCell
                      item={cell?.left}
                      isAdmin={isAdmin}
                      onHover={onHover}
                      onEdit={onEdit}
                    />
                    <ExcelGridCell
                      item={cell?.right}
                      isAdmin={isAdmin}
                      onHover={onHover}
                      onEdit={onEdit}
                    />
                  </div>
                );
              })}

              {/* Right row label */}
              <div className="w-7 shrink-0 flex items-center justify-center bg-stone-100 border-l border-gray-300">
                <span className="text-[11px] font-bold text-stone-600">{rowLetter}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Section labels at bottom */}
      <div className="flex mt-2">
        <div className="w-7 shrink-0" />
        <div className="flex">
          <div className="bg-blue-100 border border-blue-300 rounded px-3 py-1 text-xs font-bold text-blue-800" style={{ width: '528px' }}>
            ← Section 1 (Cols 1-4) →
          </div>
          <div className="bg-green-100 border border-green-300 rounded px-3 py-1 text-xs font-bold text-green-800 ml-1" style={{ width: '660px' }}>
            ← Section 2/3/4/5 (Cols 5-9) →
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <span className="text-[10px] text-gray-400 font-bold uppercase">Legend:</span>
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

      {/* Unplaced plots indicator */}
      {unplacedPlots.length > 0 && (
        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
          {unplacedPlots.length} plot(s) without valid row assignment (no row_number like "A-1")
        </div>
      )}
    </div>
  );
});