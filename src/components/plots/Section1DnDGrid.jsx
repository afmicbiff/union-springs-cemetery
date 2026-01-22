import React from "react";
import GravePlotCell from "./GravePlotCell";

function parseNum(g) {
  const n = parseInt(String(g || "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

export default function Section1DnDGrid({ plots, baseColorClass, isAdmin, onHover, onEdit, statusColors }) {
  const TARGET_HEIGHT = 12; // Target rows for uniform square border
  
  // Build grid dimensions from numeric graves
  const nums = React.useMemo(() => (
    (plots || [])
      .map((p) => parseNum(p.Grave))
      .filter((n) => Number.isFinite(n) && n > 0)
  ), [plots]);

  const maxNum = React.useMemo(() => (nums.length ? Math.max(...nums) : 0), [nums]);
  const dataCols = 8;
  const perCol = Math.max(1, Math.ceil(maxNum / dataCols));
  const targetRows = Math.max(perCol, TARGET_HEIGHT);
  const total = dataCols * targetRows;

  // Build cells layout with spacers for uniform height
  const cells = React.useMemo(() => {
    if (!plots || !plots.length) return Array(total).fill(null);

    const nextCells = Array(total).fill(null);

    for (let c = 0; c < dataCols; c++) {
      const start = c * perCol + 1;
      const end = Math.min((c + 1) * perCol, maxNum);
      const colPlots = plots
        .filter((p) => {
          const n = parseNum(p.Grave);
          return n && n >= start && n <= end;
        })
        .sort((a, b) => (parseNum(a.Grave) || 0) - (parseNum(b.Grave) || 0));

      // Place plots from bottom, leaving spacers at top
      const topPadding = targetRows - colPlots.length;
      colPlots.forEach((plot, idx) => {
        const row = topPadding + idx;
        if (row >= 0 && row < targetRows) {
          const cellIndex = c * targetRows + row;
          nextCells[cellIndex] = plot;
        }
      });
    }

    return nextCells;
  }, [plots, dataCols, perCol, maxNum, total, targetRows]);

  const renderCell = (c, r, isLeadOrTrail = false) => {
    const idx = isLeadOrTrail ? -1 : c * targetRows + r;
    const item = isLeadOrTrail ? null : cells[idx];

    return (
      <div key={`s1-c${c}-r${r}${isLeadOrTrail ? '-sp' : ''}`} className="w-16 h-8 m-0.5 rounded-[1px] relative">
        <GravePlotCell
          item={item}
          baseColorClass={baseColorClass}
          statusColors={statusColors}
          isAdmin={isAdmin}
          onHover={onHover}
          onEdit={onEdit}
          sectionKey="1"
        />
      </div>
    );
  };

  // Total columns = leading spacer + data cols + trailing spacer
  const totalCols = dataCols + 2;

  return (
    <div className="flex gap-4 justify-center overflow-x-auto pb-2">
      {Array.from({ length: totalCols }).map((_, colIdx) => {
        const isLeading = colIdx === 0;
        const isTrailing = colIdx === totalCols - 1;
        const dataColIdx = colIdx - 1;
        
        return (
          <div key={colIdx} className="flex flex-col gap-1 justify-end">
            {Array.from({ length: targetRows }).map((__, r) => 
              renderCell(dataColIdx, r, isLeading || isTrailing)
            )}
          </div>
        );
      })}
    </div>
  );
}