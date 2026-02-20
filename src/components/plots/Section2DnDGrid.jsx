import React, { memo, useMemo } from "react";
import GravePlotCell from "./GravePlotCell";

// Helper to extract the first integer from a string like "228-A"
function parseNum(v) {
  const m = String(v || "").match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

// Define the exact column ranges for Section 2
// Each column starts 1 row up from the bottom, numbers go up
// Columns 466 and 582 are shifted down 1 extra row (no bottom offset)
const COLUMN_RANGES = [
  { start: 186, end: 207, shiftDown: false },  // Column 1 (bottom left)
  { start: 228, end: 250, shiftDown: false },  // Column 2
  { start: 303, end: 325, shiftDown: false },  // Column 3
  { start: 383, end: 404, shiftDown: false },  // Column 4
  { start: 466, end: 488, shiftDown: true },   // Column 5 - shifted down 1
  { start: 582, end: 604, shiftDown: true },   // Column 6 - shifted down 1
  { start: 665, end: 687, shiftDown: false },  // Column 7
  { start: 743, end: 764, shiftDown: false },  // Column 8
  { start: 799, end: 820, shiftDown: false },  // Column 9
  { start: 875, end: 895, shiftDown: false },  // Column 10
];

const Section2DnDGrid = memo(function Section2DnDGrid({ plots = [], baseColorClass = "", isAdmin = false, onHover, onEdit, statusColors }) {
  // Find max column height (including 1 empty row at bottom for offset)
  const maxRows = Math.max(...COLUMN_RANGES.map(r => r.end - r.start + 1)) + 1; // +1 for the offset row at bottom

  const columns = useMemo(() => {
    // Build lookup map: plot_number -> plot data (deduplicated, prefer newer records with row_number matching spreadsheet)
    const plotByNum = new Map();
    const sorted = [...(plots || [])].sort((a, b) => {
      // Sort by created_date ascending so newer entries overwrite older ones
      const da = new Date(a.created_date || 0).getTime();
      const db = new Date(b.created_date || 0).getTime();
      return da - db;
    });
    
    sorted.forEach(p => {
      const n = parseNum(p.Grave || p.plot_number);
      if (n != null) {
        // Keep the version that has more data (row_number, names, etc.)
        const existing = plotByNum.get(n);
        if (!existing) {
          plotByNum.set(n, p);
        } else {
          // Prefer the one with row_number set, or with more fields filled
          const hasRow = p.Row || p.row_number;
          const existingHasRow = existing.Row || existing.row_number;
          if (hasRow && !existingHasRow) {
            plotByNum.set(n, p);
          } else if (hasRow === existingHasRow) {
            // Prefer the newer one
            plotByNum.set(n, p);
          }
        }
      }
    });

    // Build columns based on defined ranges
    return COLUMN_RANGES.map(({ start, end }) => {
      const colPlots = [];
      for (let num = start; num <= end; num++) {
        colPlots.push(plotByNum.get(num) || null);
      }
      return colPlots;
    });
  }, [plots]);

  return (
    <div className="flex flex-col items-stretch overflow-x-auto pb-2">
      <div className="flex gap-2 sm:gap-3">
        {columns.map((colPlots, colIdx) => (
          <div key={colIdx} className="flex flex-col-reverse gap-0.5">
            {/* Empty bottom offset row */}
            <div className="w-16 h-8 m-0.5" />
            {/* Data rows - bottom to top (lowest number at bottom) */}
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
        ))}
      </div>
    </div>
  );
});

export default Section2DnDGrid;