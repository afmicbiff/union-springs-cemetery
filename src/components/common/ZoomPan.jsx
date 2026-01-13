import React from "react";

export default function ZoomPan({ children, className = "", minScale = 0.4, maxScale = 2.5, initialScale = 1 }) {
  const containerRef = React.useRef(null);
  const contentRef = React.useRef(null);

  const [scale, setScale] = React.useState(initialScale);
  const [tx, setTx] = React.useState(0);
  const [ty, setTy] = React.useState(0);

  // Controls visibility on small screens
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // Apply transform efficiently
  const applyTransform = React.useCallback(() => {
    if (!contentRef.current) return;
    contentRef.current.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }, [tx, ty, scale]);

  React.useEffect(() => { applyTransform(); }, [applyTransform]);

  // Drag/Pan (mouse and single-finger touch)
  const stateRef = React.useRef({ dragging: false, startX: 0, startY: 0, startTx: 0, startTy: 0 });

  const onPointerDown = (e) => {
    if (!containerRef.current) return;
    containerRef.current.setPointerCapture(e.pointerId);
    stateRef.current.dragging = true;
    stateRef.current.startX = e.clientX;
    stateRef.current.startY = e.clientY;
    stateRef.current.startTx = tx;
    stateRef.current.startTy = ty;
  };
  const onPointerMove = (e) => {
    const st = stateRef.current;
    if (!st.dragging) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    setTx(st.startTx + dx);
    setTy(st.startTy + dy);
  };
  const onPointerUp = (e) => {
    if (!containerRef.current) return;
    try { containerRef.current.releasePointerCapture(e.pointerId); } catch {}
    stateRef.current.dragging = false;
  };

  // Wheel zoom around cursor
  const onWheel = (e) => {
    if (!contentRef.current) return;
    // Allow natural page scroll if not on trackpad (no ctrl) but still support zoom with ctrl/cmd
    const isZoomIntent = e.ctrlKey || e.metaKey || Math.abs(e.deltaY) < 1;
    if (!isZoomIntent) return;
    e.preventDefault();

    const rect = contentRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const prev = scale;
    const next = clamp(prev * (e.deltaY > 0 ? 0.9 : 1.1), minScale, maxScale);
    if (next === prev) return;

    // Adjust translation so the zoom focal point stays under cursor
    const nx = cx / prev;
    const ny = cy / prev;
    const txNew = tx - (nx * (next - prev));
    const tyNew = ty - (ny * (next - prev));

    setScale(next);
    setTx(txNew);
    setTy(tyNew);
  };

  // Pinch zoom (two pointers)
  const pinchRef = React.useRef({ active: false, startDist: 0, startScale: initialScale, centerX: 0, centerY: 0, startTx: 0, startTy: 0, pointers: new Map() });

  const onPinchPointerDown = (e) => {
    pinchRef.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinchRef.current.pointers.size === 2) {
      const pts = Array.from(pinchRef.current.pointers.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      pinchRef.current.startDist = Math.hypot(dx, dy);
      pinchRef.current.startScale = scale;
      pinchRef.current.active = true;
      pinchRef.current.startTx = tx;
      pinchRef.current.startTy = ty;
      // Gesture center (screen coords)
      pinchRef.current.centerX = (pts[0].x + pts[1].x) / 2;
      pinchRef.current.centerY = (pts[0].y + pts[1].y) / 2;
    }
  };
  const onPinchPointerMove = (e) => {
    const pr = pinchRef.current;
    if (pr.active) {
      pr.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = Array.from(pr.pointers.values());
      if (pts.length < 2) return;
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const dist = Math.hypot(dx, dy);
      if (!dist || !pr.startDist) return;
      let next = clamp(pr.startScale * (dist / pr.startDist), minScale, maxScale);

      // Convert gesture center into content-local coords
      const rect = contentRef.current.getBoundingClientRect();
      const cx = pr.centerX - rect.left;
      const cy = pr.centerY - rect.top;
      const nx = cx / scale; // using current scale provides smoother continuity
      const ny = cy / scale;

      const txNew = pr.startTx - (nx * (next - pr.startScale));
      const tyNew = pr.startTy - (ny * (next - pr.startScale));

      setScale(next);
      setTx(txNew);
      setTy(tyNew);
    } else if (stateRef.current.dragging) {
      onPointerMove(e);
    }
  };
  const onPinchPointerUp = (e) => {
    pinchRef.current.pointers.delete(e.pointerId);
    if (pinchRef.current.pointers.size < 2) pinchRef.current.active = false;
    onPointerUp(e);
  };

  const zoomBy = (factor) => setScale((s) => clamp(s * factor, minScale, maxScale));
  const reset = () => { setScale(initialScale); setTx(0); setTy(0); };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden touch-none select-none ${className}`}
      style={{ touchAction: "none" }}
      onPointerDown={(e) => { onPointerDown(e); onPinchPointerDown(e); }}
      onPointerMove={onPinchPointerMove}
      onPointerUp={onPinchPointerUp}
      onPointerCancel={onPinchPointerUp}
      onWheel={onWheel}
    >
      <div ref={contentRef} className="origin-top-left will-change-transform inline-block">
        {children}
      </div>

      {/* Controls */}
      <div className="absolute right-3 top-3 bg-white/90 backdrop-blur rounded-md shadow-md border border-gray-200 p-1 flex flex-col gap-1">
        <button aria-label="Zoom in" className="px-2 py-1 text-sm hover:bg-gray-100 rounded" onClick={() => zoomBy(1.15)}>+</button>
        <button aria-label="Zoom out" className="px-2 py-1 text-sm hover:bg-gray-100 rounded" onClick={() => zoomBy(1/1.15)}>-</button>
        <button aria-label="Reset view" className="px-2 py-1 text-xs hover:bg-gray-100 rounded" onClick={reset}>Reset</button>
      </div>
    </div>
  );
}