import React from "react";

const ZoomPan = React.forwardRef(function ZoomPan(
  { children, className = "", minScale = 0.4, maxScale = 2.5, initialScale = 1, controlsTop },
  ref
) {
  const containerRef = React.useRef(null);
  const contentRef = React.useRef(null);

  const [scale, setScale] = React.useState(initialScale);
  const [tx, setTx] = React.useState(0);
  const [ty, setTy] = React.useState(0);
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

  const smoothScaleRef = React.useRef(scale);

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const applyTransform = React.useCallback(() => {
    if (!contentRef.current) return;
    contentRef.current.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }, [tx, ty, scale]);

  React.useEffect(() => {
    applyTransform();
  }, [applyTransform]);

  const clampTranslate = React.useCallback(
    (nx, ny, s = scale) => {
      if (!containerRef.current || !contentRef.current) return { x: nx, y: ny };
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const contentW = contentRef.current.scrollWidth * s;
      const contentH = contentRef.current.scrollHeight * s;

      const deltaX = cw - contentW;
      const deltaY = ch - contentH;

      const minX = deltaX > 0 ? -deltaX : deltaX;
      const maxX = deltaX > 0 ? deltaX : 0;
      const minY = deltaY > 0 ? -deltaY : deltaY;
      const maxY = deltaY > 0 ? deltaY : 0;

      return { x: clamp(nx, minX, maxX), y: clamp(ny, minY, maxY) };
    },
    [scale]
  );

  const centerOnElement = React.useCallback((element) => {
    if (!containerRef.current || !contentRef.current || !element) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    const elCenterScreenX = elementRect.left + elementRect.width / 2;
    const elCenterScreenY = elementRect.top + elementRect.height / 2;

    const containerCenterScreenX = containerRect.left + containerRect.width / 2;
    const containerCenterScreenY = containerRect.top + containerRect.height / 2;

    const deltaX = containerCenterScreenX - elCenterScreenX;
    const deltaY = containerCenterScreenY - elCenterScreenY;

    setTx((prev) => prev + deltaX);
    setTy((prev) => prev + deltaY);
  }, []);

  const zoomBy = (factor) =>
    setScale((s) => clamp(s * factor, minScale, maxScale));

  const reset = () => {
    setScale(initialScale);
    const cl = clampTranslate(0, 0, initialScale);
    setTx(cl.x);
    setTy(cl.y);
  };

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
      st.startTx = tx;
      st.startTy = ty;
      st.allowClickThrough = !!plotEl;
      st.downTarget = plotEl || target;
      st.moved = false;
      st.lastX = e.clientX;
      st.lastY = e.clientY;
      st.lastTime = performance.now();
      st.vx = 0;
      st.vy = 0;
    },
    [forcePan, tx, ty]
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
      e.preventDefault();

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

      <div
        className="hidden lg:flex fixed right-4 bottom-6 z-50 bg-white/90 backdrop-blur rounded-md shadow-md border border-gray-200 p-1 lg:flex-col gap-1"
        data-zoom-controls="true"
        onPointerDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <button
          aria-label="Zoom in"
          className="px-2 py-1 text-sm hover:bg-gray-100 rounded"
          onClick={() => zoomBy(1.15)}
        >
          +
        </button>
        <button
          aria-label="Zoom out"
          className="px-2 py-1 text-sm hover:bg-gray-100 rounded"
          onClick={() => zoomBy(1 / 1.15)}
        >
          -
        </button>
        <button
          aria-label="Toggle pan mode"
          className={`px-2 py-1 text-xs rounded ${
            forcePan ? "bg-gray-800 text-white" : "hover:bg-gray-100"
          }`}
          onClick={() => setForcePan((v) => !v)}
        >
          {forcePan ? "Pan: On" : "Pan: Off"}
        </button>
        <button
          aria-label="Reset view"
          className="px-2 py-1 text-xs hover:bg-gray-100 rounded"
          onClick={reset}
        >
          Reset
        </button>
      </div>
    </div>
  );
});

export default ZoomPan;