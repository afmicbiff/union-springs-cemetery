import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import { X, RotateCcw, Search, Hand } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

const FullscreenImageViewer = memo(function FullscreenImageViewer({ src, isOpen, onClose, children }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const lastTouchDist = useRef(null);

  // Plots overlay scale (5% to 100%)
  const [overlayScale, setOverlayScale] = useState(50);
  // Plots overlay independent position (draggable)
  const [overlayPos, setOverlayPos] = useState({ x: 0, y: 0 });
  const [overlayDragging, setOverlayDragging] = useState(false);
  const overlayDragStart = useRef({ x: 0, y: 0 });

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setOverlayScale(50);
      setOverlayPos({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  const recenter = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setScale(prev => Math.min(5, Math.max(0.3, prev + (e.deltaY > 0 ? -0.1 : 0.1))));
  }, []);

  // Mouse drag
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch: drag + pinch zoom
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    }
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.hypot(dx, dy);
    }
  }, [position]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
      setPosition({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
    }
    if (e.touches.length === 2 && lastTouchDist.current != null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const delta = dist / lastTouchDist.current;
      setScale(prev => Math.min(5, Math.max(0.3, prev * delta)));
      lastTouchDist.current = dist;
    }
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    lastTouchDist.current = null;
  }, []);

  // Overlay drag handlers
  const handleOverlayMouseDown = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    setOverlayDragging(true);
    overlayDragStart.current = { x: e.clientX - overlayPos.x, y: e.clientY - overlayPos.y };
  }, [overlayPos]);

  const handleOverlayMouseMove = useCallback((e) => {
    if (!overlayDragging) return;
    setOverlayPos({ x: e.clientX - overlayDragStart.current.x, y: e.clientY - overlayDragStart.current.y });
  }, [overlayDragging]);

  const handleOverlayMouseUp = useCallback(() => {
    setOverlayDragging(false);
  }, []);

  // Overlay touch drag
  const handleOverlayTouchStart = useCallback((e) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    setOverlayDragging(true);
    overlayDragStart.current = { x: e.touches[0].clientX - overlayPos.x, y: e.touches[0].clientY - overlayPos.y };
  }, [overlayPos]);

  const handleOverlayTouchMove = useCallback((e) => {
    if (!overlayDragging || e.touches.length !== 1) return;
    e.stopPropagation();
    setOverlayPos({ x: e.touches[0].clientX - overlayDragStart.current.x, y: e.touches[0].clientY - overlayDragStart.current.y });
  }, [overlayDragging]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/90 flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-black/70 text-white z-10 gap-2">
        <span className="text-sm font-medium hidden sm:block">Aerial View — Scroll to zoom, drag to pan</span>
        <div className="flex items-center gap-3 flex-1 justify-end">
          {/* Plots overlay size slider */}
          {children && (
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
              <Search className="w-3.5 h-3.5 text-white/70 shrink-0" />
              <span className="text-xs text-white/70 whitespace-nowrap">Plots</span>
              <Slider
                value={[overlayScale]}
                onValueChange={([v]) => setOverlayScale(v)}
                min={5}
                max={100}
                step={1}
                className="w-24 sm:w-32"
              />
              <span className="text-xs text-white/80 w-8 text-right">{overlayScale}%</span>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={recenter} className="text-white hover:bg-white/20 gap-1.5">
            <RotateCcw className="w-4 h-4" /> Recenter
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Image area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing touch-none flex items-center justify-center"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="relative"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
        >
          {/* Background aerial image */}
          <img
            src={src}
            alt="Cemetery aerial view"
            className="max-w-[90vw] max-h-[85vh] object-contain select-none pointer-events-none"
            draggable={false}
          />
          {/* Plot overlay — independently draggable and scalable */}
          {children && (
            <div
              className="absolute inset-0 overflow-visible pointer-events-none"
              style={{ zIndex: 10 }}
            >
              <div
                className="pointer-events-auto absolute cursor-grab active:cursor-grabbing"
                style={{
                  transform: `translate(${overlayPos.x}px, ${overlayPos.y}px) scale(${overlayScale / 100})`,
                  transformOrigin: 'top left',
                  top: '10%',
                  left: '5%',
                  transition: overlayDragging ? 'none' : 'transform 0.1s ease-out',
                }}
                onMouseDown={handleOverlayMouseDown}
                onMouseMove={handleOverlayMouseMove}
                onMouseUp={handleOverlayMouseUp}
                onMouseLeave={handleOverlayMouseUp}
                onTouchStart={handleOverlayTouchStart}
                onTouchMove={handleOverlayTouchMove}
                onTouchEnd={handleOverlayMouseUp}
              >
                <div className="relative">
                  {/* Drag handle indicator */}
                  <div className="absolute -top-6 left-0 flex items-center gap-1 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-t-md select-none">
                    <Hand className="w-3 h-3" /> Drag to move plots
                  </div>
                  <div className="opacity-85 hover:opacity-100 transition-opacity">
                    {children}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
});

export default FullscreenImageViewer;