import React, { useState, useEffect, useRef } from "react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { normalizeSectionKey } from "./normalizeSectionKey";

function parseNum(g) {
  const n = parseInt(String(g || "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

const STATUS_TEXT = {
  Available: 'text-green-700',
  Reserved: 'text-yellow-700',
  Occupied: 'text-red-700',
  Veteran: 'text-blue-700',
  Unavailable: 'text-gray-700',
  Unknown: 'text-purple-700',
  Default: 'text-gray-700',
};

export default function DraggablePlotCell({ 
  item, 
  baseColorClass, 
  statusColors, 
  isAdmin, 
  onHover, 
  onEdit, 
  sectionKey,
  index,
  droppableId
}) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const hasInitializedBlink = useRef(false);

  const plotNum = parseNum(item?.Grave);
  const isSpacer = !item || item.isSpacer;
  const draggableId = isSpacer ? `spacer-${droppableId}-${index}` : `plot-${item._id}`;

  // Blinking logic
  useEffect(() => {
    if (!item) return;

    const handleStartBlink = (e) => {
      const { targetPlotNum, targetSection } = e.detail || {};
      const normalizedTarget = normalizeSectionKey(targetSection);
      const normalizedPlot = normalizeSectionKey(sectionKey);

      const isMatch = Number.isFinite(targetPlotNum)
        && Number.isFinite(plotNum)
        && plotNum === targetPlotNum
        && (!normalizedTarget || normalizedPlot === normalizedTarget);

      if (isMatch && !hasInitializedBlink.current) {
        hasInitializedBlink.current = true;
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 60000);
      }
    };

    window.addEventListener('plot-start-blink', handleStartBlink);
    return () => window.removeEventListener('plot-start-blink', handleStartBlink);
  }, [plotNum, sectionKey, item]);

  // Spacer cell (droppable target)
  if (isSpacer) {
    const handleSpacerClick = (e) => {
      e.stopPropagation();
      if (isAdmin && onEdit) {
        onEdit({ isSpacer: true, _id: item?._id, Section: item?.Section || sectionKey, suggestedSection: sectionKey });
      }
    };

    return (
      <Droppable droppableId={`spacer-${droppableId}-${index}`} type="PLOT">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`w-16 h-8 m-0.5 border border-dashed rounded-[1px] transition-all flex items-center justify-center plot-element
              ${snapshot.isDraggingOver 
                ? 'border-green-500 bg-green-100 border-2 scale-105 shadow-lg' 
                : 'border-gray-300 bg-gray-50/50'}
              ${isAdmin ? 'hover:bg-green-100 hover:border-green-400 cursor-pointer' : ''}`}
            onClick={handleSpacerClick}
            title={isAdmin ? "Drop a plot here or click to create new" : ""}
          >
            {snapshot.isDraggingOver ? (
              <span className="text-[8px] text-green-600 font-bold">Drop Here</span>
            ) : (
              isAdmin && <span className="text-[8px] text-green-600 font-bold">+ New</span>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    );
  }

  // Regular plot cell (draggable)
  const isVet = (item.Status === 'Veteran') || ((item.Notes || '').toLowerCase().includes('vet') && item.Status === 'Occupied');
  const statusKey = isVet ? 'Veteran' : ((statusColors && statusColors[item.Status]) ? item.Status : 'Default');
  const fullClass = (statusColors && statusColors[statusKey]) || '';
  const bgClass = (fullClass.split(' ').find(cn => cn.startsWith('bg-'))) || 'bg-gray-400';
  const textClass = STATUS_TEXT[statusKey] || STATUS_TEXT.Default;
  const blinkingClass = 'ring-8 ring-green-500 ring-offset-2 ring-offset-white scale-110 z-30 shadow-2xl animate-plot-blink';

  return (
    <Draggable draggableId={draggableId} index={index} isDragDisabled={!isAdmin}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          id={`plot-${sectionKey}-${plotNum}`}
          data-section={sectionKey}
          data-plot-num={plotNum}
          className={`border ${baseColorClass} w-16 h-8 px-1.5 text-[8px] m-0.5 rounded-[1px] flex items-center justify-between bg-opacity-90 plot-element transition-all
            ${isAdmin ? 'cursor-grab' : 'cursor-pointer'}
            ${snapshot.isDragging ? 'shadow-2xl scale-110 z-50 ring-2 ring-blue-500 opacity-90' : 'hover:opacity-100'}
            ${isBlinking ? blinkingClass : ''}`}
          onMouseEnter={(e) => !snapshot.isDragging && onHover && onHover(e, item)}
          onMouseLeave={() => onHover && onHover(null, null)}
          onClick={(e) => {
            e.stopPropagation();
            if (!snapshot.isDragging && isAdmin && onEdit && item._entity === 'Plot') onEdit(item);
          }}
          title={isAdmin ? `Drag to move • Row: ${item.Row}, Grave: ${item.Grave}` : `Row: ${item.Row}, Grave: ${item.Grave}`}
        >
          <span className={`text-[10px] leading-none font-black ${textClass}`}>{item.Grave}</span>
          <span className="text-[8px] leading-none text-gray-600 font-mono tracking-tighter truncate max-w-full">{item.Row}</span>
          <div className={`w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm ${bgClass}`}></div>
        </div>
      )}
    </Draggable>
  );
}