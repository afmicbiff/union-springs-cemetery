import React, { memo, useMemo } from "react";
import GravePlotCell from "./GravePlotCell";

// Helper to extract the first integer from a string like "228-A"
function parseNum(v) {
  const m = String(v || "").match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

const Section2DnDGrid = memo(function Section2DnDGrid({ plots = [], baseColorClass = "", isAdmin = false, onHover, onEdit, statusColors }) {
  const perCol = 25;
  const extraBottomRow = 1; // Extra row for +New under specific plots
  const totalRows = perCol + extraBottomRow;
  const dataCols = 10;
  
  // Plots that should have +New button below them
  const newPlotTargets = new Set([186, 199, 217, 236, 248, 271, 309, 391, 477, 595]);

  const { cells, bottomRowMarkers } = React.useMemo(() => {
    const sorted = [...(plots || [])].sort((a, b) => (parseNum(a.Grave) || 0) - (parseNum(b.Grave) || 0));
    const idx186 = sorted.findIndex(p => parseNum(p.Grave) === 186);
    const pivoted = idx186 > -1 ? [...sorted.slice(idx186), ...sorted.slice(0, idx186)] : sorted;

    const baseColumns = Array.from({ length: dataCols }, () => Array(perCol).fill(null));

    let i = 0;
    for (let c = 0; c < dataCols && i < pivoted.length; c++) {
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
      for (let c = 0; c < dataCols; c++) {
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

      let anchorIdx = baseColumns.findIndex((col) => col.some((cell) => parseNum(cell?.Grave) === anchorNum));
      if (anchorIdx < 0) anchorIdx = 0;
      const targetIdx = Math.min(anchorIdx + 1, dataCols - 1);

      for (let r = 0; r < perCol; r++) {
        if (seqCol[r]) baseColumns[targetIdx][r] = seqCol[r];
      }
    }

    // Build output - just data columns, no spacers
    const out = Array(dataCols * totalRows).fill(null);
    const markers = Array(dataCols).fill(false);
    
    for (let c = 0; c < dataCols; c++) {
      // Check if bottom plot (row 0) is a target for +New
      const bottomPlot = baseColumns[c][0];
      const bottomNum = parseNum(bottomPlot?.Grave);
      if (bottomNum && newPlotTargets.has(bottomNum)) {
        markers[c] = true;
      }
      
      // Fill data rows (rows 1 to perCol)
      for (let r = 0; r < perCol; r++) {
        out[c * totalRows + r + extraBottomRow] = baseColumns[c][r];
      }
      // Row 0 is the extra bottom row - leave as null, will render +New if markers[c]
    }
    
    return { cells: out, bottomRowMarkers: markers };
  }, [plots, dataCols, perCol, totalRows, extraBottomRow, newPlotTargets]);

  return (
    <div className="flex flex-col items-stretch overflow-x-auto pb-2">
      <div className="grid grid-flow-col gap-2 sm:gap-3" style={{ gridTemplateRows: `repeat(${totalRows}, minmax(0, 1fr))`, gridTemplateColumns: `repeat(${dataCols}, max-content)`, gridAutoColumns: 'max-content' }}>
        {cells.map((item, idx) => {
          const col = Math.floor(idx / totalRows);
          const row = idx % totalRows;
          const isBottomRow = row === 0;
          const showNewPlot = isBottomRow && bottomRowMarkers[col];
          
          return (
            <div key={idx} className={`relative transition-opacity ${baseColorClass} opacity-90 hover:opacity-100 border rounded-[1px] w-16 h-8 m-0.5`}>
              {showNewPlot ? (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-teal-600 font-medium cursor-pointer hover:bg-teal-50">
                  + New
                </div>
              ) : (
                <GravePlotCell
                  item={item}
                  baseColorClass=""
                  statusColors={statusColors}
                  isAdmin={isAdmin}
                  onHover={onHover}
                  onEdit={onEdit}
                  sectionKey="2"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default Section2DnDGrid;