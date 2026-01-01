import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

// Helper to extract the first integer from a string like "228-A"
function parseNum(v) {
  const m = String(v || "").match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

export default function Section2DnDGrid({ plots = [], baseColorClass = "", isAdmin = false, onHover, onEdit, statusColors }) {
  // Config: keep a reserved bottom row of placeholders (droppable) with no items initially
  const perCol = 24; // total rows per column including the reserved bottom row
  const reservedBottomRows = 1;

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

  const cols = Math.max(1, Math.ceil(sorted.length / (perCol - reservedBottomRows)));
  const total = cols * perCol;

  // Build initial cells with reserved bottom row as null (placeholders)
  const buildInitial = React.useCallback(() => {
    const next = Array(total).fill(null);
    let i = 0;
    for (let c = 0; c < cols; c++) {
      for (let r = reservedBottomRows; r < perCol; r++) { // start at row 1 (leave row 0 empty)
        const arrIdx = i++;
        if (arrIdx >= sorted.length) break;
        const cellIndex = c * perCol + r;
        next[cellIndex] = sorted[arrIdx];
      }
    }
    return next;
  }, [total, cols, perCol, reservedBottomRows, sorted]);

  const [cells, setCells] = React.useState(buildInitial);
  React.useEffect(() => { setCells(buildInitial()); }, [buildInitial]);

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
      const next = [...prev];
      const item = next[sIdx];
      next[sIdx] = null;
      next[dIdx] = item;
      return next;
    });
  };

  return (
    <div className="flex justify-center overflow-x-auto pb-2">
      <DragDropContext onDragEnd={isAdmin ? onDragEnd : undefined}>
        <div className="grid grid-flow-col gap-3" style={{ gridTemplateRows: `repeat(${perCol}, minmax(0, 1fr))`, gridTemplateColumns: `repeat(${cols}, max-content)`, gridAutoColumns: 'max-content' }}>
          {Array.from({ length: cols * perCol }).map((_, idx) => {
            const c = Math.floor(idx / perCol);
            const r = idx % perCol; // r === 0 is reserved bottom row (droppable placeholders)
            const item = cells[idx];
            const droppableId = `s2-c${c}-r${r}`;

            const isVet = item && ((item.Status === 'Veteran') || ((item.Notes || '').toLowerCase().includes('vet') && item.Status === 'Occupied'));
            const statusKey = item ? (isVet ? 'Veteran' : ((statusColors && statusColors[item.Status]) ? item.Status : 'Default')) : 'Default';
            const fullClass = (statusColors && statusColors[statusKey]) || '';
            const bgClass = (fullClass.split(' ').find(cn => cn.startsWith('bg-'))) || 'bg-gray-400';
            const textClass = STATUS_TEXT[statusKey] || STATUS_TEXT.Default;

            const CellWrapper = ({ children }) => (
              <div className={`relative transition-all duration-200 ease-in-out ${baseColorClass} opacity-90 hover:opacity-100 border rounded-[1px] w-16 h-8 m-0.5`}>{children}</div>
            );

            return (
              <Droppable key={droppableId} droppableId={droppableId} isDropDisabled={!isAdmin}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="flex">
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
                            <CellWrapper>
                              <div className="flex flex-row items-center justify-between px-1.5 w-full h-full text-[8px] overflow-hidden select-none font-bold shadow-sm cursor-pointer">
                                <span className={`text-[10px] leading-none font-black ${textClass}`}>{item.Grave}</span>
                                <span className="text-[8px] leading-none text-gray-600 font-mono tracking-tighter truncate max-w-full">{item.Row}</span>
                                <div className={`w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm ${bgClass}`}></div>
                              </div>
                            </CellWrapper>
                          </div>
                        )}
                      </Draggable>
                    ) : (
                      // Placeholder cell: remain blank, but is droppable (including bottom row r===0)
                      <CellWrapper>
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