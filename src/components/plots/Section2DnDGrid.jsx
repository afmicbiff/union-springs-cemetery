import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

// Helper to extract the first integer from a string like "228-A"
function parseNum(v) {
  const m = String(v || "").match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

export default function Section2DnDGrid({ plots = [], baseColorClass = "", isAdmin = false, onHover, onEdit, statusColors }) {
  // Config: fixed 23 rows x 10 columns for Section 2
  const perCol = 25; // total plot rows per column
  const reservedBottomRows = 0;

  // Legend-like text color for plot number
  const STATUS_TEXT = {
    Available: 'text-green-700',
    Reserved: 'text-yellow-700',
    Occupied: 'text-red-700',
    Veteran: 'text-blue-700',
    Unavailable: 'text-gray-700',
    Unknown: 'text-purple-700',
    Default: 'text-gray-700',
  };

  const sorted = React.useMemo(() => {
    const asc = [...(plots || [])].sort((a, b) => (parseNum(a.Grave) || 0) - (parseNum(b.Grave) || 0));
    // Pivot so that 186 is first (if present)
    const idx186 = asc.findIndex(p => parseNum(p.Grave) === 186);
    if (idx186 > -1) {
      return [...asc.slice(idx186), ...asc.slice(0, idx186)];
    }
    return asc;
  }, [plots]);

  const cols = 10;
  const total = cols * perCol;

  // Build initial cells with reserved bottom row as null (placeholders)
  const buildInitial = React.useCallback(() => {
          const fillRows = perCol - reservedBottomRows;

          // Initialize fixed number of columns
          const baseColumns = Array.from({ length: cols }, () => Array(perCol).fill(null));

          // Fill columns bottom-up starting from plot 186 (sorted already pivoted)
          let i = 0;
          for (let c = 0; c < cols && i < sorted.length; c++) {
            for (let r = perCol - 1 - reservedBottomRows; r >= 0 && i < sorted.length; r--) {
              baseColumns[c][r] = sorted[i++];
            }
          }

          // Custom sequence 326–348: merge into column right of anchor (268) without exceeding fixed cols
          const seqStart = 326;
          const seqEnd = 348;
          const anchorNum = 268;

          const byNum = new Map();
          sorted.forEach((p) => {
            const n = parseNum(p?.Grave);
            if (n != null) byNum.set(n, p);
          });

          let hasAnySeq = false;
          for (let n = seqStart; n <= seqEnd; n++) { if (byNum.has(n)) { hasAnySeq = true; break; } }

          if (hasAnySeq) {
            // Remove sequence numbers from wherever they landed
            for (let c = 0; c < cols; c++) {
              for (let r = 0; r < perCol; r++) {
                const cell = baseColumns[c][r];
                const n = parseNum(cell?.Grave);
                if (n != null && n >= seqStart && n <= seqEnd) {
                  baseColumns[c][r] = null;
                }
              }
            }

            // Build sequence column bottom-up
            const seqCol = Array(perCol).fill(null);
            let rPtr = perCol - 1 - reservedBottomRows;
            for (let n = seqStart; n <= seqEnd && rPtr >= 0; n++, rPtr--) {
              const p = byNum.get(n);
              if (p) seqCol[rPtr] = p;
            }

            // Find anchor column containing 268
            let anchorIdx = baseColumns.findIndex((col) => col.some((cell) => parseNum(cell?.Grave) === anchorNum));
            if (anchorIdx < 0) anchorIdx = 0;
            const targetIdx = Math.min(anchorIdx + 1, cols - 1);

            // Merge seqCol into target column, preferring seq values
            for (let r = 0; r < perCol; r++) {
              if (seqCol[r]) baseColumns[targetIdx][r] = seqCol[r];
            }
          }

          // Flatten to fixed-size cells array
          const out = Array(cols * perCol).fill(null);
          for (let c = 0; c < cols; c++) {
            for (let r = 0; r < perCol; r++) {
              out[c * perCol + r] = baseColumns[c][r];
            }
          }
          return out;
        }, [perCol, reservedBottomRows, sorted, cols]);

  const [cells, setCells] = React.useState(buildInitial);
  const [dragging, setDragging] = React.useState(false);
  const [history, setHistory] = React.useState([]);
  React.useEffect(() => { setCells(buildInitial()); setHistory([]); }, [buildInitial]);

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result || {};
    if (!destination) return;
    const srcParts = (source.droppableId || '').match(/s2-c(\d+)-r(\d+)/);
    const dstParts = (destination.droppableId || '').match(/s2-c(\d+)-r(\d+)/);
    if (!srcParts || !dstParts) return;
    const sIdx = parseInt(srcParts[1], 10) * perCol + parseInt(srcParts[2], 10);
    const dIdx = parseInt(dstParts[1], 10) * perCol + parseInt(dstParts[2], 10);
    if (sIdx === dIdx) return;

    setCells(prev => {
      setHistory((h) => [...h, prev]);
      const next = [...prev];
      const item = next[sIdx];
      const destItem = next[dIdx] || null;
      next[dIdx] = item;
      next[sIdx] = destItem; // swap if occupied, otherwise leave null
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

  return (
    <div className={`flex flex-col items-stretch overflow-x-auto pb-2 ${dragging ? 'select-none cursor-grabbing' : ''}`}>
      <div className="flex items-center justify-end mb-2 pr-2">
        <button type="button" onClick={undoLast} disabled={!isAdmin || history.length === 0} className="self-end text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed" title="Undo last move">
          Undo
        </button>
      </div>
      <DragDropContext onDragStart={() => setDragging(true)} onDragEnd={(res) => { if (isAdmin) onDragEnd(res); setDragging(false); }}>
        <div className="grid grid-flow-col gap-3" style={{ gridTemplateRows: `repeat(${perCol}, minmax(0, 1fr))`, gridTemplateColumns: `repeat(${cols}, max-content)`, gridAutoColumns: 'max-content' }}>
          {Array.from({ length: cells.length }).map((_, idx) => {
            const c = Math.floor(idx / perCol);
            const r = idx % perCol; // 0..perCol-1 (no reserved bottom row)
            const item = cells[idx];
            const droppableId = `s2-c${c}-r${r}`;

            const isVet = item && ((item.Status === 'Veteran') || ((item.Notes || '').toLowerCase().includes('vet') && item.Status === 'Occupied'));
            const statusKey = item ? (isVet ? 'Veteran' : ((statusColors && statusColors[item.Status]) ? item.Status : 'Default')) : 'Default';
            const fullClass = (statusColors && statusColors[statusKey]) || '';
            const bgClass = (fullClass.split(' ').find(cn => cn.startsWith('bg-'))) || 'bg-gray-400';
            const textClass = STATUS_TEXT[statusKey] || STATUS_TEXT.Default;

            const CellWrapper = ({ children, active }) => (
              <div className={`relative ${active ? 'transition-none ring-2 ring-teal-500 scale-[1.03]' : 'transition-all duration-200 ease-in-out'} transform-gpu will-change-transform ${baseColorClass} opacity-90 hover:opacity-100 border rounded-[1px] w-16 h-8 m-0.5`}>{children}</div>
            );

            return (
              <Droppable key={droppableId} droppableId={droppableId} isDropDisabled={!isAdmin} isCombineEnabled={false}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className={`flex ${snapshot.isDraggingOver ? 'ring-2 ring-teal-500 ring-offset-2 rounded-[2px]' : ''}`}>
                    {item ? (
                      <Draggable draggableId={`s2-${item._id || item.id || idx}`} index={idx} isDragDisabled={!isAdmin}>
                        {(draggableProvided, draggableSnapshot) => (
                          <div
                            ref={draggableProvided.innerRef}
                            {...draggableProvided.draggableProps}
                            {...draggableProvided.dragHandleProps}
                            onMouseEnter={(e) => item && onHover && onHover(e, item)}
                            onMouseLeave={() => onHover && onHover(null, null)}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isAdmin && onEdit && item && item._entity === 'Plot') onEdit(item);
                            }}
                          >
                            <CellWrapper active={draggableSnapshot.isDragging || snapshot.isDraggingOver}>
                              <div id={`plot-2-${parseNum(item.Grave)}`} className="flex flex-row items-center justify-between px-1.5 w-full h-full text-[8px] overflow-hidden select-none font-bold shadow-sm cursor-move transform-gpu will-change-transform">
                                <span className={`text-[10px] leading-none font-black ${textClass}`}>{item.Grave}</span>
                                <span className="text-[8px] leading-none text-gray-600 font-mono tracking-tighter truncate max-w-full">{item.Row}</span>
                                <div className={`w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm ${bgClass}`}></div>
                              </div>
                            </CellWrapper>
                          </div>
                        )}
                      </Draggable>
                    ) : (
                     // Placeholder cell: remain blank, but is droppable
                     <CellWrapper active={snapshot.isDraggingOver}>
                        <div className="w-full h-full" />
                      </CellWrapper>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}