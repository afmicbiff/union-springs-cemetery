import React from "react";
import GravePlotCell from "./GravePlotCell";

function parseNum(g) {
  const n = parseInt(String(g || "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

export default function Section1DnDGrid({ plots, baseColorClass, isAdmin, onHover, onEdit, statusColors }) {
  // Build grid dimensions from numeric graves
  const nums = React.useMemo(() => (
    (plots || [])
      .map((p) => parseNum(p.Grave))
      .filter((n) => Number.isFinite(n) && n > 0)
  ), [plots]);

  const maxNum = React.useMemo(() => (nums.length ? Math.max(...nums) : 0), [nums]);
  const cols = 8;
  const perCol = Math.max(1, Math.ceil(maxNum / cols));
  const total = cols * perCol;

  // Build cells layout
  const cells = React.useMemo(() => {
    if (!plots || !plots.length) return Array(total).fill(null);

    const nextCells = Array(total).fill(null);

    for (let c = 0; c < cols; c++) {
      const start = c * perCol + 1;
      const end = Math.min((c + 1) * perCol, maxNum);
      const colPlots = plots
        .filter((p) => {
          const n = parseNum(p.Grave);
          return n && n >= start && n <= end;
        })
        .sort((a, b) => (parseNum(a.Grave) || 0) - (parseNum(b.Grave) || 0));

      colPlots.forEach((plot, idx) => {
        const row = perCol - 1 - idx;
        if (row >= 0 && row < perCol) {
          const cellIndex = c * perCol + row;
          nextCells[cellIndex] = plot;
        }
      });
    }

    return nextCells;
  }, [plots, cols, perCol, maxNum, total]);

  const renderCell = (c, r) => {
    const idx = c * perCol + r;
    const item = cells[idx];

    return (
      <div key={`s1-c${c}-r${r}`} className="w-16 h-8 m-0.5 rounded-[1px] relative">
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

  return (
    <div className="flex gap-4 justify-center overflow-x-auto pb-2">
      {Array.from({ length: cols }).map((_, c) => (
        <div key={c} className="flex flex-col gap-1 justify-end">
          {Array.from({ length: perCol }).map((__, r) => renderCell(c, r))}
        </div>
      ))}
    </div>
  );
}