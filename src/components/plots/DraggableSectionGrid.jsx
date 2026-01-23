import React, { useState, useCallback } from "react";
import PlotContextMenu from "./PlotContextMenu";

// Inject CSS for selection animations
if (typeof document !== 'undefined' && !document.getElementById('dnd-perf-styles')) {
  const style = document.createElement('style');
  style.id = 'dnd-perf-styles';
  style.textContent = `
    .plot-cell { contain: layout style; }
    .plot-selected {
      animation: plotPulse 0.6s ease-in-out infinite !important;
      background-color: #fde047 !important;
      border-color: #ca8a04 !important;
      z-index: 100 !important;
      transform: scale(1.1) !important;
    }
    @keyframes plotPulse {
      0%, 100% { box-shadow: 0 0 0 4px rgba(234, 179, 8, 1), 0 0 16px rgba(234, 179, 8, 0.8); }
      50% { box-shadow: 0 0 0 8px rgba(234, 179, 8, 0.6), 0 0 24px rgba(234, 179, 8, 0.5); }
    }
    .drop-target {
      background-color: #bbf7d0 !important;
      border-color: #22c55e !important;
      border-style: solid !important;
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

// Simple Plot Cell - shows plot data
const PlotCell = React.memo(({ plot, isAdmin, onHover, onEdit, baseColorClass, sectionKey, isSelected, onSelect, onCtrlClick }) => {
  const isVet = plot.Status === 'Veteran' || ((plot.Notes || '').toLowerCase().includes('vet') && plot.Status === 'Occupied');
  const statusKey = isVet ? 'Veteran' : (STATUS_COLORS_MAP[plot.Status] ? plot.Status : 'Default');
  const bgClass = STATUS_COLORS_MAP[statusKey] || STATUS_COLORS_MAP.Default;

  const handleClick = (e) => {
    e.stopPropagation();
    
    // Ctrl+Click or Cmd+Click opens context menu
    if (isAdmin && (e.ctrlKey || e.metaKey) && onCtrlClick) {
      e.preventDefault();
      onCtrlClick(plot);
      return;
    }
    
    // Regular click selects for moving
    if (isAdmin && onSelect) {
      onSelect(plot);
    }
  };

  const handleContextMenu = (e) => {
    // Right-click also opens context menu
    if (isAdmin && onCtrlClick) {
      e.preventDefault();
      e.stopPropagation();
      onCtrlClick(plot);
    }
  };

  const handleMouseDown = (e) => {
    // Ctrl+Click or Cmd+Click - prevent default selection behavior
    if (isAdmin && (e.ctrlKey || e.metaKey)) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  return (
    <div
      className={`
        plot-cell cursor-pointer transition-all duration-150
        border rounded w-16 h-8 px-1.5 m-0.5
        flex items-center justify-between text-[8px] font-bold
        ${isSelected ? 'plot-selected' : `${baseColorClass} hover:shadow-md hover:scale-105`}
      `}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      onMouseEnter={(e) => onHover?.(e, plot)}
      onMouseLeave={() => onHover?.(null, null)}
      title={isAdmin ? `Click to select • Right-click or Ctrl+Click for actions • Plot ${plot.Grave}` : `Plot ${plot.Grave}`}
    >
      <span className={`text-[10px] leading-none font-black ${isSelected ? 'text-yellow-900' : 'text-gray-800'}`}>
        {plot.Grave}
      </span>
      <span className={`text-[8px] leading-none font-mono truncate ${isSelected ? 'text-yellow-800' : 'text-gray-500'}`}>
        {plot.Row}
      </span>
      <div className={`w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm ${bgClass}`} />
    </div>
  );
});

// Empty Cell - drop target for moving plots
const EmptyCell = React.memo(({ isAdmin, sectionKey, gridIndex, selectedPlot, onMovePlot, onEdit }) => {
  const hasSelection = !!selectedPlot;

  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('EmptyCell handleClick:', { hasSelection, selectedPlot, onMovePlot: !!onMovePlot, sectionKey });
    if (hasSelection && onMovePlot && selectedPlot) {
      // Move the selected plot to this section (keep its plot_number)
      console.log('EmptyCell calling onMovePlot with:', {
        plotId: selectedPlot._id,
        targetSection: sectionKey,
        plot: selectedPlot
      });
      onMovePlot({
        plotId: selectedPlot._id,
        targetSection: sectionKey,
        gridIndex,
        plot: selectedPlot
      });
    } else if (isAdmin && onEdit) {
      // Create new plot
      onEdit({ isSpacer: true, Section: sectionKey, suggestedSection: sectionKey });
    }
  };

  const handlePointerUp = (e) => {
    // Use pointerup as backup since ZoomPan may intercept clicks
    e.stopPropagation();
    console.log('EmptyCell pointerUp:', { hasSelection, selectedPlot: selectedPlot?._id });
    if (hasSelection && onMovePlot && selectedPlot) {
      console.log('EmptyCell pointerUp calling onMovePlot');
      onMovePlot({
        plotId: selectedPlot._id,
        targetSection: sectionKey,
        gridIndex,
        plot: selectedPlot
      });
    }
  };

  return (
    <div
      className={`
        w-16 h-8 m-0.5 border border-dashed rounded flex items-center justify-center plot-element
        ${hasSelection 
          ? 'drop-target cursor-pointer border-2 animate-pulse' 
          : 'border-gray-300 bg-gray-50/50'}
        ${isAdmin && !hasSelection ? 'hover:bg-green-50 hover:border-green-300 cursor-pointer' : ''}
      `}
      onClick={handleClick}
      onPointerUp={hasSelection ? handlePointerUp : undefined}
      title={hasSelection ? `Click to move Plot ${selectedPlot.Grave} here` : (isAdmin ? 'Click to create new plot' : '')}
    >
      {hasSelection ? (
        <span className="text-[9px] text-green-700 font-bold">+ Move</span>
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
  isAdmin, 
  onHover, 
  onEdit,
  onMovePlot,
  onAddBlankAbove,
  onDeleteAndShift
}) {
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [contextMenuPlot, setContextMenuPlot] = useState(null);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

  const handleSelectPlot = useCallback((plot) => {
    setSelectedPlot(prev => prev?._id === plot._id ? null : plot);
  }, []);

  const handleCtrlClick = useCallback((plot) => {
    setContextMenuPlot(plot);
    setIsContextMenuOpen(true);
  }, []);

  const handleMovePlot = useCallback((moveData) => {
    console.log('DraggableSectionGrid handleMovePlot called:', moveData, 'onMovePlot exists:', !!onMovePlot);
    if (!onMovePlot) {
      console.error('onMovePlot is not defined!');
      return;
    }
    
    // Clear selection first
    setSelectedPlot(null);
    
    // Move plot - only update section, keep plot_number the same
    console.log('Calling parent onMovePlot...');
    onMovePlot({
      plotId: moveData.plotId,
      targetSection: moveData.targetSection,
      plot: moveData.plot
    });
  }, [onMovePlot]);

  // Cancel selection on Escape
  React.useEffect(() => {
    if (!selectedPlot) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedPlot(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPlot]);

  // Flatten columns into a simple grid
  const maxRows = Math.max(...columns.map(col => col.length), 1);

  return (
    <div className="relative">
      {/* Selection indicator */}
      {selectedPlot && (
        <div className="absolute -top-10 left-0 right-0 bg-blue-600 text-white text-sm px-4 py-2 rounded-t-lg flex items-center justify-between z-30 shadow-lg">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></span>
            <strong>Plot {selectedPlot.Grave}</strong> selected — Click any green cell to move it there
          </span>
          <button 
            onClick={() => setSelectedPlot(null)}
            className="ml-3 px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-xs font-bold"
          >
            ✕ Cancel (Esc)
          </button>
        </div>
      )}

      {/* Context Menu Dialog */}
      <PlotContextMenu
        isOpen={isContextMenuOpen}
        onClose={() => setIsContextMenuOpen(false)}
        plot={contextMenuPlot}
        onAddBlankAbove={onAddBlankAbove}
        onDeleteAndShift={onDeleteAndShift}
        canDelete={isAdmin}
      />

      <div className="flex gap-2 justify-center overflow-x-auto pb-4">
        {columns.map((colPlots, colIdx) => (
          <div
            key={`col-${colIdx}`}
            className="flex flex-col-reverse gap-1 items-center min-w-[4rem] border-r border-dashed border-gray-200 last:border-0 pr-2"
          >
            {Array.from({ length: maxRows }).map((_, rowIdx) => {
              const plot = colPlots[rowIdx];
              const isSpacer = !plot || plot.isSpacer;
              const key = isSpacer 
                ? `empty-${colIdx}-${rowIdx}` 
                : `plot-${plot._id || `${colIdx}-${rowIdx}`}`;

              if (isSpacer) {
                return (
                  <EmptyCell
                    key={key}
                    isAdmin={isAdmin}
                    sectionKey={sectionKey}
                    gridIndex={colIdx * maxRows + rowIdx}
                    selectedPlot={selectedPlot}
                    onMovePlot={handleMovePlot}
                    onEdit={onEdit}
                    hasSelection={!!selectedPlot}
                  />
                );
              }

              return (
                <PlotCell
                  key={key}
                  plot={plot}
                  isAdmin={isAdmin}
                  onHover={onHover}
                  onEdit={onEdit}
                  baseColorClass={baseColorClass}
                  sectionKey={sectionKey}
                  isSelected={selectedPlot?._id === plot._id}
                  onSelect={handleSelectPlot}
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