import React, { memo, useMemo } from "react";
import ExcelGridCell from "./ExcelGridCell";

/**
 * EXCEL-FAITHFUL CEMETERY GRID
 * 
 * Mirrors the uploaded spreadsheet layout exactly:
 * - Rows: A (bottom) through U (top) — 21 lettered rows
 * - Columns: 1 through 9
 * - Each column has 2 sub-columns (left plot, right plot)
 * - Section 1: Cols 1-4 (plots 1-184)
 * - Sections 2-4: Cols 5-9 (plots 185-963+)
 * - Section 5: Cols 5-8, rows R-U only (plots 1001-1100)
 * - Row A bottom, Row U top
 * - NORTH at top, SOUTH at bottom, WEST left, EAST right
 * 
 * The spreadsheet columns map to:
 *   col_2/col_3   = Column 1 (left/right)
 *   col_4/col_5   = Column 2
 *   col_6/col_7   = Column 3
 *   col_8/col_9   = Column 4 (col_9 also has row letters)
 *   col_10/col_11 = Column 5
 *   col_12/col_13 = Column 6
 *   col_14/col_15 = Column 7
 *   col_16/col_17 = Column 8
 *   col_18/col_19 = Column 9
 */

const ROW_LETTERS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U'];
const COL_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// Section 5 occupies cols 5-8 for rows R-U
const SECTION5_ROWS = new Set(['R', 'S', 'T', 'U']);
const SECTION5_COLS = new Set([5, 6, 7, 8]);

function getSectionLabel(colNum, rowLetter) {
  if (SECTION5_ROWS.has(rowLetter) && SECTION5_COLS.has(colNum)) return '5';
  if (colNum <= 4) return '1';
  if (colNum <= 6) return '2-3';
  if (colNum <= 8) return '3-4';
  return '4';
}

function getSectionColor(colNum, rowLetter) {
  if (SECTION5_ROWS.has(rowLetter) && SECTION5_COLS.has(colNum)) return 'bg-purple-50';
  if (colNum <= 4) return 'bg-blue-50';
  return 'bg-green-50';
}

export default memo(function ExcelGrid({ plots, isAdmin, onHover, onEdit }) {
  
  // Build lookup: key = "RowLetter-ColNumber" -> [leftPlot, rightPlot]
  const { grid, unplacedCount } = useMemo(() => {
    const byPosition = new Map(); // "A-1" -> [plots]
    let unplaced = 0;
    
    for (const p of (plots || [])) {
      const rowNum = p.Row || p.row_number || '';
      // Match patterns like "A-1", "E-2", "Q-7"
      const match = rowNum.match(/^([A-U])\s*-\s*(\d+)$/i);
      if (!match) {
        unplaced++;
        continue;
      }
      const key = `${match[1].toUpperCase()}-${match[2]}`;
      if (!byPosition.has(key)) byPosition.set(key, []);
      byPosition.get(key).push(p);
    }
    
    // Sort each position's plots by plot number
    // In the spreadsheet, left sub-col has HIGHER plot number, right has LOWER
    // Actually looking at the data: left col has even-positioned, right has odd
    // Let's sort ascending and put first=left, second=right
    for (const [, arr] of byPosition) {
      arr.sort((a, b) => {
        const na = parseInt(String(a.Grave || a.plot_number || '').replace(/\D/g, '')) || 0;
        const nb = parseInt(String(b.Grave || b.plot_number || '').replace(/\D/g, '')) || 0;
        return nb - na; // higher number first (left), lower number second (right)
      });
    }
    
    // Build 2D grid: grid[rowIdx][colIdx] = { left, right }
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
    
    return { grid: g, unplacedCount: unplaced };
  }, [plots]);

  if (!plots || plots.length === 0) {
    return <div className="text-gray-400 text-center py-12">No plot data loaded</div>;
  }

  // Render rows from TOP (U, index 20) to BOTTOM (A, index 0)
  const rowsTopToBottom = [];
  for (let i = ROW_LETTERS.length - 1; i >= 0; i--) {
    rowsTopToBottom.push({ letter: ROW_LETTERS[i], idx: i });
  }

  return (
    <div className="inline-block select-none">
      {/* NORTH label */}
      <div className="text-center mb-3">
        <span className="text-sm font-bold text-stone-500 tracking-[0.3em] uppercase">↑ North ↑</span>
      </div>

      {/* Column headers */}
      <div className="flex items-end mb-1">
        {/* Left row-label spacer */}
        <div className="w-8 shrink-0" />
        {COL_NUMBERS.map((colNum) => (
          <div key={colNum} className="flex flex-col items-center" style={{ width: '140px' }}>
            <span className="text-xs font-bold text-gray-600">{colNum}</span>
          </div>
        ))}
        {/* Right row-label spacer */}
        <div className="w-8 shrink-0" />
      </div>

      {/* WEST / EAST labels row */}
      <div className="flex items-center mb-1">
        <div className="w-8 shrink-0 text-center">
          <span className="text-[9px] font-bold text-stone-400 tracking-wider">W</span>
        </div>
        <div style={{ width: `${COL_NUMBERS.length * 140}px` }} />
        <div className="w-8 shrink-0 text-center">
          <span className="text-[9px] font-bold text-stone-400 tracking-wider">E</span>
        </div>
      </div>

      {/* Grid body */}
      <div className="border border-gray-300 rounded-md overflow-hidden">
        {rowsTopToBottom.map(({ letter, idx }) => (
          <div key={letter} className="flex items-stretch border-b border-gray-200 last:border-b-0">
            {/* Left row label */}
            <div className="w-8 shrink-0 flex items-center justify-center bg-stone-100 border-r border-gray-300">
              <span className="text-[11px] font-bold text-stone-700">{letter}</span>
            </div>

            {/* Cells for each column */}
            {COL_NUMBERS.map((colNum, colIdx) => {
              const cell = grid[idx]?.[colIdx];
              const bgColor = getSectionColor(colNum, letter);
              const isLastSection1Col = colNum === 4;
              
              // Show MOW LANE indicator for row A columns 5-9 bottom
              const isMowLane = letter === 'A' && colNum >= 5;

              return (
                <div
                  key={colNum}
                  className={`flex ${bgColor} ${isLastSection1Col ? 'border-r-2 border-r-stone-500' : 'border-r border-gray-200'}`}
                  style={{ width: '140px', minHeight: '38px' }}
                >
                  {isMowLane && !cell?.left && !cell?.right ? (
                    <div className="w-full flex items-center justify-center">
                      <span className="text-[8px] font-bold text-amber-600 tracking-wider">MOW LANE</span>
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              );
            })}

            {/* Right row label */}
            <div className="w-8 shrink-0 flex items-center justify-center bg-stone-100 border-l border-gray-300">
              <span className="text-[11px] font-bold text-stone-700">{letter}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Column numbers at bottom */}
      <div className="flex items-start mt-1">
        <div className="w-8 shrink-0" />
        {COL_NUMBERS.map((colNum) => (
          <div key={colNum} className="flex flex-col items-center" style={{ width: '140px' }}>
            <span className="text-xs font-bold text-gray-600">{colNum}</span>
          </div>
        ))}
        <div className="w-8 shrink-0" />
      </div>

      {/* SOUTH label */}
      <div className="text-center mt-3">
        <span className="text-sm font-bold text-stone-500 tracking-[0.3em] uppercase">↓ South ↓</span>
      </div>

      {/* Section labels */}
      <div className="flex mt-3 gap-1">
        <div className="w-8 shrink-0" />
        <div className="bg-blue-100 border border-blue-300 rounded px-3 py-1 text-xs font-bold text-blue-800 text-center" style={{ width: '560px' }}>
          ← Section 1 (Cols 1-4) →
        </div>
        <div className="bg-green-100 border border-green-300 rounded px-3 py-1 text-xs font-bold text-green-800 text-center" style={{ width: '700px' }}>
          ← Sections 2/3/4 (Cols 5-9) →
        </div>
      </div>
      <div className="flex mt-1 gap-1">
        <div className="w-8 shrink-0" />
        <div style={{ width: '560px' }} />
        <div className="bg-purple-100 border border-purple-300 rounded px-3 py-1 text-xs font-bold text-purple-800 text-center" style={{ width: '560px' }}>
          Section 5 (Cols 5-8, Rows R-U) — plots 1001-1100
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-4 flex-wrap">
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
      {unplacedCount > 0 && (
        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
          {unplacedCount} plot(s) without valid row assignment (expected format: "A-1" through "U-9")
        </div>
      )}
    </div>
  );
});