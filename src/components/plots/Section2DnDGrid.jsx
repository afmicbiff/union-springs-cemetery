import React, { memo, useMemo } from "react";
import GravePlotCell from "./GravePlotCell";

// Helper to extract the first integer from a string like "228-A"
function parseNum(v) {
  const m = String(v || "").match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

// Section 1 explicit column ranges
const S1_COL_RANGES = [
  { start: 1, end: 23 },
  { start: 24, end: 45 },
  { start: 47, end: 66 },
  { start: 70, end: 92 },
  { start: 93, end: 115 },
  { start: 116, end: 138 },
  { start: 139, end: 161 },
  { start: 162, end: 184 },
];
const S1_BOTTOM_OFFSET = 0;

// Section 2 column ranges
const COLUMN_RANGES = [
  { start: 186, end: 207, shiftDown: false },
  { start: 228, end: 250, shiftDown: false },
  { start: 303, end: 325, shiftDown: false },
  { start: 383, end: 405, shiftDown: false },
  { start: 466, end: 488, shiftDown: true },
  { start: 582, end: 604, shiftDown: true },
  { start: 665, end: 687, shiftDown: false },
  { start: 743, end: 764, shiftDown: false },
  { start: 799, end: 820, shiftDown: false },
  { start: 875, end: 897, shiftDown: true },
];

const Section2DnDGrid = memo(function Section2DnDGrid({ plots = [], section1Plots = [], baseColorClass = "", isAdmin = false, onHover, onEdit, statusColors }) {

  // Build Section 1 columns using explicit ranges
  const s1Columns = useMemo(() => {
    if (!section1Plots || section1Plots.length === 0) return [];

    const plotByNum = new Map();
    section1Plots.forEach(p => {
      const n = parseNum(p.Grave || p.plot_number);
      if (n != null) plotByNum.set(n, p);
    });

    return S1_COL_RANGES.map(({ start, end, tail }) => {
      const colPlots = [];
      for (let num = start; num <= end; num++) {
        colPlots.push(plotByNum.get(num) || null);
      }
      if (tail) {
        tail.forEach(num => colPlots.push(plotByNum.get(num) || null));
      }
      return colPlots;
    });
  }, [section1Plots]);

  // Build Section 2 columns  
  const s2Columns = useMemo(() => {
    const plotByNum = new Map();
    const sorted = [...(plots || [])].sort((a, b) => {
      const da = new Date(a.created_date || 0).getTime();
      const db = new Date(b.created_date || 0).getTime();
      return da - db;
    });

    sorted.forEach(p => {
      const n = parseNum(p.Grave || p.plot_number);
      if (n != null) {
        const existing = plotByNum.get(n);
        if (!existing) {
          plotByNum.set(n, p);
        } else {
          const hasRow = p.Row || p.row_number;
          const existingHasRow = existing.Row || existing.row_number;
          if (hasRow && !existingHasRow) {
            plotByNum.set(n, p);
          } else if (hasRow === existingHasRow) {
            plotByNum.set(n, p);
          }
        }
      }
    });

    return COLUMN_RANGES.map(({ start, end }) => {
      const colPlots = [];
      for (let num = start; num <= end; num++) {
        colPlots.push(plotByNum.get(num) || null);
      }
      return colPlots;
    });
  }, [plots]);

  const hasSection1 = s1Columns.length > 0;

  return (
    <div className="flex flex-col items-stretch overflow-x-auto pb-2">
      <div className="flex gap-2 sm:gap-3">
        {/* Section 1 columns on the left */}
        {hasSection1 && s1Columns.map((colPlots, colIdx) => (
          <div key={`s1-${colIdx}`} className="flex flex-col-reverse gap-0.5">
            {/* Bottom spacers to align with Section 2 */}
            {Array.from({ length: S1_BOTTOM_OFFSET }).map((_, i) => (
              <div key={`s1-bpad-${i}`} className="w-16 h-8 m-0.5" />
            ))}
            {/* Section 1 plot cells */}
            {colPlots.map((item, rowIdx) => (
              <div key={rowIdx} className={`relative transition-opacity ${baseColorClass} opacity-90 hover:opacity-100 border rounded-[1px] w-16 h-8 m-0.5`}>
                <GravePlotCell
                  item={item}
                  baseColorClass=""
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

        {/* Small gap/separator between S1 and S2 */}
        {hasSection1 && <div className="w-1" />}

        {/* Section 2 columns */}
        {s2Columns.map((colPlots, colIdx) => {
          const colDef = COLUMN_RANGES[colIdx];
          const isShifted = colDef.shiftDown;
          return (
            <div key={`s2-${colIdx}`} className="flex flex-col-reverse gap-0.5">
              {!isShifted && <div className="w-16 h-8 m-0.5" />}
              {colPlots.map((item, rowIdx) => (
                <div key={rowIdx} className={`relative transition-opacity ${baseColorClass} opacity-90 hover:opacity-100 border rounded-[1px] w-16 h-8 m-0.5`}>
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
          );
        })}
      </div>
    </div>
  );
});

export default Section2DnDGrid;