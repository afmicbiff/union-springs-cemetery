import React, { memo, useMemo } from "react";
import GravePlotCell from "./GravePlotCell";

// Helper to extract the first integer from a string like "228-A"
function parseNum(v) {
  const m = String(v || "").match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

// Plots that should have +New button below them - defined outside component for stable reference
const NEW_PLOT_TARGETS = new Set([186, 217, 236, 248, 271, 309, 391, 477, 595]);

// Special column for plots 186-207 (inserted as column 1, after 199's original position)
const SPECIAL_COL_RANGE = { start: 186, end: 207 };

const Section2DnDGrid = memo(function Section2DnDGrid({ plots = [], baseColorClass = "", isAdmin = false, onHover, onEdit, statusColors }) {
  const perCol = 25;
  const extraBottomRow = 1; // Extra row for +New under specific plots
  const totalRows = perCol + extraBottomRow;
  const dataCols = 11; // Increased to 11 to add the special column

  const { cells, bottomRowMarkers } = React.useMemo(() => {
    const sorted = [...(plots || [])].sort((a, b) => (parseNum(a.Grave) || 0) - (parseNum(b.Grave) || 0));
    
    // Separate special range plots (186-207) from regular plots
    const specialPlots = sorted.filter(p => {
      const n = parseNum(p.Grave);
      return n >= SPECIAL_COL_RANGE.start && n <= SPECIAL_COL_RANGE.end;
    });
    const regularPlots = sorted.filter(p => {
      const n = parseNum(p.Grave);
      return n < SPECIAL_COL_RANGE.start || n > SPECIAL_COL_RANGE.end;
    });
    
    // For regular plots, pivot starting from 199 (which now starts column 0)
    const idx199 = regularPlots.findIndex(p => parseNum(p.Grave) === 208); // Start from 208 since 186-207 are special
    const pivoted = idx199 > -1 ? [...regularPlots.slice(idx199), ...regularPlots.slice(0, idx199)] : regularPlots;

    // 11 columns: column 0 is special (186-207), columns 1-10 are regular
    const baseColumns = Array.from({ length: dataCols }, () => Array(perCol).fill(null));

    // Fill special column (column 0) with plots 186-207
    const specialSorted = specialPlots.sort((a, b) => (parseNum(a.Grave) || 0) - (parseNum(b.Grave) || 0));
    for (let i = 0; i < specialSorted.length && i < perCol; i++) {
      baseColumns[0][i] = specialSorted[i];
    }

    // Fill regular columns (1-10) with remaining plots
    let i = 0;
    for (let c = 1; c < dataCols && i < pivoted.length; c++) {
      for (let r = perCol - 1; r >= 0 && i < pivoted.length; r--) {
        baseColumns[c][r] = pivoted[i++];
      }
    }

    // Custom sequence 326–348
    const seqStart = 326;
    const seqEnd = 348;
    const anchorNum = 268;

    const byNum = new Map();
    pivoted.forEach((p) => {
      const n = parseNum(p?.Grave);
      if (n != null) byNum.set(n, p);
    });

    let hasAnySeq = false;
    for (let n = seqStart; n <= seqEnd; n++) { if (byNum.has(n)) { hasAnySeq = true; break; } }

    if (hasAnySeq) {
      for (let c = 1; c < dataCols; c++) { // Skip column 0 (special)
        for (let r = 0; r < perCol; r++) {
          const cell = baseColumns[c][r];
          const n = parseNum(cell?.Grave);
          if (n != null && n >= seqStart && n <= seqEnd) {
            baseColumns[c][r] = null;
          }
        }
      }

      const seqCol = Array(perCol).fill(null);
      let rPtr = perCol - 1;
      for (let n = seqStart; n <= seqEnd && rPtr >= 0; n++, rPtr--) {
        const p = byNum.get(n);
        if (p) seqCol[rPtr] = p;
      }

      let anchorIdx = baseColumns.findIndex((col, idx) => idx > 0 && col.some((cell) => parseNum(cell?.Grave) === anchorNum));
      if (anchorIdx < 1) anchorIdx = 1;
      const targetIdx = Math.min(anchorIdx + 1, dataCols - 1);

      for (let r = 0; r < perCol; r++) {
        if (seqCol[r]) baseColumns[targetIdx][r] = seqCol[r];
      }
    }

    // Build output - just data columns, no spacers
    const out = Array(dataCols * totalRows).fill(null);
    const markers = Array(dataCols).fill(false);
    
    for (let c = 0; c < dataCols; c++) {
      // Find the bottom-most plot in this column (lowest row index with data)
      let bottomPlot = null;
      for (let r = 0; r < perCol; r++) {
        if (baseColumns[c][r]) {
          bottomPlot = baseColumns[c][r];
          break;
        }
      }
      const bottomNum = parseNum(bottomPlot?.Grave);
      if (bottomNum && NEW_PLOT_TARGETS.has(bottomNum)) {
        markers[c] = true;
      }
      
      // Fill data rows (rows 1 to perCol)
      for (let r = 0; r < perCol; r++) {
        out[c * totalRows + r + extraBottomRow] = baseColumns[c][r];
      }
      // Row 0 is the extra bottom row - leave as null, will render +New if markers[c]
    }
    
    return { cells: out, bottomRowMarkers: markers };
  }, [plots, dataCols, perCol, totalRows, extraBottomRow]);

  // Render columns in reverse row order so +New appears at the bottom visually
  return (
    <div className="flex flex-col items-stretch overflow-x-auto pb-2">
      <div className="flex gap-2 sm:gap-3">
        {Array.from({ length: dataCols }).map((_, col) => (
          <div key={col} className="flex flex-col-reverse gap-0.5">
            {/* Bottom row for +New button */}
            <div className={`relative transition-opacity ${baseColorClass} opacity-90 hover:opacity-100 border rounded-[1px] w-16 h-8 m-0.5`}>
              {bottomRowMarkers[col] ? (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-teal-600 font-medium cursor-pointer hover:bg-teal-50 border border-dashed border-teal-300 rounded-[1px]">
                  + New
                </div>
              ) : (
                <div className="w-full h-full" />
              )}
            </div>
            {/* Data rows - render bottom to top */}
            {Array.from({ length: perCol }).map((_, row) => {
              const item = cells[col * totalRows + row + extraBottomRow];
              return (
                <div key={row} className={`relative transition-opacity ${baseColorClass} opacity-90 hover:opacity-100 border rounded-[1px] w-16 h-8 m-0.5`}>
                  <GravePlotCell
                    item={item}
                    baseColorClass=""
                    statusColors={statusColors}
                    isAdmin={isAdmin}
                    onHover={onHover}
                    onEdit={onEdit}
                    sectionKey="2"
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
});

export default Section2DnDGrid;