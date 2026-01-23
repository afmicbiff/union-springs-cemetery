import React, { useState, useCallback, useMemo } from "react";

// Inject optimized CSS for selection animations
if (typeof document !== 'undefined' && !document.getElementById('dnd-perf-styles')) {
  const style = document.createElement('style');
  style.id = 'dnd-perf-styles';
  style.textContent = `
    .plot-cell {
      will-change: auto;
      contain: layout style;
    }
    .plot-cell:hover {
      will-change: transform;
    }
    .plot-selected {
      animation: plotPulse 1s ease-in-out infinite;
    }
    @keyframes plotPulse {
      0%, 100% { box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5); }
      50% { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.3); }
    }
  `;
  document.head.appendChild(style);
}

const STATUS_COLORS_MAP = {
  'Available': 'bg-green-500',
  'Reserved': 'bg-yellow-400',
  'Occupied': 'bg-red-500',
  'Veteran': 'bg-blue-600',
  'Unavailable': 'bg-gray-600',
  'Unknown': 'bg-purple-500',
  'Not Usable': 'bg-gray-800',
  'Default': 'bg-gray-300'
};

function parseNum(g) {
  const n = parseInt(String(g || "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

const PlotCell = React.memo(({ plot, provided, snapshot, isAdmin, onHover, onEdit, baseColorClass, sectionKey }) => {
  if (!plot || plot.isSpacer) return null;
  
  const plotNum = parseNum(plot.Grave);
  const isVet = plot.Status === 'Veteran' || ((plot.Notes || '').toLowerCase().includes('vet') && plot.Status === 'Occupied');
  const statusKey = isVet ? 'Veteran' : (STATUS_COLORS_MAP[plot.Status] ? plot.Status : 'Default');
  const bgClass = STATUS_COLORS_MAP[statusKey] || STATUS_COLORS_MAP.Default;

  // Optimize style computation
  const style = useMemo(() => ({
    ...provided.draggableProps.style,
    // Use GPU-accelerated transforms
    transform: provided.draggableProps.style?.transform 
      ? `${provided.draggableProps.style.transform} translateZ(0)` 
      : undefined,
  }), [provided.draggableProps.style]);

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      id={`plot-${sectionKey}-${plotNum}`}
      data-section={sectionKey}
      data-plot-num={plotNum}
      className={`
        ${baseColorClass} border rounded-[1px] w-16 h-8 px-1.5 m-0.5 
        flex items-center justify-between text-[8px] font-bold
        plot-cell
        ${isAdmin ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
        ${snapshot.isDragging 
          ? 'shadow-2xl scale-105 ring-2 ring-blue-500 z-50 bg-white plot-dragging' 
          : 'hover:shadow-md hover:scale-[1.02]'}
        plot-element
      `}
      style={style}
      onMouseEnter={(e) => !snapshot.isDragging && onHover?.(e, plot)}
      onMouseLeave={() => onHover?.(null, null)}
      onClick={(e) => {
        e.stopPropagation();
        if (!snapshot.isDragging && isAdmin && onEdit) onEdit(plot);
      }}
      title={isAdmin ? `Drag to move • Plot ${plot.Grave}` : `Plot ${plot.Grave}`}
    >
      <span className="text-[10px] leading-none font-black text-gray-800">{plot.Grave}</span>
      <span className="text-[8px] leading-none text-gray-500 font-mono truncate">{plot.Row}</span>
      <div className={`w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm ${bgClass}`} />
    </div>
  );
}, (prev, next) => {
  // Custom comparison for better memo performance
  return prev.plot?._id === next.plot?._id 
    && prev.snapshot.isDragging === next.snapshot.isDragging
    && prev.isAdmin === next.isAdmin;
});

const SpacerCell = React.memo(({ provided, snapshot, isAdmin, onEdit, sectionKey, colIdx, rowIdx }) => {
  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (isAdmin && onEdit) {
      onEdit({ isSpacer: true, Section: sectionKey, suggestedSection: sectionKey });
    }
  }, [isAdmin, onEdit, sectionKey]);

  return (
    <div
      ref={provided.innerRef}
      {...provided.droppableProps}
      className={`
        w-16 h-8 m-0.5 border border-dashed rounded-[1px] 
        flex items-center justify-center plot-cell
        ${snapshot.isDraggingOver 
          ? 'border-green-500 bg-green-100 border-2 scale-105 shadow-lg' 
          : 'border-gray-300 bg-gray-50/50'}
        ${isAdmin && !snapshot.isDraggingOver ? 'hover:bg-green-50 hover:border-green-300 cursor-pointer' : ''}
      `}
      onClick={handleClick}
      title={isAdmin ? "Drop plot here or click to create new" : ""}
    >
      {snapshot.isDraggingOver ? (
        <span className="text-[9px] text-green-600 font-bold">Drop</span>
      ) : (
        isAdmin && <span className="text-[8px] text-gray-400">+</span>
      )}
      {provided.placeholder}
    </div>
  );
}, (prev, next) => prev.snapshot.isDraggingOver === next.snapshot.isDraggingOver && prev.isAdmin === next.isAdmin);

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
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback((start) => {
    setIsDragging(true);
    // Reduce repaints during drag
    document.body.style.cursor = 'grabbing';
  }, []);

  const handleDragEnd = useCallback((result) => {
    setIsDragging(false);
    document.body.style.cursor = '';
    
    const { destination, draggableId } = result;
    
    if (!destination || !onMovePlot) return;
    if (!draggableId.startsWith('plot-')) return;
    
    const plotId = draggableId.replace('plot-', '');
    const destId = destination.droppableId;
    
    // Parse destination: "spacer-5-col3-row7" or "col-5-3"
    if (destId.startsWith('spacer-')) {
      const parts = destId.split('-');
      const targetSection = parts[1];
      const colIdx = parseInt(parts[2].replace('col', ''), 10);
      const rowIdx = parseInt(parts[3].replace('row', ''), 10);
      
      onMovePlot({ plotId, targetSection, targetColIndex: colIdx, targetRowIndex: rowIdx });
    }
  }, [onMovePlot]);

  // Memoize column keys for stable rendering
  const columnKeys = useMemo(() => 
    columns.map((_, idx) => `col-${sectionKey}-${idx}`), 
    [columns.length, sectionKey]
  );

  if (!isAdmin) {
    // Non-admin: render without drag-and-drop
    return (
      <div className="flex gap-4 justify-center overflow-x-auto pb-4">
        {columns.map((colPlots, colIdx) => (
          <div
            key={`col-${colIdx}`}
            className="flex flex-col-reverse gap-1 items-center justify-start min-w-[4rem] border-r border-dashed border-purple-200 last:border-0 pr-2"
          >
            {colPlots.map((plot, rowIdx) => {
              if (!plot || plot.isSpacer) {
                return <div key={`spacer-${colIdx}-${rowIdx}`} className="w-16 h-8 m-0.5" />;
              }
              const plotNum = parseNum(plot.Grave);
              const isVet = plot.Status === 'Veteran' || ((plot.Notes || '').toLowerCase().includes('vet') && plot.Status === 'Occupied');
              const statusKey = isVet ? 'Veteran' : (STATUS_COLORS_MAP[plot.Status] ? plot.Status : 'Default');
              const bgClass = STATUS_COLORS_MAP[statusKey] || STATUS_COLORS_MAP.Default;
              
              return (
                <div
                  key={plot._id || `plot-${colIdx}-${rowIdx}`}
                  id={`plot-${sectionKey}-${plotNum}`}
                  data-section={sectionKey}
                  data-plot-num={plotNum}
                  className={`${baseColorClass} border rounded-[1px] w-16 h-8 px-1.5 m-0.5 flex items-center justify-between text-[8px] font-bold cursor-pointer hover:shadow-md plot-element`}
                  onMouseEnter={(e) => onHover?.(e, plot)}
                  onMouseLeave={() => onHover?.(null, null)}
                >
                  <span className="text-[10px] leading-none font-black text-gray-800">{plot.Grave}</span>
                  <span className="text-[8px] leading-none text-gray-500 font-mono truncate">{plot.Row}</span>
                  <div className={`w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm ${bgClass}`} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  return (
    <DragDropContext 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 justify-center overflow-x-auto pb-4">
        {columns.map((colPlots, colIdx) => (
          <Droppable 
            key={columnKeys[colIdx]} 
            droppableId={columnKeys[colIdx]}
            direction="vertical"
            mode="standard"
          >
            {(colProvided, colSnapshot) => (
              <div
                ref={colProvided.innerRef}
                {...colProvided.droppableProps}
                className={`flex flex-col-reverse gap-1 items-center justify-start min-w-[4rem] border-r border-dashed border-purple-200 last:border-0 pr-2 ${
                  colSnapshot.isDraggingOver ? 'bg-purple-50/30' : ''
                }`}
              >
                {colPlots.map((plot, rowIdx) => {
                  const isSpacer = !plot || plot.isSpacer;
                  const uniqueKey = isSpacer 
                    ? `spacer-${sectionKey}-${colIdx}-${rowIdx}` 
                    : `plot-${plot._id}`;

                  if (isSpacer) {
                    return (
                      <Droppable
                        key={uniqueKey}
                        droppableId={`spacer-${sectionKey}-col${colIdx}-row${rowIdx}`}
                        direction="vertical"
                        mode="standard"
                      >
                        {(spacerProvided, spacerSnapshot) => (
                          <SpacerCell
                            provided={spacerProvided}
                            snapshot={spacerSnapshot}
                            isAdmin={isAdmin}
                            onEdit={onEdit}
                            sectionKey={sectionKey}
                            colIdx={colIdx}
                            rowIdx={rowIdx}
                          />
                        )}
                      </Droppable>
                    );
                  }

                  return (
                    <Draggable 
                      key={uniqueKey} 
                      draggableId={uniqueKey} 
                      index={rowIdx}
                    >
                      {(dragProvided, dragSnapshot) => (
                        <PlotCell
                          plot={plot}
                          provided={dragProvided}
                          snapshot={dragSnapshot}
                          isAdmin={isAdmin}
                          onHover={onHover}
                          onEdit={onEdit}
                          baseColorClass={baseColorClass}
                          sectionKey={sectionKey}
                        />
                      )}
                    </Draggable>
                  );
                })}
                {colProvided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}