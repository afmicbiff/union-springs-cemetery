import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import { Move, RotateCcw } from 'lucide-react';

const MIN_SIZE = 120;
const HANDLE_SIZE = 12;

const ResizableBackgroundImage = memo(function ResizableBackgroundImage({ src }) {
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const dragState = useRef(null);

  // Image box state: position + size (pixels)
  const [box, setBox] = useState(() => {
    const saved = sessionStorage.getItem('bg_img_box');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return { x: 60, y: 120, w: 500, h: 400 };
  });

  // Persist on change
  useEffect(() => {
    sessionStorage.setItem('bg_img_box', JSON.stringify(box));
  }, [box]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    setBox({ x: 60, y: 120, w: 500, h: 400 });
  }, []);

  // --- DRAG TO MOVE ---
  const onMoveStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragState.current = { type: 'move', startX: clientX, startY: clientY, origBox: { ...box } };

    const onMove = (ev) => {
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const dx = cx - dragState.current.startX;
      const dy = cy - dragState.current.startY;
      setBox(prev => ({
        ...prev,
        x: dragState.current.origBox.x + dx,
        y: dragState.current.origBox.y + dy,
      }));
    };
    const onUp = () => {
      dragState.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  }, [box]);

  // --- RESIZE HANDLES ---
  const onResizeStart = useCallback((e, handle) => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragState.current = { type: 'resize', handle, startX: clientX, startY: clientY, origBox: { ...box } };

    const onMove = (ev) => {
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const dx = cx - dragState.current.startX;
      const dy = cy - dragState.current.startY;
      const ob = dragState.current.origBox;
      const h = dragState.current.handle;
      let { x, y, w, hh } = { x: ob.x, y: ob.y, w: ob.w, hh: ob.h };

      // Corners
      if (h.includes('r')) { w = Math.max(MIN_SIZE, ob.w + dx); }
      if (h.includes('l')) { w = Math.max(MIN_SIZE, ob.w - dx); x = ob.x + (ob.w - w); }
      if (h.includes('b')) { hh = Math.max(MIN_SIZE, ob.h + dy); }
      if (h.includes('t')) { hh = Math.max(MIN_SIZE, ob.h - dy); y = ob.y + (ob.h - hh); }

      setBox({ x, y, w, h: hh });
    };
    const onUp = () => {
      dragState.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  }, [box]);

  // Handle definitions: position + cursor
  const handles = [
    { key: 'tl', cursor: 'nwse-resize', style: { top: -HANDLE_SIZE/2, left: -HANDLE_SIZE/2 } },
    { key: 'tr', cursor: 'nesw-resize', style: { top: -HANDLE_SIZE/2, right: -HANDLE_SIZE/2 } },
    { key: 'bl', cursor: 'nesw-resize', style: { bottom: -HANDLE_SIZE/2, left: -HANDLE_SIZE/2 } },
    { key: 'br', cursor: 'nwse-resize', style: { bottom: -HANDLE_SIZE/2, right: -HANDLE_SIZE/2 } },
    { key: 't',  cursor: 'ns-resize',   style: { top: -HANDLE_SIZE/2, left: '50%', transform: 'translateX(-50%)' } },
    { key: 'b',  cursor: 'ns-resize',   style: { bottom: -HANDLE_SIZE/2, left: '50%', transform: 'translateX(-50%)' } },
    { key: 'l',  cursor: 'ew-resize',   style: { top: '50%', left: -HANDLE_SIZE/2, transform: 'translateY(-50%)' } },
    { key: 'r',  cursor: 'ew-resize',   style: { top: '50%', right: -HANDLE_SIZE/2, transform: 'translateY(-50%)' } },
  ];

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[1] pointer-events-none overflow-hidden"
      style={{ isolation: 'isolate' }}
    >
      {/* The resizable image frame */}
      <div
        className="absolute pointer-events-auto group"
        style={{
          left: box.x,
          top: box.y,
          width: box.w,
          height: box.h,
        }}
      >
        {/* Image */}
        <img
          ref={imgRef}
          src={src}
          alt=""
          className="w-full h-full object-contain select-none"
          draggable={false}
          loading="lazy"
          decoding="async"
        />

        {/* Selection border - visible on hover */}
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-teal-500/60 rounded transition-colors pointer-events-none" />

        {/* Dashed guide lines on hover */}
        <div className="absolute inset-0 border border-dashed border-transparent group-hover:border-teal-400/30 pointer-events-none" />

        {/* Move handle - center top bar */}
        <div
          className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm rounded-md shadow-md border border-gray-200 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-move pointer-events-auto"
          onMouseDown={onMoveStart}
          onTouchStart={onMoveStart}
        >
          <Move className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-[10px] text-gray-500 font-medium select-none">Drag to move</span>
          <button
            className="ml-1 p-0.5 rounded hover:bg-gray-100 transition-colors"
            onClick={handleReset}
            title="Reset position & size"
          >
            <RotateCcw className="w-3 h-3 text-gray-400" />
          </button>
        </div>

        {/* Size indicator */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          {Math.round(box.w)} × {Math.round(box.h)}
        </div>

        {/* Resize handles */}
        {handles.map(({ key, cursor, style }) => (
          <div
            key={key}
            className="absolute opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
            style={{
              ...style,
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              cursor,
              zIndex: 10,
            }}
            onMouseDown={(e) => onResizeStart(e, key)}
            onTouchStart={(e) => onResizeStart(e, key)}
          >
            <div className={`w-full h-full rounded-full bg-white border-2 border-teal-500 shadow-sm ${
              key.length === 2 ? 'scale-110' : 'scale-100'
            }`} />
          </div>
        ))}
      </div>
    </div>
  );
});

export default ResizableBackgroundImage;