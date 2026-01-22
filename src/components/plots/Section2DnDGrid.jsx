import React from "react";
import GravePlotCell from "./GravePlotCell";

// Helper to extract the first integer from a string like "228-A"
function parseNum(v) {
  const m = String(v || "").match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

export default function Section2DnDGrid({ plots = [], baseColorClass = "", isAdmin = false, onHover, onEdit, statusColors }) {
  const perCol = 25;
  const reservedBottomRows = 0;
  const dataCols = 10;
  const totalCols = dataCols + 2; // Add leading and trailing spacer columns

  const cells = React.useMemo(() => {
    const sorted = [...(plots || [])].sort((a, b) => (parseNum(a.Grave) || 0) - (parseNum(b.Grave) || 0));
    const idx186 = sorted.findIndex(p => parseNum(p.Grave) === 186);
    const pivoted = idx186 > -1 ? [...sorted.slice(idx186), ...sorted.slice(0, idx186)] : sorted;

    const baseColumns = Array.from({ length: dataCols }, () => Array(perCol).fill(null));

    let i = 0;
    for (let c = 0; c < dataCols && i < pivoted.length; c++) {
      for (let r = perCol - 1 - reservedBottomRows; r >= 0 && i < pivoted.length; r--) {
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
      let rPtr = perCol - 1 - reservedBottomRows;
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

    // Build output with leading and trailing spacer columns
    const out = Array(totalCols * perCol).fill(null);
    
    // Leading spacer column (index 0) - all nulls (spacers)
    // Data columns (index 1 to dataCols)
    for (let c = 0; c < dataCols; c++) {
      for (let r = 0; r < perCol; r++) {
        out[(c + 1) * perCol + r] = baseColumns[c][r];
      }
    }
    // Trailing spacer column (last) - all nulls (spacers)
    
    return out;
  }, [plots, dataCols, perCol, reservedBottomRows, totalCols]);

  return (
    <div className="flex flex-col items-stretch overflow-x-auto pb-2">
      <div className="grid grid-flow-col gap-3" style={{ gridTemplateRows: `repeat(${perCol}, minmax(0, 1fr))`, gridTemplateColumns: `repeat(${totalCols}, max-content)`, gridAutoColumns: 'max-content' }}>
        {cells.map((item, idx) => (
          <div key={idx} className={`relative transition-all duration-200 ease-in-out transform-gpu ${baseColorClass} opacity-90 hover:opacity-100 border rounded-[1px] w-16 h-8 m-0.5`}>
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
        ))}
      </div>
    </div>
  );
}