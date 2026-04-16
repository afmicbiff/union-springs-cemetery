import React from "react";

const LEGEND_ITEMS = [
  ["bg-green-500", "Available"],
  ["bg-amber-500", "Pending"],
  ["bg-yellow-400", "Reserved"],
  ["bg-red-500", "Occupied"],
  ["bg-blue-600", "Veteran"],
  ["bg-gray-500", "Unavailable"],
  ["bg-purple-500", "Unknown"],
];

export default function PlotLegend() {
  return (
    <div className="flex items-center gap-3 mt-4 flex-wrap" role="list" aria-label="Plot status legend">
      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Legend:</span>
      {LEGEND_ITEMS.map(([bg, label]) => (
        <div key={label} className="flex items-center gap-1" role="listitem">
          <div className={`w-2.5 h-2.5 rounded-full ${bg}`} aria-hidden="true" />
          <span className="text-[10px] text-gray-600">{label}</span>
        </div>
      ))}
    </div>
  );
}