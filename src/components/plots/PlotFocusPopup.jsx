import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { MapPin, X } from 'lucide-react';
import { normalizeSectionKey } from "@/components/plots/normalizeSectionKey";

const BLINK_DURATION_MS = 60000;
const BLINK_CLASS = "plot-blink-green";

export default function PlotFocusPopup({ zoomPanRef }) {
  const [showModal, setShowModal] = useState(false);
  const [targetInfo, setTargetInfo] = useState({ plotNum: null, section: null });

  // Check URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromSearch = params.get('from') === 'search';
    const rawPlot = params.get('plot') || '';
    const rawSection = params.get('section') || '';

    if (!fromSearch || !rawPlot) return;

    const plotNum = parseInt(rawPlot, 10);
    const sectionNorm = normalizeSectionKey(rawSection);

    if (!Number.isFinite(plotNum)) return;

    setTargetInfo({ plotNum, section: sectionNorm });

    // Wait for plots to render, then show modal
    waitForPlotsRendered().then(() => {
      const targetEl = findPlotElement(sectionNorm, plotNum);
      if (targetEl) {
        setShowModal(true);
      }
    });
  }, []);

  const waitForPlotsRendered = useCallback(() => {
    return new Promise((resolve) => {
      let done = false;
      let stableTicks = 0;
      let lastCount = -1;

      const container = document.querySelector('[data-zoom-controls]')?.closest('.relative') || document.body;

      const obs = new MutationObserver(() => {
        const plots = document.querySelectorAll('[data-plot-num]');
        const count = plots.length;

        if (count > 0 && count === lastCount) stableTicks += 1;
        else stableTicks = 0;

        lastCount = count;

        if (stableTicks >= 3) {
          obs.disconnect();
          if (!done) { done = true; resolve(); }
        }
      });

      obs.observe(container, { childList: true, subtree: true });

      // Initial check
      const plots = document.querySelectorAll('[data-plot-num]');
      if (plots.length > 0) {
        lastCount = plots.length;
      }

      // Safety timeout
      setTimeout(() => {
        obs.disconnect();
        if (!done) { done = true; resolve(); }
      }, 5000);
    });
  }, []);

  const findPlotElement = useCallback((section, plotNum) => {
    let el = document.getElementById(`plot-${section}-${plotNum}`);
    if (!el) {
      el = document.querySelector(`[data-section="${section}"][data-plot-num="${plotNum}"]`);
    }
    if (!el) {
      el = document.querySelector(`[data-plot-num="${plotNum}"]`);
    }
    return el;
  }, []);

  const clearBlinking = useCallback(() => {
    document.querySelectorAll('.' + BLINK_CLASS).forEach(el => el.classList.remove(BLINK_CLASS));
  }, []);

  const handleCenterOnPlot = useCallback(() => {
    setShowModal(false);

    const { plotNum, section } = targetInfo;
    const plotEl = findPlotElement(section, plotNum);

    if (!plotEl) return;

    // Clear any prior blinking
    clearBlinking();

    // Center on plot using ZoomPan ref
    if (zoomPanRef?.current?.centerOnElement) {
      zoomPanRef.current.centerOnElement(plotEl, 'top-left');
    } else {
      // Fallback scroll
      plotEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }

    // Start blinking
    plotEl.classList.add(BLINK_CLASS);

    // Stop blinking after duration
    setTimeout(() => {
      clearBlinking();
    }, BLINK_DURATION_MS);
  }, [targetInfo, zoomPanRef, findPlotElement, clearBlinking]);

  const handleClose = useCallback(() => {
    setShowModal(false);
  }, []);

  if (!showModal) return null;

  return (
    <>
      {/* Inject blink styles */}
      <style>{`
        .${BLINK_CLASS} {
          outline: 3px solid #22c55e !important;
          animation: plotBlinkGreen 0.9s infinite !important;
          z-index: 50 !important;
        }
        @keyframes plotBlinkGreen {
          0%   { outline-color: rgba(34,197,94, 0.15); box-shadow: 0 0 10px rgba(34,197,94, 0.3); }
          50%  { outline-color: rgba(34,197,94, 1);    box-shadow: 0 0 25px rgba(34,197,94, 0.8); }
          100% { outline-color: rgba(34,197,94, 0.15); box-shadow: 0 0 10px rgba(34,197,94, 0.3); }
        }
      `}</style>

      {/* Modal overlay */}
      <div 
        className="fixed inset-0 bg-black/55 flex items-center justify-center z-[9999]"
        onClick={handleClose}
      >
        <div 
          className="bg-white rounded-xl p-5 shadow-2xl w-[min(420px,92vw)] relative"
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Plot located"
        >
          <button 
            onClick={handleClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Plot Located</h2>
          </div>

          <p className="text-gray-600 mb-5">
            Plot <span className="font-semibold">{targetInfo.plotNum}</span> 
            {targetInfo.section && <> in Section <span className="font-semibold">{targetInfo.section}</span></>} has been found. 
            Click below to jump to the highlighted plot.
          </p>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleCenterOnPlot} className="bg-green-600 hover:bg-green-700 text-white">
              Center on Plot
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}