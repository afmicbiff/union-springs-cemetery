import React from "react";

const ZoomPan = React.forwardRef(function ZoomPan({ children, className = "", minScale = 0.4, maxScale = 2.5, initialScale = 1, controlsTop }, ref) {
  const containerRef = React.useRef(null);
  const contentRef = React.useRef(null);

  const [scale, setScale] = React.useState(initialScale);
  const [tx, setTx] = React.useState(0);
  const [ty, setTy] = React.useState(0);
  const [forcePan, setForcePan] = React.useState(false);
const inertiaRef = React.useRef({ animId: 0 });

  // Controls visibility on small screens
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // Apply transform efficiently
  const applyTransform = React.useCallback(() => {
    if (!contentRef.current) return;
    contentRef.current.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }, [tx, ty, scale]);

  React.useEffect(() => { applyTransform(); }, [applyTransform]);

  const clampTranslate = React.useCallback((nx, ny, s = scale) => {
    if (!containerRef.current || !contentRef.current) return { x: nx, y: ny };
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const contentW = contentRef.current.scrollWidth * s;
    const contentH = contentRef.current.scrollHeight * s;

    const deltaX = cw - contentW;
    const deltaY = ch - contentH;

    // Allow panning even when content is smaller than the viewport by providing
    // symmetric bounds around 0; when content is larger, clamp to [delta, 0].
    const minX = deltaX > 0 ? -deltaX : deltaX;
    const maxX = deltaX > 0 ?  deltaX : 0;
    const minY = deltaY > 0 ? -deltaY : deltaY;
    const maxY = deltaY > 0 ?  deltaY : 0;

    return { x: clamp(nx, minX, maxX), y: clamp(ny, minY, maxY) };
  }, [scale]);

  const centerOnElement = React.useCallback((element) => {
    if (!containerRef.current || !contentRef.current || !element) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    // Current element center in screen coordinates
    const elCenterScreenX = elementRect.left + elementRect.width / 2;
    const elCenterScreenY = elementRect.top + elementRect.height / 2;

    // Container center in screen coordinates
    const containerCenterScreenX = containerRect.left + containerRect.width / 2;
    const containerCenterScreenY = containerRect.top + containerRect.height / 2;

    // How much we need to move the content so element center aligns with container center
    const deltaX = containerCenterScreenX - elCenterScreenX;
    const deltaY = containerCenterScreenY - elCenterScreenY;

    // Apply delta to current translation
    setTx(prev => prev + deltaX);
    setTy(prev => prev + deltaY);
  }, []);

  const zoomBy = (factor) => setScale((s) => clamp(s * factor, minScale, maxScale));
  const reset = () => {
    setScale(initialScale);
    const cl = clampTranslate(0, 0, initialScale);
    setTx(cl.x);
    setTy(cl.y);
  };

  React.useImperativeHandle(ref, () => ({
    centerOnElement,
    zoomBy,
    reset
  }));

  // Drag/Pan (mouse and single-finger touch)
  const stateRef = React.useRef({ dragging: false, startX: 0, startY: 0, startTx: 0, startTy: 0, allowClickThrough: false, downTarget: null, moved: false, lastX: 0, lastY: 0, lastTime: 0, vx: 0, vy: 0 });

  const onPointerDown = (e) => {
            if (!containerRef.current) return;
            const target = e.target;
            const plotEl = target && typeof target.closest === 'function' ? target.closest('.plot-element') : null;
            const isTouch = e.pointerType === 'touch';
            const shouldPan = isTouch || forcePan || e.button === 1 || e.button === 2 || e.altKey || e.metaKey || e.ctrlKey;
            if (plotEl && !shouldPan) {
              return; // let plot elements handle simple left-clicks (desktop)
            }
            if (inertiaRef.current.animId) { try { cancelAnimationFrame(inertiaRef.current.animId); } catch {} inertiaRef.current.animId = 0; }
            if (e.button === 2) { // right click pan
              e.preventDefault();
            }
            containerRef.current.setPointerCapture(e.pointerId);
            stateRef.current.dragging = true;
            stateRef.current.startX = e.clientX;
            stateRef.current.startY = e.clientY;
            stateRef.current.startTx = tx;
            stateRef.current.startTy = ty;
            stateRef.current.allowClickThrough = !!plotEl;
            stateRef.current.downTarget = plotEl || target;
            stateRef.current.moved = false;
            stateRef.current.lastX = e.clientX;
            stateRef.current.lastY = e.clientY;
            stateRef.current.lastTime = performance.now();
            stateRef.current.vx = 0;
            stateRef.current.vy = 0;
          };
  const onPointerMove = (e) => {
            const st = stateRef.current;
            if (!st.dragging) return;
            const dx = e.clientX - st.startX;
            const dy = e.clientY - st.startY;
            if (!st.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
              st.moved = true;
            }
            const now = performance.now();
            const dt = st.lastTime ? now - st.lastTime : 0;
            if (dt > 0) {
              st.vx = (e.clientX - st.lastX) / dt;
              st.vy = (e.clientY - st.lastY) / dt;
            }
            st.lastX = e.clientX;
            st.lastY = e.clientY;
            st.lastTime = now;
            const clamped = clampTranslate(st.startTx + dx, st.startTy + dy);
            setTx(clamped.x);
            setTy(clamped.y);
          };
  const onPointerUp = (e) => {
            if (!containerRef.current) return;
            try { containerRef.current.releasePointerCapture(e.pointerId); } catch {}
            const st = stateRef.current;
            const wasDragging = st.dragging;
            st.dragging = false;

            // If we started on a plot element, and didn't really move, forward a click to it
            if (wasDragging && st.allowClickThrough && !st.moved && st.downTarget) {
              // Defer to ensure pointerup settles before dispatch
              setTimeout(() => {
                try {
                  st.downTarget.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                } catch {}
              }, 0);
            }

            // Inertial scrolling after swipe (mobile-friendly)
            if (wasDragging && st.moved && !pinchRef.current.active) {
              let vx = st.vx || 0;
              let vy = st.vy || 0;
              if (inertiaRef.current.animId) { try { cancelAnimationFrame(inertiaRef.current.animId); } catch {} inertiaRef.current.animId = 0; }
              let x = tx;
              let y = ty;
              let lastT = performance.now();
              const step = (t) => {
                const dt = t - lastT;
                lastT = t;
                const decay = Math.pow(0.95, dt / 16);
                vx *= decay;
                vy *= decay;
                x += vx * dt;
                y += vy * dt;
                const cl = clampTranslate(x, y);
                x = cl.x; y = cl.y;
                setTx(x);
                setTy(y);
                if (Math.hypot(vx, vy) < 0.01) { inertiaRef.current.animId = 0; return; }
                inertiaRef.current.animId = requestAnimationFrame(step);
              };
              inertiaRef.current.animId = requestAnimationFrame(step);
            }
          };

  // Wheel: pan by default; hold Ctrl/Cmd to zoom around cursor
  const onWheel = React.useCallback((e) => {
    if (!contentRef.current) return;
    e.preventDefault();

    // PAN with wheel/trackpad by default
    if (!(e.ctrlKey || e.metaKey)) {
      const nx = tx - (e.deltaX || 0);
      const ny = ty - (e.deltaY || 0);
      const cl = clampTranslate(nx, ny);
      setTx(cl.x);
      setTy(cl.y);
      return;
    }

    // ZOOM when Ctrl/Cmd pressed
    const rect = contentRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    setScale((prevScale) => {
      const next = clamp(prevScale * (e.deltaY > 0 ? 0.9 : 1.1), minScale, maxScale);
      if (next === prevScale) return prevScale;

      const nxLocal = cx / prevScale;
      const nyLocal = cy / prevScale;
      const delta = next - prevScale;

      const newTx = tx - (nxLocal * delta);
      const newTy = ty - (nyLocal * delta);

      const cl = clampTranslate(newTx, newTy, next);
      setTx(cl.x);
      setTy(cl.y);
      return next;
    });
  }, [tx, ty, scale, minScale, maxScale, clampTranslate]);

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
      // Multi-touch: do not treat as click-through
      stateRef.current.allowClickThrough = false;
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

      const cl = clampTranslate(txNew, tyNew, next);

      setScale(next);
      setTx(cl.x);
      setTy(cl.y);
    } else if (stateRef.current.dragging) {
      onPointerMove(e);
    }
  };
  const onPinchPointerUp = (e) => {
    pinchRef.current.pointers.delete(e.pointerId);
    if (pinchRef.current.pointers.size < 2) pinchRef.current.active = false;
    onPointerUp(e);
  };

  // ⭐ FIX: Attach non-passive listeners manually to allow preventDefault()
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Non-passive wheel listener
    const wheelHandler = (e) => onWheel(e);
    el.addEventListener("wheel", wheelHandler, { passive: false });

    // Non-passive pointerdown listener
    const pointerDownHandler = (e) => {
      onPointerDown(e);
      onPinchPointerDown(e);
    };
    el.addEventListener("pointerdown", pointerDownHandler, { passive: false });

    return () => {
      el.removeEventListener("wheel", wheelHandler);
      el.removeEventListener("pointerdown", pointerDownHandler);
    };
  }, [onWheel, onPointerDown]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden touch-none select-none ${className}`}
      style={{ touchAction: "none" }}
      // Removed onWheel and onPointerDown - now attached as non-passive listeners
      onPointerMove={onPinchPointerMove}
      onPointerUp={onPinchPointerUp}
      onPointerCancel={onPinchPointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div ref={contentRef} className="origin-top-left will-change-transform block">
        {children}
      </div>

      {/* Controls */}
      <div
        className="hidden lg:flex fixed right-4 bottom-6 z-50 bg-white/90 backdrop-blur rounded-md shadow-md border border-gray-200 p-1 lg:flex-col gap-1"
        data-zoom-controls="true"
        onPointerDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <button aria-label="Zoom in" className="px-2 py-1 text-sm hover:bg-gray-100 rounded" onClick={() => zoomBy(1.15)}>+</button>
        <button aria-label="Zoom out" className="px-2 py-1 text-sm hover:bg-gray-100 rounded" onClick={() => zoomBy(1/1.15)}>-</button>
        <button
          aria-label="Toggle pan mode"
          className={`px-2 py-1 text-xs rounded ${forcePan ? 'bg-gray-800 text-white' : 'hover:bg-gray-100'}`}
          onClick={() => setForcePan(v => !v)}
        >
          {forcePan ? 'Pan: On' : 'Pan: Off'}
        </button>
        <button aria-label="Reset view" className="px-2 py-1 text-xs hover:bg-gray-100 rounded" onClick={reset}>Reset</button>
      </div>


    </div>
  );
});

export default ZoomPan;