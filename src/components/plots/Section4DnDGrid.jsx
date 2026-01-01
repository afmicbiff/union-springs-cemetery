import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

function toNum(grave) {
  const n = parseInt(String(grave || "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

export default function Section4DnDGrid({ plots = [], baseColorClass = "", isAdmin, onHover, onEdit, statusColors = {} }) {
  const items = React.useMemo(() => {
    return [...(plots || [])]
      .filter(p => !p.isSpacer)
      .sort((a, b) => (toNum(a.Grave) || 0) - (toNum(b.Grave) || 0));
  }, [plots]);

  const cols = React.useMemo(() => {
    const n = items.length;
    if (n <= 24) return Math.max(4, Math.ceil(Math.sqrt(n)));
    if (n <= 80) return 10;
    return 12;
  }, [items.length]);
  const rows = Math.max(1, Math.ceil(items.length / cols));

  const initialCells = React.useMemo(() => {
    const size = rows * cols;
    const cells = new Array(size).fill(null);
    for (let i = 0; i < Math.min(items.length, size); i++) {
      cells[i] = items[i];
    }
    return cells;
  }, [items, rows, cols]);

  const [cells, setCells] = React.useState(initialCells);
  React.useEffect(() => setCells(initialCells), [initialCells]);

  const onDragEnd = (result) => {
    const { source, destination } = result || {};
    if (!destination) return;
    if (source.index === destination.index) return;
    setCells(prev => {
      const next = [...prev];
      const tmp = next[source.index];
      next[source.index] = next[destination.index];
      next[destination.index] = tmp;
      return next;
    });
  };

  const getStatusBg = (status) => {
    const full = statusColors[status] || statusColors.Default || "bg-gray-300 border-gray-500";
    const bg = (full.split(" ").find(c => c.startsWith("bg-"))) || "bg-gray-300";
    return bg;
  };

  const gridStyle = { gridTemplateColumns: `repeat(${cols}, 4rem)`, gridAutoRows: "2rem" };

  return (
    <div>
      <div className="text-xs text-gray-500 mb-2">Drag to rearrange (admin only). Layout is not yet saved.</div>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="s4-grid" direction="horizontal" renderClone={null}>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="grid gap-1 justify-center overflow-x-auto pb-4"
              style={gridStyle}
            >
              {cells.map((cell, idx) => (
                cell ? (
                  <Draggable key={cell._id || `cell-${idx}`} draggableId={String(cell._id || `cell-${idx}`)} index={idx}>
                    {(drag) => (
                      <div
                        ref={drag.innerRef}
                        {...drag.draggableProps}
                        {...drag.dragHandleProps}
                        className={`relative border rounded-[1px] flex items-center justify-between px-1.5 w-16 h-8 text-[8px] font-bold shadow-sm cursor-move ${baseColorClass}`}
                        onMouseEnter={(e) => onHover && onHover(e, cell)}
                        onMouseLeave={() => onHover && onHover(null, null)}
                        onClick={(e) => { e.stopPropagation(); if (isAdmin && onEdit && cell && cell._entity === 'Plot') onEdit(cell); }}
                        title={`Row: ${cell.Row}, Grave: ${cell.Grave}`}
                      >
                        <span className="text-[10px] leading-none font-black text-gray-800">{cell.Grave}</span>
                        <span className="text-[8px] leading-none text-gray-600 font-mono tracking-tighter truncate max-w-full">{cell.Row}</span>
                        <div className={`w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm ${getStatusBg(cell.Status)}`}></div>
                      </div>
                    )}
                  </Draggable>
                ) : (
                  <div key={`empty-${idx}`} className="w-16 h-8 border border-dashed border-gray-300 bg-gray-50/50 rounded-[1px]" />
                )
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}