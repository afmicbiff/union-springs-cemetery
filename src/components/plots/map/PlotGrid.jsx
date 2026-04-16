import React, { useMemo } from "react";
import GravePlotCell from "./GravePlotCell";

// Column ranges define the 8 columns, ordered left-to-right visually
const COLUMN_RANGES = [
  { start: 225, end: 232, label: "225-232" },
  { start: 217, end: 224, label: "217-224" },
  { start: 209, end: 216, label: "209-216" },
  { start: 201, end: 208, label: "201-208" },
  { start: 125, end: 132, label: "125-132" },
  { start: 117, end: 124, label: "117-124" },
  { start: 109, end: 116, label: "109-116" },
  { start: 101, end: 113, label: "101-113" },
];

const SPACER_AFTER_GRAVE = "1163";
const SPACER_COUNT = 5;

// Row letters ordered top-to-bottom (J at top, A at bottom)
const ROW_LETTERS = ["J", "I", "H", "G", "F", "E", "D", "C", "B", "A"];

function buildGrid(plots) {
  const byLetter = {};
  for (const plot of plots) {
    const rowStr = String(plot.Row || "").toUpperCase();
    const match = rowStr.match(/^([A-J])/);
    if (!match) continue;
    const letter = match[1];
    const rowNum = parseInt(rowStr.replace(/\D/g, "")) || 0;
    const range = COLUMN_RANGES.find((r) => rowNum >= r.start && rowNum <= r.end);
    if (!range) continue;

    if (!byLetter[letter]) byLetter[letter] = {};
    if (!byLetter[letter][range.label]) byLetter[letter][range.label] = [];
    byLetter[letter][range.label].push(plot);
  }

  // Sort within each cell descending
  for (const cols of Object.values(byLetter)) {
    for (const key of Object.keys(cols)) {
      cols[key].sort((a, b) => {
        const numA = parseInt(String(a.Row || "").replace(/\D/g, "")) || 0;
        const numB = parseInt(String(b.Row || "").replace(/\D/g, "")) || 0;
        return numB - numA;
      });
    }
  }

  return byLetter;
}

export default function PlotGrid({ plots, onHover, onPlotClick }) {
  const grid = useMemo(() => buildGrid(plots), [plots]);
  const activeRows = useMemo(() => ROW_LETTERS.filter((r) => grid[r]), [grid]);

  if (activeRows.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-12 text-center" role="status">
        No plots match your current filters.
      </div>
    );
  }

  return (
    <div
      className="border border-gray-300 rounded overflow-hidden bg-white"
      role="grid"
      aria-label="Cemetery plot map"
    >
      <div className="flex">
        {COLUMN_RANGES.map((range) => (
          <div key={range.label} className="flex flex-col border-r border-gray-200 last:border-r-0" role="rowgroup">
            {activeRows.map((letter) => {
              const cellPlots = grid[letter]?.[range.label] || [];
              if (cellPlots.length === 0) {
                return <div key={`${letter}-${range.label}`} className="w-[68px] h-[38px] border-b border-gray-100" aria-hidden="true" />;
              }

              // Build items list with spacers
              const items = [];
              for (const plot of cellPlots) {
                if (plot.Grave === SPACER_AFTER_GRAVE) {
                  for (let s = 0; s < SPACER_COUNT; s++) {
                    items.push({ type: "spacer", key: `spacer-${plot.Grave}-${s}` });
                  }
                }
                items.push({ type: "plot", plot, key: plot.id });
              }

              return (
                <React.Fragment key={`${letter}-${range.label}`}>
                  {items.map((item) =>
                    item.type === "spacer" ? (
                      <div key={item.key} className="w-[68px] h-[38px] border-b border-gray-100 bg-gray-50" aria-hidden="true" />
                    ) : (
                      <div key={item.key} className="border-b border-gray-100 last:border-b-0" role="gridcell">
                        <GravePlotCell data={item.plot} onHover={onHover} onClick={onPlotClick} />
                      </div>
                    )
                  )}
                </React.Fragment>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}