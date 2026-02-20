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
  { start: 24, end: 46 },
  { start: 47, end: 69 },
  { start: 70, end: 92 },
  { start: 93, end: 115 },
  { start: 116, end: 138 },
  { start: 139, end: 161 },
  { start: 162, end: 184 },
];
const S1_BOTTOM_OFFSET = 0;

// Section 2 column ranges
// s3Top = Section 3 plots stacked on top (rose/pink)
// s4Top = Section 4 plots stacked on top of s3Top (amber/yellow)
const COLUMN_RANGES = [
  { start: 186, end: 207, shiftDown: false, s3Top: null, s4Top: null },
  { start: 228, end: 250, shiftDown: false, s3Top: { start: 251, end: 268 }, s4Top: null },
  { start: 303, end: 325, shiftDown: false, s3Top: { start: 326, end: 348 }, s4Top: null },
  { start: 383, end: 404, shiftDown: false, s3Top: { start: 405, end: 430 }, s4Top: { start: 431, end: 461 } },
  { start: 466, end: 488, shiftDown: true, s3Top: { start: 489, end: 512 }, s4Top: { start: 513, end: 545 } },
  { start: 582, end: 604, shiftDown: true, s3Top: { start: 605, end: 629 }, s4Top: { start: 630, end: 658 } },
  { start: 665, end: 687, shiftDown: false, s3Top: { start: 688, end: 711 }, s4Top: { start: 712, end: 737 } },
  { start: 743, end: 769, shiftDown: false, s3Top: { start: 770, end: 788 }, s4Top: { start: 789, end: 798 } },
  { start: 799, end: 820, shiftDown: false, s3Top: { start: 821, end: 843 }, s4Top: { start: 844, end: 870 } },
  { start: 875, end: 895, shiftDown: true, s3Top: { start: 896, end: 922 }, s4Top: { start: 923, end: 942 } },
];

// Section 3 rose/pink color class
const S3_COLOR_CLASS = "bg-rose-100 border-rose-300";
// Section 4 amber/yellow color class
const S4_COLOR_CLASS = "bg-amber-100 border-amber-300";

const Section2DnDGrid = memo(function Section2DnDGrid({ plots = [], section1Plots = [], baseColorClass = "", isAdmin = false, onHover, onEdit, statusColors }) {

  // Build plot lookup map from all plots (includes both S2 and S3 plots now)
  const plotByNum = useMemo(() => {
    const map = new Map();
    const sorted = [...(plots || [])].sort((a, b) => {
      const da = new Date(a.created_date || 0).getTime();
      const db = new Date(b.created_date || 0).getTime();
      return da - db;
    });

    sorted.forEach(p => {
      const n = parseNum(p.Grave || p.plot_number);
      if (n != null) {
        const existing = map.get(n);
        if (!existing) {
          map.set(n, p);
        } else {
          const hasRow = p.Row || p.row_number;
          const existingHasRow = existing.Row || existing.row_number;
          if (hasRow && !existingHasRow) {
            map.set(n, p);
          } else if (hasRow === existingHasRow) {
            map.set(n, p);
          }
        }
      }
    });
    return map;
  }, [plots]);

  // Build Section 1 columns using explicit ranges
  const s1Columns = useMemo(() => {
    if (!section1Plots || section1Plots.length === 0) return [];

    const s1Map = new Map();
    section1Plots.forEach(p => {
      const n = parseNum(p.Grave || p.plot_number);
      if (n != null) s1Map.set(n, p);
    });

    return S1_COL_RANGES.map(({ start, end, tail }) => {
      const colPlots = [];
      for (let num = start; num <= end; num++) {
        colPlots.push(s1Map.get(num) || null);
      }
      if (tail) {
        tail.forEach(num => colPlots.push(s1Map.get(num) || null));
      }
      return colPlots;
    });
  }, [section1Plots]);

  // Build Section 2 columns (with S3 and S4 top segments)
  const s2Columns = useMemo(() => {
    return COLUMN_RANGES.map(({ start, end, s3Top, s4Top }) => {
      const colPlots = [];
      for (let num = start; num <= end; num++) {
        colPlots.push(plotByNum.get(num) || null);
      }
      let s3Plots = null;
      if (s3Top) {
        s3Plots = [];
        for (let num = s3Top.start; num <= s3Top.end; num++) {
          s3Plots.push(plotByNum.get(num) || null);
        }
      }
      let s4Plots = null;
      if (s4Top) {
        s4Plots = [];
        for (let num = s4Top.start; num <= s4Top.end; num++) {
          s4Plots.push(plotByNum.get(num) || null);
        }
      }
      return { colPlots, s3Plots, s4Plots };
    });
  }, [plotByNum]);

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

        {/* Section 2 columns with optional Section 3 and Section 4 plots on top */}
        {s2Columns.map(({ colPlots, s3Plots, s4Plots }, colIdx) => {
          const colDef = COLUMN_RANGES[colIdx];
          const isShifted = colDef.shiftDown;
          return (
            <div key={`s2-${colIdx}`} className="flex flex-col-reverse gap-0.5">
              {!isShifted && <div className="w-16 h-8 m-0.5" />}
              {/* Section 2 plots */}
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
              {/* Section 3 plots stacked on top (rose/pink) */}
              {s3Plots && s3Plots.map((item, rowIdx) => (
                <div key={`s3-${rowIdx}`} className={`relative transition-opacity ${S3_COLOR_CLASS} opacity-90 hover:opacity-100 border rounded-[1px] w-16 h-8 m-0.5`}>
                  <GravePlotCell
                    item={item}
                    baseColorClass=""
                    statusColors={statusColors}
                    isAdmin={isAdmin}
                    onHover={onHover}
                    onEdit={onEdit}
                    sectionKey="3"
                  />
                </div>
              ))}
              {/* Section 4 plots stacked on top of Section 3 (amber/yellow) */}
              {s4Plots && s4Plots.map((item, rowIdx) => (
                <div key={`s4-${rowIdx}`} className={`relative transition-opacity ${S4_COLOR_CLASS} opacity-90 hover:opacity-100 border rounded-[1px] w-16 h-8 m-0.5`}>
                  <GravePlotCell
                    item={item}
                    baseColorClass=""
                    statusColors={statusColors}
                    isAdmin={isAdmin}
                    onHover={onHover}
                    onEdit={onEdit}
                    sectionKey="4"
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