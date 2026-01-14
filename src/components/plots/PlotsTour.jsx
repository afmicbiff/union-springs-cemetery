import React from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft, Info } from "lucide-react";

function useRectForSelector(selector) {
  const [rect, setRect] = React.useState(null);
  React.useLayoutEffect(() => {
    const el = selector ? document.querySelector(selector) : null;
    if (!el) { setRect(null); return; }
    const update = () => {
      const r = el.getBoundingClientRect();
      setRect({ left: r.left + window.scrollX, top: r.top + window.scrollY, width: r.width, height: r.height });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [selector]);
  return rect;
}

export default function PlotsTour({ open, onClose }) {
  // Prevent background dim from persisting when tour closes
  React.useEffect(() => {
    if (!open) {
      // no-op, but ensures re-render after close to remove any masks
    }
  }, [open]);
  const steps = React.useMemo(() => [
    {
      id: 'filters',
      selector: '#plots-filters',
      title: 'Filter the map',
      description: 'Filters show only what you ask for: combine status, section, family name, and year ranges. “All Status” shows everything. You can also save and reuse searches.'
    },
    {
      id: 'zoom',
      selector: '[data-zoom-controls="true"]',
      title: 'Move around',
      description: 'Use + / - to zoom. Drag to pan the map. Hold Ctrl/Cmd while scrolling to zoom around the cursor.'
    },
    {
      id: 'plots',
      selector: '.plot-element',
      title: 'View plot details',
      description: 'Hover a plot to see a quick tooltip. Click a plot to open full details (admins can edit).'
    }
  ], []);

  const [index, setIndex] = React.useState(0);
  const step = steps[index] || steps[0];
  const isLast = index === steps.length - 1;
  const rect = useRectForSelector(open ? step.selector : null);

  React.useEffect(() => { if (!open) setIndex(0); }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, steps.length - 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, steps.length, onClose]);

  if (!open) return null;

  // Compute popover position
  const vpW = typeof window !== 'undefined' ? window.innerWidth : 0;
  const vpH = typeof window !== 'undefined' ? window.innerHeight : 0;
  const cardW = 340;
  const cardH = 160;

  let cardLeft = (vpW - cardW) / 2 + window.scrollX;
  let cardTop = (vpH - cardH) / 2 + window.scrollY;

  if (rect) {
    const below = rect.top + rect.height + 12;
    const above = rect.top - cardH - 12;
    const right = Math.min(vpW - cardW - 16 + window.scrollX, rect.left + rect.width - cardW);
    const left = Math.max(16 + window.scrollX, rect.left);
    // Prefer below, else above; align to left within viewport bounds
    if (below + cardH <= window.scrollY + vpH) {
      cardTop = below;
      cardLeft = Math.max(16 + window.scrollX, Math.min(right, left));
    } else if (above >= window.scrollY) {
      cardTop = above;
      cardLeft = Math.max(16 + window.scrollX, Math.min(right, left));
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Spotlight mask */}
      {rect ? (
        <div
          className="fixed pointer-events-none"
          style={{
            left: rect.left - 8,
            top: rect.top - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            boxShadow: `0 0 0 9999px rgba(0,0,0,${isLast ? 0 : 0.55})`,
            borderRadius: 8,
            border: '2px solid rgba(20,184,166,0.9)', // teal-500
            transition: 'all 180ms ease'
          }}
        />
      ) : (
        !isLast ? <div className="fixed inset-0 bg-black/55" /> : null
      )

      {/* Card */}
      <div
        className="absolute bg-white rounded-lg shadow-xl border border-stone-200 w-[340px] pointer-events-auto"
        style={{ left: cardLeft, top: cardTop }}
        role="dialog" aria-modal="true" aria-label="Plots guided tour"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-stone-200">
          <div className="flex items-center gap-2 text-stone-700 font-semibold">
            <Info className="w-4 h-4 text-teal-600" />
            <span>{step.title}</span>
          </div>
          <button aria-label="Close tour" onClick={onClose} className="p-1 rounded hover:bg-stone-100">
            <X className="w-4 h-4 text-stone-500" />
          </button>
        </div>
        <div className="px-3 py-3 text-sm text-stone-700 leading-relaxed">
          {step.description}
        </div>
        <div className="flex items-center justify-between px-3 py-2 border-t border-stone-200">
          <div className="text-xs text-stone-500">Step {index + 1} of {steps.length}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            {index < steps.length - 1 ? (
              <Button size="sm" onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={onClose}>Finish</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}