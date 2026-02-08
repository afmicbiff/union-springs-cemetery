import React, { memo, useCallback, useState } from 'react';
import { ZoomIn, ZoomOut, Hand, RotateCcw } from 'lucide-react';

const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

const MapControls = memo(function MapControls({ containerRef }) {
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);

  const getMapContainer = useCallback(() => {
    if (containerRef?.current) return containerRef.current;
    return document.querySelector('.map-zoom-container');
  }, [containerRef]);

  const applyZoom = useCallback((newZoom) => {
    const container = getMapContainer();
    if (!container) return;
    
    const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
    setZoom(clampedZoom);
    
    const inner = container.querySelector('.map-zoom-inner');
    if (inner) {
      inner.style.transform = `scale(${clampedZoom})`;
      inner.style.transformOrigin = 'top left';
    }
  }, [getMapContainer]);

  const handleZoomIn = useCallback(() => {
    applyZoom(zoom + ZOOM_STEP);
  }, [zoom, applyZoom]);

  const handleZoomOut = useCallback(() => {
    applyZoom(zoom - ZOOM_STEP);
  }, [zoom, applyZoom]);

  const handleReset = useCallback(() => {
    applyZoom(1);
    const container = getMapContainer();
    if (container) {
      container.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  }, [applyZoom, getMapContainer]);

  const togglePan = useCallback(() => {
    setIsPanning(prev => {
      const newState = !prev;
      const container = getMapContainer();
      if (container) {
        container.style.cursor = newState ? 'grab' : 'default';
        container.dataset.panMode = newState ? 'true' : 'false';
      }
      return newState;
    });
  }, [getMapContainer]);

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-sm px-1 py-0.5 ml-3">
      {/* Zoom Out */}
      <button
        type="button"
        onClick={handleZoomOut}
        disabled={zoom <= MIN_ZOOM}
        className="p-1.5 rounded hover:bg-gray-100 active:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation"
        aria-label="Zoom out"
        title="Zoom out"
      >
        <ZoomOut className="w-4 h-4 text-gray-600" />
      </button>

      {/* Zoom Level Display */}
      <span className="text-[10px] font-mono text-gray-500 min-w-[32px] text-center select-none">
        {zoomPercent}%
      </span>

      {/* Zoom In */}
      <button
        type="button"
        onClick={handleZoomIn}
        disabled={zoom >= MAX_ZOOM}
        className="p-1.5 rounded hover:bg-gray-100 active:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation"
        aria-label="Zoom in"
        title="Zoom in"
      >
        <ZoomIn className="w-4 h-4 text-gray-600" />
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-gray-200 mx-0.5" />

      {/* Pan Toggle */}
      <button
        type="button"
        onClick={togglePan}
        className={`p-1.5 rounded transition-colors touch-manipulation ${
          isPanning 
            ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
            : 'hover:bg-gray-100 active:bg-gray-200 text-gray-600'
        }`}
        aria-label={isPanning ? 'Disable pan mode' : 'Enable pan mode'}
        aria-pressed={isPanning}
        title={isPanning ? 'Click to disable pan mode' : 'Click to enable pan mode'}
      >
        <Hand className="w-4 h-4" />
      </button>

      {/* Reset */}
      <button
        type="button"
        onClick={handleReset}
        disabled={zoom === 1}
        className="p-1.5 rounded hover:bg-gray-100 active:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation"
        aria-label="Reset view"
        title="Reset zoom & position"
      >
        <RotateCcw className="w-4 h-4 text-gray-600" />
      </button>
    </div>
  );
});

export default MapControls;