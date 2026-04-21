import React, { useState, useRef, useCallback, useEffect } from "react";

/**
 * DraggableResizable - A wrapper that makes its children movable and resizable.
 * - Drag by holding the header bar
 * - Resize by dragging the bottom-right corner
 */
export default function DraggableResizable({
  children,
  initialX = 0,
  initialY = 0,
  initialWidth = 600,
  initialHeight = 400,
  minWidth = 100,
  minHeight = 100,
  label = "",
  zIndex = 1,
  onFocus,
  locked = false,
}) {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const dragRef = useRef(null);
  const resizeRef = useRef(null);

  const startDrag = useCallback((e) => {
    e.preventDefault();
    if (onFocus) onFocus();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = pos.x;
    const origY = pos.y;
    dragRef.current = { startX, startY, origX, origY };

    const onMove = (ev) => {
      if (!dragRef.current) return;
      setPos({
        x: dragRef.current.origX + (ev.clientX - dragRef.current.startX),
        y: dragRef.current.origY + (ev.clientY - dragRef.current.startY),
      });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [pos, onFocus]);

  // corner: 'se' | 'sw' | 'ne' | 'nw'
  const startResize = useCallback((e, corner) => {
    e.preventDefault();
    e.stopPropagation();
    if (onFocus) onFocus();
    resizeRef.current = {
      startX: e.clientX, startY: e.clientY,
      origW: size.width, origH: size.height,
      origX: pos.x, origY: pos.y,
      corner,
    };

    const onMove = (ev) => {
      const r = resizeRef.current;
      if (!r) return;
      const dx = ev.clientX - r.startX;
      const dy = ev.clientY - r.startY;
      let newW = r.origW, newH = r.origH, newX = r.origX, newY = r.origY;

      if (r.corner.includes("e")) {
        newW = Math.max(minWidth, r.origW + dx);
      }
      if (r.corner.includes("s")) {
        newH = Math.max(minHeight, r.origH + dy);
      }
      if (r.corner.includes("w")) {
        newW = Math.max(minWidth, r.origW - dx);
        newX = r.origX + (r.origW - newW);
      }
      if (r.corner.includes("n")) {
        newH = Math.max(minHeight, r.origH - dy);
        newY = r.origY + (r.origH - newH);
      }
      setSize({ width: newW, height: newH });
      setPos({ x: newX, y: newY });
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [size, pos, minWidth, minHeight, onFocus]);

  return (
    <div
      className="absolute"
      style={{
        left: pos.x,
        top: pos.y,
        width: size.width,
        height: size.height,
        zIndex,
      }}
      onMouseDown={onFocus}
    >
      {/* Drag handle header (top) */}
      {!locked && (
        <div
          onMouseDown={startDrag}
          className="absolute -top-7 left-0 right-0 h-7 bg-stone-800/90 text-white text-xs px-2 flex items-center justify-between cursor-move rounded-t-md select-none hover:bg-stone-700"
        >
          <span className="font-medium">⋮⋮ {label}</span>
          <span className="text-stone-400 text-[10px]">{Math.round(size.width)} × {Math.round(size.height)}</span>
        </div>
      )}

      {/* Drag handle - bottom edge */}
      {!locked && (
        <div
          onMouseDown={startDrag}
          className="absolute -bottom-4 left-0 right-0 h-4 bg-stone-800/60 hover:bg-stone-700/80 cursor-move rounded-b-md select-none flex items-center justify-center"
          title="Drag to move"
        >
          <span className="text-white text-[10px] font-medium">⋮⋮</span>
        </div>
      )}

      {/* Drag handle - left edge */}
      {!locked && (
        <div
          onMouseDown={startDrag}
          className="absolute -left-4 top-0 bottom-0 w-4 bg-stone-800/60 hover:bg-stone-700/80 cursor-move rounded-l-md select-none flex items-center justify-center"
          title="Drag to move"
        >
          <span className="text-white text-[10px] font-medium" style={{ writingMode: 'vertical-rl' }}>⋮⋮</span>
        </div>
      )}

      {/* Drag handle - right edge */}
      {!locked && (
        <div
          onMouseDown={startDrag}
          className="absolute -right-4 top-0 bottom-0 w-4 bg-stone-800/60 hover:bg-stone-700/80 cursor-move rounded-r-md select-none flex items-center justify-center"
          title="Drag to move"
        >
          <span className="text-white text-[10px] font-medium" style={{ writingMode: 'vertical-rl' }}>⋮⋮</span>
        </div>
      )}

      {/* Content */}
      <div className="w-full h-full overflow-hidden">
        {typeof children === "function" ? children({ width: size.width, height: size.height }) : children}
      </div>

      {/* Resize handles - all 4 corners (offset outward so they sit outside the overflow-hidden content wrapper) */}
      {!locked && (
        <>
          <div
            onMouseDown={(e) => startResize(e, "se")}
            className="absolute -bottom-2 -right-2 w-6 h-6 bg-teal-600 hover:bg-teal-700 cursor-nwse-resize rounded-sm border-2 border-white shadow-md"
            style={{ zIndex: 20 }}
            title="Drag to resize"
          />
          <div
            onMouseDown={(e) => startResize(e, "sw")}
            className="absolute -bottom-2 -left-2 w-6 h-6 bg-teal-600 hover:bg-teal-700 cursor-nesw-resize rounded-sm border-2 border-white shadow-md"
            style={{ zIndex: 20 }}
            title="Drag to resize"
          />
          <div
            onMouseDown={(e) => startResize(e, "ne")}
            className="absolute -top-2 -right-2 w-6 h-6 bg-teal-600 hover:bg-teal-700 cursor-nesw-resize rounded-sm border-2 border-white shadow-md"
            style={{ zIndex: 20 }}
            title="Drag to resize"
          />
          <div
            onMouseDown={(e) => startResize(e, "nw")}
            className="absolute -top-2 -left-2 w-6 h-6 bg-teal-600 hover:bg-teal-700 cursor-nwse-resize rounded-sm border-2 border-white shadow-md"
            style={{ zIndex: 20 }}
            title="Drag to resize"
          />
        </>
      )}
    </div>
  );
}