import React from "react";
import GravePlotCell from "./GravePlotCell";

export default function DraggableSectionGrid({ 
  sectionKey,
  columns,
  baseColorClass, 
  statusColors, 
  isAdmin, 
  onHover, 
  onEdit,
  onMovePlot
}) {
  // Simplified grid without drag-and-drop for now to fix stability issues
  return (
    <div className="flex gap-4 justify-center overflow-x-auto pb-4">
      {columns.map((colPlots, colIdx) => (
        <div
          key={`col-${colIdx}`}
          className="flex flex-col-reverse gap-1 items-center justify-start min-w-[4rem] border-r border-dashed border-purple-200 last:border-0 pr-2"
        >
          {colPlots.map((plot, rowIdx) => (
            <GravePlotCell
              key={plot?._id || `spacer-${colIdx}-${rowIdx}`}
              item={plot}
              baseColorClass={baseColorClass}
              statusColors={statusColors}
              isAdmin={isAdmin}
              onHover={onHover}
              onEdit={onEdit}
              sectionKey={sectionKey}
            />
          ))}
        </div>
      ))}
    </div>
  );
}