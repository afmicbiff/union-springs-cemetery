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

const PlotCell = React.memo(({ plot, isAdmin, onHover, onEdit, baseColorClass, sectionKey, isSelected, onCtrlClick }) => {
  if (!plot || plot.isSpacer) return null;
  
  const plotNum = parseNum(plot.Grave);
  const isVet = plot.Status === 'Veteran' || ((plot.Notes || '').toLowerCase().includes('vet') && plot.Status === 'Occupied');
  const statusKey = isVet ? 'Veteran' : (STATUS_COLORS_MAP[plot.Status] ? plot.Status : 'Default');
  const bgClass = STATUS_COLORS_MAP[statusKey] || STATUS_COLORS_MAP.Default;

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (isAdmin && e.ctrlKey && onCtrlClick) {
      // Ctrl+click to select plot for moving
      onCtrlClick(plot);
    } else if (isAdmin && onEdit) {
      onEdit(plot);
    }
  }, [isAdmin, onEdit, onCtrlClick, plot]);

  return (
    <div
      id={`plot-${sectionKey}-${plotNum}`}
      data-section={sectionKey}
      data-plot-num={plotNum}
      className={`
        ${baseColorClass} border rounded-[1px] w-16 h-8 px-1.5 m-0.5 
        flex items-center justify-between text-[8px] font-bold
        plot-cell cursor-pointer
        ${isSelected ? 'ring-4 ring-blue-500 bg-blue-100 scale-105 z-20 plot-selected' : 'hover:shadow-md hover:scale-[1.02]'}
        plot-element
      `}
      onMouseEnter={(e) => onHover?.(e, plot)}
      onMouseLeave={() => onHover?.(null, null)}
      onClick={handleClick}
      title={isAdmin ? `Ctrl+Click to select for move • Plot ${plot.Grave}` : `Plot ${plot.Grave}`}
    >
      <span className="text-[10px] leading-none font-black text-gray-800">{plot.Grave}</span>
      <span className="text-[8px] leading-none text-gray-500 font-mono truncate">{plot.Row}</span>
      <div className={`w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm ${bgClass}`} />
    </div>
  );
}, (prev, next) => {
  return prev.plot?._id === next.plot?._id 
    && prev.isAdmin === next.isAdmin
    && prev.isSelected === next.isSelected;
});

const SpacerCell = React.memo(({ isAdmin, onEdit, sectionKey, colIdx, rowIdx, selectedPlot, onMoveToSpacer }) => {
  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (isAdmin && selectedPlot && onMoveToSpacer) {
      // Click on spacer to move selected plot here
      onMoveToSpacer({ colIdx, rowIdx });
    } else if (isAdmin && onEdit) {
      onEdit({ isSpacer: true, Section: sectionKey, suggestedSection: sectionKey });
    }
  }, [isAdmin, onEdit, sectionKey, selectedPlot, onMoveToSpacer, colIdx, rowIdx]);

  const hasSelectedPlot = !!selectedPlot;

  return (
    <div
      className={`
        w-16 h-8 m-0.5 border border-dashed rounded-[1px] 
        flex items-center justify-center plot-cell
        ${hasSelectedPlot 
          ? 'border-green-500 bg-green-100 hover:bg-green-200 hover:border-green-600 cursor-pointer border-2' 
          : 'border-gray-300 bg-gray-50/50'}
        ${isAdmin && !hasSelectedPlot ? 'hover:bg-green-50 hover:border-green-300 cursor-pointer' : ''}
      `}
      onClick={handleClick}
      title={hasSelectedPlot ? `Click to move Plot ${selectedPlot.Grave} here` : (isAdmin ? "Click to create new plot" : "")}
    >
      {hasSelectedPlot ? (
        <span className="text-[9px] text-green-600 font-bold">Move Here</span>
      ) : (
        isAdmin && <span className="text-[8px] text-gray-400">+</span>
      )}
    </div>
  );
});

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
  // Track which plot is selected for moving (Ctrl+Click to select, then click spacer to move)
  const [selectedPlotForMove, setSelectedPlotForMove] = useState(null);

  const handleCtrlClick = useCallback((plot) => {
    if (selectedPlotForMove?._id === plot._id) {
      // Clicking same plot deselects it
      setSelectedPlotForMove(null);
    } else {
      setSelectedPlotForMove(plot);
    }
  }, [selectedPlotForMove]);

  const handleMoveToSpacer = useCallback(({ colIdx, rowIdx }) => {
    if (!selectedPlotForMove || !onMovePlot) return;
    
    onMovePlot({ 
      plotId: selectedPlotForMove._id, 
      targetSection: sectionKey, 
      targetColIndex: colIdx, 
      targetRowIndex: rowIdx 
    });
    
    // Clear selection after move
    setSelectedPlotForMove(null);
  }, [selectedPlotForMove, onMovePlot, sectionKey]);

  // Cancel selection on Escape key
  React.useEffect(() => {
    if (!selectedPlotForMove) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedPlotForMove(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPlotForMove]);

  if (!isAdmin) {
    // Non-admin: render without move functionality
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
    <div className="relative">
      {/* Selection indicator banner */}
      {selectedPlotForMove && (
        <div className="absolute -top-8 left-0 right-0 bg-blue-500 text-white text-xs px-3 py-1 rounded-t-lg flex items-center justify-between z-30">
          <span>
            <strong>Plot {selectedPlotForMove.Grave}</strong> selected — Click an empty slot to move it there
          </span>
          <button 
            onClick={() => setSelectedPlotForMove(null)}
            className="ml-2 px-2 py-0.5 bg-blue-600 hover:bg-blue-700 rounded text-xs"
          >
            Cancel (Esc)
          </button>
        </div>
      )}
      
      <div className="flex gap-4 justify-center overflow-x-auto pb-4">
        {columns.map((colPlots, colIdx) => (
          <div
            key={`col-${colIdx}`}
            className="flex flex-col-reverse gap-1 items-center justify-start min-w-[4rem] border-r border-dashed border-purple-200 last:border-0 pr-2"
          >
            {colPlots.map((plot, rowIdx) => {
              const isSpacer = !plot || plot.isSpacer;
              const uniqueKey = isSpacer 
                ? `spacer-${sectionKey}-${colIdx}-${rowIdx}` 
                : `plot-${plot._id}`;

              if (isSpacer) {
                return (
                  <SpacerCell
                    key={uniqueKey}
                    isAdmin={isAdmin}
                    onEdit={onEdit}
                    sectionKey={sectionKey}
                    colIdx={colIdx}
                    rowIdx={rowIdx}
                    selectedPlot={selectedPlotForMove}
                    onMoveToSpacer={handleMoveToSpacer}
                  />
                );
              }

              return (
                <PlotCell
                  key={uniqueKey}
                  plot={plot}
                  isAdmin={isAdmin}
                  onHover={onHover}
                  onEdit={onEdit}
                  baseColorClass={baseColorClass}
                  sectionKey={sectionKey}
                  isSelected={selectedPlotForMove?._id === plot._id}
                  onCtrlClick={handleCtrlClick}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}