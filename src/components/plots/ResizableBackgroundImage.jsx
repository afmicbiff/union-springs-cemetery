import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import { Move, RotateCcw } from 'lucide-react';

const MIN_SIZE = 100;

const ResizableBackgroundImage = memo(function ResizableBackgroundImage({ src }) {
  const dragState = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const [box, setBox] = useState(() => {
    const saved = sessionStorage.getItem('bg_img_box');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return { x: 40, y: 100, w: 600, h: 450 };
  });

  useEffect(() => {
    sessionStorage.setItem('bg_img_box', JSON.stringify(box));
  }, [box]);

  const handleReset = useCallback(() => {
    setBox({ x: 40, y: 100, w: 600, h: 450 });
  }, []);

  // Shared drag logic
  const startDrag = useCallback((e, type, handle) => {
    e.preventDefault();
    e.stopPropagation();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    dragState.current = { type, handle, startX: cx, startY: cy, origBox: { ...box } };
    setIsDragging(true);

    const onMove = (ev) => {
      ev.preventDefault();
      const mx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const my = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const dx = mx - dragState.current.startX;
      const dy = my - dragState.current.startY;
      const ob = dragState.current.origBox;

      if (dragState.current.type === 'move') {
        setBox({ ...ob, x: ob.x + dx, y: ob.y + dy });
        return;
      }

      const h = dragState.current.handle;
      let nx = ob.x, ny = ob.y, nw = ob.w, nh = ob.h;

      if (h.includes('r')) nw = Math.max(MIN_SIZE, ob.w + dx);
      if (h.includes('l')) { nw = Math.max(MIN_SIZE, ob.w - dx); nx = ob.x + (ob.w - nw); }
      if (h.includes('b')) nh = Math.max(MIN_SIZE, ob.h + dy);
      if (h.includes('t')) { nh = Math.max(MIN_SIZE, ob.h - dy); ny = ob.y + (ob.h - nh); }

      setBox({ x: nx, y: ny, w: nw, h: nh });
    };

    const onUp = () => {
      dragState.current = null;
      setIsDragging(false);
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

  const active = isDragging || isHovered;

  // Corner handle size
  const CS = 14;
  // Edge bar thickness (the grab zone)
  const ET = 8;

  return (
    <div className="fixed inset-0 z-[5] pointer-events-none overflow-visible" style={{ isolation: 'isolate' }}>
      <div
        className="absolute pointer-events-auto"
        style={{ left: box.x, top: box.y, width: box.w, height: box.h, zIndex: isDragging ? 9999 : 5 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { if (!isDragging) setIsHovered(false); }}
      >
        {/* Image */}
        <img
          src={src}
          alt=""
          className="w-full h-full object-contain select-none"
          draggable={false}
          loading="lazy"
          decoding="async"
        />

        {/* Selection border — always visible with teal, brighter when active */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-150"
          style={{
            border: active ? '2px solid rgba(13,148,136,0.8)' : '2px solid rgba(13,148,136,0.25)',
          }}
        />

        {/* ===== EDGE RESIZE BARS (the thick grabable bars on each side) ===== */}

        {/* Top edge bar */}
        <div
          className="absolute pointer-events-auto"
          style={{ top: -ET/2, left: CS, right: CS, height: ET, cursor: 'ns-resize' }}
          onMouseDown={(e) => startDrag(e, 'resize', 't')}
          onTouchStart={(e) => startDrag(e, 'resize', 't')}
        >
          <div className="mx-auto h-1 rounded-full transition-all duration-150" 
               style={{ 
                 width: active ? '40%' : '20%', 
                 marginTop: ET/2 - 2,
                 background: active ? 'rgba(13,148,136,0.9)' : 'rgba(13,148,136,0.35)',
               }} />
        </div>

        {/* Bottom edge bar */}
        <div
          className="absolute pointer-events-auto"
          style={{ bottom: -ET/2, left: CS, right: CS, height: ET, cursor: 'ns-resize' }}
          onMouseDown={(e) => startDrag(e, 'resize', 'b')}
          onTouchStart={(e) => startDrag(e, 'resize', 'b')}
        >
          <div className="mx-auto h-1 rounded-full transition-all duration-150" 
               style={{ 
                 width: active ? '40%' : '20%', 
                 marginTop: ET/2 - 2,
                 background: active ? 'rgba(13,148,136,0.9)' : 'rgba(13,148,136,0.35)',
               }} />
        </div>

        {/* Left edge bar */}
        <div
          className="absolute pointer-events-auto"
          style={{ left: -ET/2, top: CS, bottom: CS, width: ET, cursor: 'ew-resize' }}
          onMouseDown={(e) => startDrag(e, 'resize', 'l')}
          onTouchStart={(e) => startDrag(e, 'resize', 'l')}
        >
          <div className="h-full flex items-center justify-center">
            <div className="w-1 rounded-full transition-all duration-150"
                 style={{ 
                   height: active ? '40%' : '20%',
                   background: active ? 'rgba(13,148,136,0.9)' : 'rgba(13,148,136,0.35)',
                 }} />
          </div>
        </div>

        {/* Right edge bar */}
        <div
          className="absolute pointer-events-auto"
          style={{ right: -ET/2, top: CS, bottom: CS, width: ET, cursor: 'ew-resize' }}
          onMouseDown={(e) => startDrag(e, 'resize', 'r')}
          onTouchStart={(e) => startDrag(e, 'resize', 'r')}
        >
          <div className="h-full flex items-center justify-center">
            <div className="w-1 rounded-full transition-all duration-150"
                 style={{ 
                   height: active ? '40%' : '20%',
                   background: active ? 'rgba(13,148,136,0.9)' : 'rgba(13,148,136,0.35)',
                 }} />
          </div>
        </div>

        {/* ===== CORNER RESIZE HANDLES (solid white squares with teal border) ===== */}
        {[
          { key: 'tl', cursor: 'nwse-resize', pos: { top: -CS/2, left: -CS/2 } },
          { key: 'tr', cursor: 'nesw-resize', pos: { top: -CS/2, right: -CS/2 } },
          { key: 'bl', cursor: 'nesw-resize', pos: { bottom: -CS/2, left: -CS/2 } },
          { key: 'br', cursor: 'nwse-resize', pos: { bottom: -CS/2, right: -CS/2 } },
        ].map(({ key, cursor, pos }) => (
          <div
            key={key}
            className="absolute pointer-events-auto z-20"
            style={{ ...pos, width: CS, height: CS, cursor }}
            onMouseDown={(e) => startDrag(e, 'resize', key)}
            onTouchStart={(e) => startDrag(e, 'resize', key)}
          >
            <div
              className="w-full h-full rounded-sm shadow-md transition-all duration-150"
              style={{
                background: active ? '#fff' : 'rgba(255,255,255,0.7)',
                border: active ? '2.5px solid rgb(13,148,136)' : '2px solid rgba(13,148,136,0.4)',
                transform: active ? 'scale(1.15)' : 'scale(1)',
              }}
            />
          </div>
        ))}

        {/* ===== MOVE BAR (top center) ===== */}
        <div
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-md shadow-lg border px-2.5 py-1 cursor-move pointer-events-auto transition-all duration-200 select-none"
          style={{
            top: -32,
            background: active ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.8)',
            borderColor: active ? 'rgb(13,148,136)' : '#e5e7eb',
            opacity: active ? 1 : 0.5,
          }}
          onMouseDown={(e) => startDrag(e, 'move')}
          onTouchStart={(e) => startDrag(e, 'move')}
        >
          <Move className="w-3.5 h-3.5 text-teal-600" />
          <span className="text-[10px] text-teal-700 font-semibold">Move</span>
          <button
            className="ml-1 p-0.5 rounded hover:bg-teal-50 transition-colors"
            onClick={(e) => { e.stopPropagation(); handleReset(); }}
            title="Reset position & size"
          >
            <RotateCcw className="w-3 h-3 text-teal-500" />
          </button>
        </div>

        {/* ===== SIZE LABEL (bottom center) ===== */}
        <div
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap transition-opacity duration-200"
          style={{ opacity: active ? 1 : 0 }}
        >
          {Math.round(box.w)} × {Math.round(box.h)}
        </div>
      </div>
    </div>
  );
});

export default ResizableBackgroundImage;