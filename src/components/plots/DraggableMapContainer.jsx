import React, { memo, useRef, useCallback, useState, useEffect } from 'react';
import { GripHorizontal, GripVertical } from 'lucide-react';

const HANDLE_SIZE = 'w-10 h-6'; // top/bottom
const HANDLE_SIZE_V = 'w-6 h-10'; // left/right

const DraggableMapContainer = memo(function DraggableMapContainer({ children }) {
  const containerRef = useRef(null);
  const dragState = useRef({ active: false, startX: 0, startY: 0, origX: 0, origY: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const el = containerRef.current;
    if (!el) return;
    dragState.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: offset.x,
      origY: offset.y,
    };
    el.setPointerCapture?.(e.pointerId);
    document.body.style.userSelect = 'none';
  }, [offset]);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragState.current.active) return;
      const dx = e.clientX - dragState.current.startX;
      const dy = e.clientY - dragState.current.startY;
      setOffset({ x: dragState.current.origX + dx, y: dragState.current.origY + dy });
    };
    const onUp = () => {
      if (dragState.current.active) {
        dragState.current.active = false;
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  const handleClass = "bg-stone-700/80 hover:bg-teal-600 rounded shadow border border-stone-500/50 flex items-center justify-center cursor-grab active:cursor-grabbing z-[10] touch-manipulation transition-colors";

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      {/* Top handle */}
      <div
        onPointerDown={onPointerDown}
        className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 ${HANDLE_SIZE} ${handleClass}`}
        title="Drag to move"
      >
        <GripHorizontal className="w-4 h-3 text-white/80" />
      </div>

      {/* Bottom handle */}
      <div
        onPointerDown={onPointerDown}
        className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 ${HANDLE_SIZE} ${handleClass}`}
        title="Drag to move"
      >
        <GripHorizontal className="w-4 h-3 text-white/80" />
      </div>

      {/* Left handle */}
      <div
        onPointerDown={onPointerDown}
        className={`absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 ${HANDLE_SIZE_V} ${handleClass}`}
        title="Drag to move"
      >
        <GripVertical className="w-3 h-4 text-white/80" />
      </div>

      {/* Right handle */}
      <div
        onPointerDown={onPointerDown}
        className={`absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 ${HANDLE_SIZE_V} ${handleClass}`}
        title="Drag to move"
      >
        <GripVertical className="w-3 h-4 text-white/80" />
      </div>

      {children}
    </div>
  );
});

export default DraggableMapContainer;