import React, { memo, useMemo } from "react";
import GravePlotCell from "./GravePlotCell";

function parseNum(g) {
  const n = parseInt(String(g || "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

// Column ranges matching Section2DnDGrid's S1 layout
const S1_COL_RANGES = [
  { start: 1, end: 25 },
  { start: 26, end: 49 },
  { start: 50, end: 73 },
  { start: 74, end: 97 },
  { start: 98, end: 121 },
  { start: 122, end: 145 },
  { start: 146, end: 169 },
  { start: 170, end: 185 },
];

const Section1DnDGrid = memo(function Section1DnDGrid({ plots, baseColorClass, isAdmin, onHover, onEdit, statusColors }) {
  const columns = React.useMemo(() => {
    if (!plots || !plots.length) return S1_COL_RANGES.map(() => []);

    const plotByNum = new Map();
    plots.forEach(p => {
      const n = parseNum(p.Grave);
      if (n != null) plotByNum.set(n, p);
    });

    return S1_COL_RANGES.map(({ start, end }) => {
      const colPlots = [];
      for (let num = start; num <= end; num++) {
        colPlots.push(plotByNum.get(num) || null);
      }
      return colPlots;
    });
  }, [plots]);

  return (
    <div className="flex gap-4 justify-center overflow-x-auto pb-2">
      {columns.map((colPlots, colIdx) => (
        <div key={colIdx} className="flex flex-col-reverse gap-1 justify-start">
          {colPlots.map((item, rowIdx) => (
            <div key={`s1-c${colIdx}-r${rowIdx}`} className="w-16 h-8 m-0.5 rounded-[1px] relative">
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
          ))}
        </div>
      ))}
    </div>
  );
});

export default Section1DnDGrid;