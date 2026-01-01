import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
// Intentionally no direct GravePlot import to avoid circular dependencies

function parseNum(g) {
  const n = parseInt(String(g || "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

export default function Section1DnDGrid({ plots, baseColorClass, isAdmin, onHover, onEdit }) {
  // Build grid dimensions from numeric graves
  const nums = React.useMemo(() => (
    (plots || [])
      .map((p) => parseNum(p.Grave))
      .filter((n) => Number.isFinite(n) && n > 0)
  ), [plots]);

  const maxNum = React.useMemo(() => (nums.length ? Math.max(...nums) : 0), [nums]);
  const cols = 8;
  const perCol = Math.max(1, Math.ceil(maxNum / cols));
  const total = cols * perCol;

  // We keep local layout state (cell -> plot object or null). No persistence.
  const layoutKey = React.useMemo(() => {
    const ids = (plots || []).map((p) => p._id).filter(Boolean).sort();
    return ids.join("|");
  }, [plots]);

  const [cells, setCells] = React.useState(Array(total).fill(null));
  const [readyForKey, setReadyForKey] = React.useState("");

  // Initialize grid so it mirrors existing Section 1 visual: numbers split into 8 columns, descending within each column.
  React.useEffect(() => {
    if (!plots || !plots.length) {
      setCells(Array(total).fill(null));
      setReadyForKey(layoutKey);
      return;
    }

    if (readyForKey === layoutKey) return;

    const nextCells = Array(total).fill(null);

    for (let c = 0; c < cols; c++) {
      const start = c * perCol + 1;
      const end = Math.min((c + 1) * perCol, maxNum);
      const colPlots = plots
        .filter((p) => {
          const n = parseNum(p.Grave);
          return n && n >= start && n <= end;
        })
        .sort((a, b) => (parseNum(b.Grave) || 0) - (parseNum(a.Grave) || 0)); // descending (bottom-up)

      colPlots.forEach((plot, idx) => {
        const row = perCol - 1 - idx; // bottom-up placement
        if (row >= 0 && row < perCol) {
          const cellIndex = c * perCol + row;
          nextCells[cellIndex] = plot;
        }
      });
    }

    setCells(nextCells);
    setReadyForKey(layoutKey);
  }, [plots, cols, perCol, maxNum, layoutKey, readyForKey, total]);

  const onDragEnd = (result) => {
    const { source, destination } = result || {};
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    const src = source.droppableId; // s1-c{c}-r{r}
    const dst = destination.droppableId;
    const parseId = (id) => {
      const m = id.match(/s1-c(\d+)-r(\d+)/);
      return m ? { c: parseInt(m[1], 10), r: parseInt(m[2], 10) } : null;
    };
    const s = parseId(src);
    const d = parseId(dst);
    if (!s || !d) return;

    const si = s.c * perCol + s.r;
    const di = d.c * perCol + d.r;

    setCells((prev) => {
      const next = [...prev];
      const a = next[si] || null;
      const b = next[di] || null;
      // swap
      next[di] = a;
      next[si] = b;
      return next;
    });
  };

  const renderCell = (c, r) => {
    const idx = c * perCol + r;
    const item = cells[idx];
    const droppableId = `s1-c${c}-r${r}`;

    return (
      <Droppable key={droppableId} droppableId={droppableId} type="S1CELL" isDropDisabled={!isAdmin}>
        {(dropProvided, dropSnapshot) => (
          <div
            ref={dropProvided.innerRef}
            {...dropProvided.droppableProps}
            className={
              `w-16 h-8 m-0.5 rounded-[1px] relative ` +
              (dropSnapshot.isDraggingOver ? "ring-2 ring-blue-400 ring-offset-2 " : "")
            }
          >
            {item ? (
              isAdmin ? (
                <Draggable draggableId={String(item._id)} index={idx} isDragDisabled={!isAdmin}>
                  {(dragProvided, dragSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      className={`${dragSnapshot.isDragging ? "z-50" : ""}`}
                    >
                      {/* Use the existing GravePlot from the page via window.__B44_GravePlot if exposed, else fallback simple */}
                      <div
                        className={`border ${baseColorClass} w-16 h-8 px-1.5 text-[8px] m-0.5 rounded-[1px] flex items-center justify-between cursor-move bg-opacity-90`}
                        onMouseEnter={(e) => onHover && onHover(e, item)}
                        onMouseLeave={() => onHover && onHover(null, null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onEdit && item && item._entity === 'Plot') onEdit(item);
                        }}
                        title={`Row: ${item.Row}, Grave: ${item.Grave}`}
                      >
                        <span className="text-[10px] leading-none font-black text-gray-800">{item.Grave}</span>
                        <span className="text-[8px] leading-none text-gray-600 font-mono tracking-tighter truncate max-w-full">{item.Row}</span>
                        <div className={`w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm bg-gray-400`}></div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ) : (
                <div
                  className={`border ${baseColorClass} w-16 h-8 px-1.5 text-[8px] m-0.5 rounded-[1px] flex items-center justify-between bg-opacity-90`}
                  onMouseEnter={(e) => onHover && onHover(e, item)}
                  onMouseLeave={() => onHover && onHover(null, null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onEdit && item && item._entity === 'Plot') onEdit(item);
                  }}
                  title={`Row: ${item.Row}, Grave: ${item.Grave}`}
                >
                  <span className="text-[10px] leading-none font-black text-gray-800">{item.Grave}</span>
                  <span className="text-[8px] leading-none text-gray-600 font-mono tracking-tighter truncate max-w-full">{item.Row}</span>
                  <div className={`w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm bg-gray-400`}></div>
                </div>
              )
            ) : (
              <div className="w-16 h-8 m-0.5 border border-dashed border-gray-300 bg-gray-50/50 rounded-[1px]" />
            )}
            {dropProvided.placeholder}
          </div>
        )}
      </Droppable>
    );
  };

  return (
    <DragDropContext onDragEnd={isAdmin ? onDragEnd : () => {}}>
      <div className="flex gap-4 justify-center overflow-x-auto">
        {Array.from({ length: cols }).map((_, c) => (
          <div key={c} className="flex flex-col gap-1 justify-end">
            {Array.from({ length: perCol }).map((__, r) => renderCell(c, r))}
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}