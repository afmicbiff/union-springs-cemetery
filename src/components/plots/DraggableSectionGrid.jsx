import React from "react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import DraggablePlotCell from "./DraggablePlotCell";

function parseNum(g) {
  const n = parseInt(String(g || "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

export default function DraggableSectionGrid({ 
  sectionKey,
  columns, // Array of arrays: [[plot, plot, spacer], [spacer, plot], ...]
  baseColorClass, 
  statusColors, 
  isAdmin, 
  onHover, 
  onEdit,
  onMovePlot
}) {
  
  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    
    if (!destination) return;
    
    // Extract plot ID from draggableId (format: "plot-{id}")
    if (!draggableId.startsWith('plot-')) return;
    const plotId = draggableId.replace('plot-', '');
    
    // Extract target spacer info from destination droppableId
    // Format: "spacer-{sectionKey}-col{colIdx}-{rowIdx}"
    const destParts = destination.droppableId.split('-');
    if (destParts[0] !== 'spacer') return;
    
    // Find the spacer cell to get its position info
    const targetSection = destParts[1];
    const colIdx = parseInt(destParts[2].replace('col', ''), 10);
    const rowIdx = parseInt(destParts[3], 10);
    
    if (onMovePlot) {
      onMovePlot({
        plotId,
        targetSection,
        targetColIndex: colIdx,
        targetRowIndex: rowIdx
      });
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 justify-center overflow-x-auto pb-4">
        {columns.map((colPlots, colIdx) => (
          <Droppable 
            key={`col-${colIdx}`} 
            droppableId={`column-${sectionKey}-${colIdx}`}
            type="PLOT"
            isDropDisabled={true}
          >
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex flex-col-reverse gap-1 items-center justify-start min-w-[4rem]"
              >
                {colPlots.map((plot, rowIdx) => (
                  <DraggablePlotCell
                    key={plot?._id || `spacer-${colIdx}-${rowIdx}`}
                    item={plot}
                    baseColorClass={baseColorClass}
                    statusColors={statusColors}
                    isAdmin={isAdmin}
                    onHover={onHover}
                    onEdit={onEdit}
                    sectionKey={sectionKey}
                    index={rowIdx}
                    droppableId={`${sectionKey}-col${colIdx}-${rowIdx}`}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}