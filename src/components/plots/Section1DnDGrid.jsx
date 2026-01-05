import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
// Intentionally no direct GravePlot import to avoid circular dependencies

function parseNum(g) {
  const n = parseInt(String(g || "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

export default function Section1DnDGrid({ plots, baseColorClass, isAdmin, onHover, onEdit, statusColors }) {
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

  // Text colors to mimic legend semantics on numbers
  const STATUS_TEXT = {
    Available: 'text-green-700',
    Reserved: 'text-yellow-700',
    Occupied: 'text-red-700',
    Veteran: 'text-blue-700',
    Unavailable: 'text-gray-700',
    Unknown: 'text-purple-700',
    Default: 'text-gray-700',
  };

  // We keep local layout state (cell -> plot object or null). No persistence.
  const layoutKey = React.useMemo(() => {
    const ids = (plots || []).map((p) => p._id).filter(Boolean).sort();
    return ids.join("|");
  }, [plots]);

  const [cells, setCells] = React.useState(() => Array(total).fill(null));
  const [history, setHistory] = React.useState([]);
  const [readyForKey, setReadyForKey] = React.useState("");

  // Initialize grid so it mirrors existing Section 1 visual: numbers split into 8 columns, descending within each column.
  React.useEffect(() => {
    if (!plots || !plots.length) {
      setCells(Array(total).fill(null));
      setHistory([]);
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
        .sort((a, b) => (parseNum(a.Grave) || 0) - (parseNum(b.Grave) || 0)); // ascending -> 1 at bottom

      // Place ascending with the smallest number at the bottom of the column
      colPlots.forEach((plot, idx) => {
        const row = perCol - 1 - idx; // bottom (last DOM child) hosts the first (smallest) item
        if (row >= 0 && row < perCol) {
          const cellIndex = c * perCol + row;
          nextCells[cellIndex] = plot;
        }
      });
    }

    setCells(nextCells);
    setHistory([]);
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
      setHistory((h) => [...h, prev]);
      const next = [...prev];
      const a = next[si] || null;
      const b = next[di] || null;
      // swap
      next[di] = a;
      next[si] = b;
      return next;
    });
  };

  const undoLast = React.useCallback(() => {
    setHistory((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      setCells(last);
      return prev.slice(0, -1);
    });
  }, []);

   const renderCell = (c, r) => {
    const idx = c * perCol + r;
    const item = cells[idx];
    const droppableId = `s1-c${c}-r${r}`;

    const isVet = item && ((item.Status === 'Veteran') || ((item.Notes || '').toLowerCase().includes('vet') && item.Status === 'Occupied'));
    const statusKey = item ? (isVet ? 'Veteran' : ((statusColors && statusColors[item.Status]) ? item.Status : 'Default')) : 'Default';
    const fullClass = (statusColors && statusColors[statusKey]) || '';
    const bgClass = (fullClass.split(' ').find(cn => cn.startsWith('bg-'))) || 'bg-gray-400';
    const textClass = STATUS_TEXT[statusKey] || STATUS_TEXT.Default;

    return (
      <Droppable key={droppableId} droppableId={droppableId} type="S1CELL" isDropDisabled={!isAdmin}>
        {(dropProvided, dropSnapshot) => (
          <div
            ref={dropProvided.innerRef}
            {...dropProvided.droppableProps}
            className={
              `w-16 h-8 m-0.5 rounded-[1px] relative ` +
              (dropSnapshot.isDraggingOver ? "ring-2 ring-teal-500 ring-offset-2 bg-teal-50/40 " : "")
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
                        <span className={`text-[10px] leading-none font-black ${textClass}`}>{item.Grave}</span>
                        <span className="text-[8px] leading-none text-gray-600 font-mono tracking-tighter truncate max-w-full">{item.Row}</span>
                        <div className={`w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm ${bgClass}`}></div>
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
                  <span className={`text-[10px] leading-none font-black ${textClass}`}>{item.Grave}</span>
                  <span className="text-[8px] leading-none text-gray-600 font-mono tracking-tighter truncate max-w-full">{item.Row}</span>
                  <div className={`w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm ${bgClass}`}></div>
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
      <div className="flex items-center justify-end mb-2 pr-2">
        <button
          type="button"
          onClick={undoLast}
          disabled={!isAdmin || history.length === 0}
          className="text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Undo last move"
        >
          Undo
        </button>
      </div>
      <div className="flex gap-4 justify-center overflow-x-auto pb-2">
        {Array.from({ length: cols }).map((_, c) => (
          <div key={c} className="flex flex-col gap-1 justify-end">
            {Array.from({ length: perCol }).map((__, r) => renderCell(c, r))}
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}