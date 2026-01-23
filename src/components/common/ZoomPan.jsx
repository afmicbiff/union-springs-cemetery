import React from "react";

const ZoomPan = React.forwardRef(function ZoomPan(
  { children, className = "", minScale = 0.4, maxScale = 2.5, initialScale = 1, controlsTop },
  ref
) {
  const containerRef = React.useRef(null);
  const contentRef = React.useRef(null);

  // Use refs for transform state to avoid re-renders during animation
  const transformRef = React.useRef({ scale: initialScale, tx: 0, ty: 0 });
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  const [forcePan, setForcePan] = React.useState(false);

  const inertiaRef = React.useRef({ animId: 0 });
  const stateRef = React.useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    startTx: 0,
    startTy: 0,
    allowClickThrough: false,
    downTarget: null,
    moved: false,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    vx: 0,
    vy: 0,
  });

  const pinchRef = React.useRef({
    active: false,
    startDist: 0,
    startScale: initialScale,
    centerX: 0,
    centerY: 0,
    startTx: 0,
    startTy: 0,
    pointers: new Map(),
  });

  const smoothScaleRef = React.useRef(initialScale);

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // Direct DOM manipulation for 60fps performance
  const applyTransform = React.useCallback(() => {
    if (!contentRef.current) return;
    const { scale, tx, ty } = transformRef.current;
    contentRef.current.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
  }, []);

  // Getters/setters that update ref and apply transform directly
  const setScale = React.useCallback((valOrFn) => {
    const prev = transformRef.current.scale;
    const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
    transformRef.current.scale = next;
    applyTransform();
    return next;
  }, [applyTransform]);

  const setTx = React.useCallback((valOrFn) => {
    const prev = transformRef.current.tx;
    transformRef.current.tx = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
    applyTransform();
  }, [applyTransform]);

  const setTy = React.useCallback((valOrFn) => {
    const prev = transformRef.current.ty;
    transformRef.current.ty = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
    applyTransform();
  }, [applyTransform]);

  // Convenience getters
  const getScale = () => transformRef.current.scale;
  const getTx = () => transformRef.current.tx;
  const getTy = () => transformRef.current.ty;

  React.useEffect(() => {
    applyTransform();
  }, [applyTransform]);

  const clampTranslate = React.useCallback(
    (nx, ny, s) => {
      const scale = s ?? transformRef.current.scale;
      if (!containerRef.current || !contentRef.current) return { x: nx, y: ny };
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const contentW = contentRef.current.scrollWidth * scale;
      const contentH = contentRef.current.scrollHeight * scale;

      const deltaX = cw - contentW;
      const deltaY = ch - contentH;

      const minX = deltaX > 0 ? -deltaX : deltaX;
      const maxX = deltaX > 0 ? deltaX : 0;
      const minY = deltaY > 0 ? -deltaY : deltaY;
      const maxY = deltaY > 0 ? deltaY : 0;

      return { x: clamp(nx, minX, maxX), y: clamp(ny, minY, maxY) };
    },
    []
  );

  const centerOnElement = React.useCallback((element, align = 'center') => {
    if (!containerRef.current || !contentRef.current || !element) return;

    const { scale, tx, ty } = transformRef.current;
    const containerRect = containerRef.current.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    const elLeftInContent = (elementRect.left - containerRect.left - tx) / scale;
    const elTopInContent = (elementRect.top - containerRect.top - ty) / scale;
    const elWidth = elementRect.width / scale;
    const elHeight = elementRect.height / scale;

    let targetTx, targetTy;

    if (align === 'top-left') {
      const padding = 80;
      targetTx = padding - (elLeftInContent * scale);
      targetTy = padding - (elTopInContent * scale);
    } else {
      const elCenterInContentX = elLeftInContent + elWidth / 2;
      const elCenterInContentY = elTopInContent + elHeight / 2;
      targetTx = (containerRect.width / 2) - (elCenterInContentX * scale);
      targetTy = (containerRect.height / 2) - (elCenterInContentY * scale);
    }

    // Smooth animation using requestAnimationFrame
    const startTx = tx;
    const startTy = ty;
    const duration = 300;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      transformRef.current.tx = startTx + (targetTx - startTx) * eased;
      transformRef.current.ty = startTy + (targetTy - startTy) * eased;
      applyTransform();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [applyTransform]);

  const zoomBy = React.useCallback((factor) => {
    const currentScale = transformRef.current.scale;
    const newScale = clamp(currentScale * factor, minScale, maxScale);
    transformRef.current.scale = newScale;
    applyTransform();
    forceUpdate();
  }, [minScale, maxScale, applyTransform]);

  const reset = React.useCallback(() => {
    // Animate to reset position
    const startScale = transformRef.current.scale;
    const startTx = transformRef.current.tx;
    const startTy = transformRef.current.ty;
    const duration = 250;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      transformRef.current.scale = startScale + (initialScale - startScale) * eased;
      transformRef.current.tx = startTx * (1 - eased);
      transformRef.current.ty = startTy * (1 - eased);
      applyTransform();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        forceUpdate();
      }
    };

    requestAnimationFrame(animate);
  }, [initialScale, applyTransform]);

  React.useImperativeHandle(ref, () => ({
    centerOnElement,
    zoomBy,
    reset,
  }));

  const smoothDamp = (current, target, smoothing = 0.18) =>
    current + (target - current) * smoothing;

  const onPointerDown = React.useCallback(
    (e) => {
      if (!containerRef.current) return;
      const target = e.target;
      
      // Skip if clicking on zoom controls
      const zoomControls = target && typeof target.closest === "function"
        ? target.closest("[data-zoom-controls]")
        : null;
      if (zoomControls) {
        return;
      }
      
      const plotEl =
        target && typeof target.closest === "function"
          ? target.closest(".plot-element")
          : null;
      const isTouch = e.pointerType === "touch";
      const shouldPan =
        isTouch ||
        forcePan ||
        e.button === 1 ||
        e.button === 2 ||
        e.altKey ||
        e.metaKey ||
        e.ctrlKey;

      if (plotEl && !shouldPan) {
        return;
      }

      if (inertiaRef.current.animId) {
        try {
          cancelAnimationFrame(inertiaRef.current.animId);
        } catch {}
        inertiaRef.current.animId = 0;
      }

      if (e.button === 2) {
        e.preventDefault();
      }

      containerRef.current.setPointerCapture(e.pointerId);
      const st = stateRef.current;
      st.dragging = true;
      st.startX = e.clientX;
      st.startY = e.clientY;
      st.startTx = transformRef.current.tx;
      st.startTy = transformRef.current.ty;
      st.allowClickThrough = !!plotEl;
      st.downTarget = plotEl || target;
      st.moved = false;
      st.lastX = e.clientX;
      st.lastY = e.clientY;
      st.lastTime = performance.now();
      st.vx = 0;
      st.vy = 0;
    },
    [forcePan]
  );

  const onPointerMove = React.useCallback(
    (e) => {
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
    },
    [clampTranslate]
  );

  const onPointerUp = React.useCallback(
    (e) => {
      if (!containerRef.current) return;
      try {
        containerRef.current.releasePointerCapture(e.pointerId);
      } catch {}

      const st = stateRef.current;
      const wasDragging = st.dragging;
      st.dragging = false;

      if (wasDragging && st.allowClickThrough && !st.moved && st.downTarget) {
        setTimeout(() => {
          try {
            st.downTarget.dispatchEvent(
              new MouseEvent("click", {
                bubbles: true,
                cancelable: true,
                view: window,
              })
            );
          } catch {}
        }, 0);
      }

      // inertia
      if (wasDragging && st.moved && !pinchRef.current.active) {
        let vx = st.vx || 0;
        let vy = st.vy || 0;

        const MAX_VELOCITY = 2.5; // px/ms
        vx = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, vx));
        vy = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, vy));

        if (Math.hypot(vx, vy) < 0.05) return;

        if (inertiaRef.current.animId) {
          try {
            cancelAnimationFrame(inertiaRef.current.animId);
          } catch {}
          inertiaRef.current.animId = 0;
        }

        let x = tx;
        let y = ty;
        const DECAY = 0.0025;
        let lastT = performance.now();

        const step = (t) => {
          const dt = t - lastT;
          lastT = t;

          const decayFactor = Math.exp(-DECAY * dt);
          vx *= decayFactor;
          vy *= decayFactor;

          x += vx * dt;
          y += vy * dt;

          const cl = clampTranslate(x, y);
          x = cl.x;
          y = cl.y;

          setTx(x);
          setTy(y);

          if (Math.abs(vx) < 0.01 && Math.abs(vy) < 0.01) {
            inertiaRef.current.animId = 0;
            return;
          }

          inertiaRef.current.animId = requestAnimationFrame(step);
        };

        inertiaRef.current.animId = requestAnimationFrame(step);
      }
    },
    [clampTranslate, tx, ty]
  );

  const onWheel = React.useCallback(
    (e) => {
      if (!contentRef.current) return;

      // Only prevent default and handle panning/zooming when inside the ZoomPan container
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }

      if (!(e.ctrlKey || e.metaKey)) {
        const nx = tx - (e.deltaX || 0);
        const ny = ty - (e.deltaY || 0);
        const cl = clampTranslate(nx, ny);
        setTx(cl.x);
        setTy(cl.y);
        return;
      }

      const rect = contentRef.current.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      setScale((prevScale) => {
        const next = clamp(
          prevScale * (e.deltaY > 0 ? 0.9 : 1.1),
          minScale,
          maxScale
        );
        if (next === prevScale) return prevScale;

        const nxLocal = cx / prevScale;
        const nyLocal = cy / prevScale;
        const delta = next - prevScale;

        const newTx = tx - nxLocal * delta;
        const newTy = ty - nyLocal * delta;

        const cl = clampTranslate(newTx, newTy, next);
        setTx(cl.x);
        setTy(cl.y);
        return next;
      });
    },
    [clampTranslate, maxScale, minScale, tx, ty]
  );

  const onPinchPointerDown = (e) => {
    // Skip if clicking on zoom controls
    const target = e.target;
    const zoomControls = target && typeof target.closest === "function"
      ? target.closest("[data-zoom-controls]")
      : null;
    if (zoomControls) {
      return;
    }
    
    pinchRef.current.pointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
    });
    if (pinchRef.current.pointers.size === 2) {
      const pts = Array.from(pinchRef.current.pointers.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      pinchRef.current.startDist = Math.hypot(dx, dy);
      pinchRef.current.startScale = scale;
      pinchRef.current.active = true;
      pinchRef.current.startTx = tx;
      pinchRef.current.startTy = ty;
      pinchRef.current.centerX = (pts[0].x + pts[1].x) / 2;
      pinchRef.current.centerY = (pts[0].y + pts[1].y) / 2;
      stateRef.current.allowClickThrough = false;
      smoothScaleRef.current = scale;
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

      let rawNext = clamp(
        pr.startScale * (dist / pr.startDist),
        minScale,
        maxScale
      );

      smoothScaleRef.current = smoothDamp(
        smoothScaleRef.current,
        rawNext,
        0.18
      );
      let next = smoothScaleRef.current;

      const rect = contentRef.current.getBoundingClientRect();
      const cx = pr.centerX - rect.left;
      const cy = pr.centerY - rect.top;
      const nx = cx / scale;
      const ny = cy / scale;

      const txNew = pr.startTx - nx * (next - pr.startScale);
      const tyNew = pr.startTy - ny * (next - pr.startScale);

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

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const wheelHandler = (e) => onWheel(e);
    const pointerDownHandler = (e) => onPointerDown(e);

    el.addEventListener("wheel", wheelHandler, { passive: false });
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
      onPointerMove={onPinchPointerMove}
      onPointerUp={onPinchPointerUp}
      onPointerCancel={onPinchPointerUp}
      onPointerDown={onPinchPointerDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        ref={contentRef}
        className="origin-top-left will-change-transform block"
      >
        {children}
      </div>

      {/* Zoom controls - positioned in bottom-right corner */}
      <div
        className="fixed bottom-6 right-6 z-[100] bg-white/95 backdrop-blur rounded-lg shadow-lg border border-gray-300 p-2 flex flex-col gap-2"
        data-zoom-controls="true"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Zoom in"
          className="w-10 h-10 text-lg font-bold hover:bg-gray-100 rounded-md border border-gray-200 bg-white cursor-pointer"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); zoomBy(1.15); }}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          className="w-10 h-10 text-lg font-bold hover:bg-gray-100 rounded-md border border-gray-200 bg-white cursor-pointer"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); zoomBy(1 / 1.15); }}
        >
          −
        </button>
        <button
          type="button"
          aria-label="Toggle pan mode"
          className={`w-10 h-10 text-xs rounded-md border border-gray-200 cursor-pointer ${
            forcePan ? "bg-gray-800 text-white" : "hover:bg-gray-100 bg-white"
          }`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setForcePan((v) => !v); }}
        >
          {forcePan ? "Pan" : "Pan"}
        </button>
        <button
          type="button"
          aria-label="Reset view"
          className="w-10 h-10 text-xs hover:bg-gray-100 rounded-md border border-gray-200 bg-white cursor-pointer"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); reset(); }}
        >
          Reset
        </button>
      </div>
    </div>
  );
});

export default ZoomPan;