import React, { useState, useEffect, useRef, memo, useCallback } from "react";
import { normalizeSectionKey } from "./normalizeSectionKey";

function parseNum(g) {
  const n = parseInt(String(g || "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

const STATUS_TEXT = {
  Available: 'text-green-700',
  Reserved: 'text-yellow-700',
  Occupied: 'text-red-700',
  Veteran: 'text-blue-700',
  Unavailable: 'text-gray-700',
  Unknown: 'text-purple-700',
  Default: 'text-gray-700',
};

const GravePlotCell = memo(function GravePlotCell({ item, baseColorClass, statusColors, isAdmin, onHover, onEdit, sectionKey }) {
  const [isBlinking, setIsBlinking] = useState(false);
  const hasInitializedBlink = useRef(false);

  const plotNum = parseNum(item?.Grave);

  // Blinking logic - triggered by custom event after centering completes
  // Blinks until user clicks on the plot
  // PERF: use refs for mutable state to avoid re-registering listeners on every blink toggle
  const isBlinkingRef = useRef(false);
  const itemRef = useRef(item);
  itemRef.current = item;

  useEffect(() => {
    if (!item) return;

    const handleStartBlink = (e) => {
      const { targetPlotNum } = e.detail || {};
      const isMatch = Number.isFinite(targetPlotNum)
        && Number.isFinite(plotNum)
        && plotNum === targetPlotNum;

      if (!isMatch && isBlinkingRef.current) {
        isBlinkingRef.current = false;
        hasInitializedBlink.current = false;
        setIsBlinking(false);
        return;
      }

      if (isMatch && !hasInitializedBlink.current) {
        hasInitializedBlink.current = true;
        isBlinkingRef.current = true;
        setIsBlinking(true);
      }
    };

    const handleSearchBlink = (e) => {
      const { targetPlotNum, plotId } = e.detail || {};
      const curItem = itemRef.current;
      const isMatch = plotId 
        ? (curItem?._id === plotId)
        : (Number.isFinite(targetPlotNum) && Number.isFinite(plotNum) && plotNum === targetPlotNum);

      if (isMatch) {
        hasInitializedBlink.current = true;
        isBlinkingRef.current = true;
        setIsBlinking(true);
      }
    };

    const handleStopBlink = () => {
      if (isBlinkingRef.current) {
        isBlinkingRef.current = false;
        hasInitializedBlink.current = false;
        setIsBlinking(false);
      }
    };

    window.addEventListener('plot-start-blink', handleStartBlink);
    window.addEventListener('plot-search-blink', handleSearchBlink);
    window.addEventListener('plot-stop-all-blink', handleStopBlink);
    
    return () => {
      window.removeEventListener('plot-start-blink', handleStartBlink);
      window.removeEventListener('plot-search-blink', handleSearchBlink);
      window.removeEventListener('plot-stop-all-blink', handleStopBlink);
    };
  }, [plotNum, sectionKey]);

  // Cleanup blink state on unmount (page navigation)
  useEffect(() => {
    return () => {
      hasInitializedBlink.current = false;
    };
  }, []);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    // Stop blinking when user clicks on this plot
    if (isBlinkingRef.current) {
      isBlinkingRef.current = false;
      hasInitializedBlink.current = false;
      setIsBlinking(false);
    }
    window.dispatchEvent(new CustomEvent('plot-stop-all-blink'));
    if (isAdmin && onEdit && item?._entity === 'Plot') onEdit(item);
  }, [isAdmin, onEdit, item]);

  const handleMouseEnter = useCallback((e) => {
    if (onHover) onHover(e, item);
  }, [onHover, item]);

  const handleMouseLeave = useCallback(() => {
    if (onHover) onHover(null, null);
  }, [onHover]);

  if (!item || item.isSpacer) {
    const handleSpacerClick = (e) => {
      e.stopPropagation();
      if (isAdmin && onEdit) {
        onEdit({ isSpacer: true, _id: item?._id, Section: item?.Section || sectionKey, suggestedSection: sectionKey });
      }
    };

    return (
      <div 
        className={`w-16 h-8 m-0.5 border border-dashed border-gray-300 bg-gray-50/50 rounded-[1px] transition-colors flex items-center justify-center plot-element ${isAdmin ? 'hover:bg-green-100 hover:border-green-400 cursor-pointer' : ''}`}
        onClick={handleSpacerClick}
        title={isAdmin ? "Click to create a new plot here" : ""}
      >
        {isAdmin && <span className="text-[8px] text-gray-400 font-medium">+ New</span>}
      </div>
    );
  }

  const isVet = (item.Status === 'Veteran') || ((item.Notes || '').toLowerCase().includes('vet') && item.Status === 'Occupied');
  const statusKey = isVet ? 'Veteran' : ((statusColors && statusColors[item.Status]) ? item.Status : 'Default');
  const fullClass = (statusColors && statusColors[statusKey]) || '';
  const bgClass = (fullClass.split(' ').find(cn => cn.startsWith('bg-'))) || 'bg-gray-400';
  const textClass = STATUS_TEXT[statusKey] || STATUS_TEXT.Default;

  // Enhanced blinking style - larger ring, more visible, better centered appearance
  const blinkingClass = 'ring-4 sm:ring-8 md:ring-12 ring-green-500 ring-offset-2 sm:ring-offset-4 ring-offset-white scale-110 sm:scale-125 z-50 shadow-2xl animate-plot-blink relative';

  return (
    <div
      id={`plot-${sectionKey}-${plotNum}`}
      data-section={sectionKey}
      data-plot-num={plotNum}
      className={`border ${baseColorClass} w-16 h-8 px-1.5 text-[8px] m-0.5 rounded-[1px] flex items-center justify-between bg-opacity-90 plot-element cursor-pointer hover:opacity-100 transition-opacity ${isBlinking ? blinkingClass : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      title={`Row: ${item.Row}, Grave: ${item.Grave}`}
    >
      <span className={`text-[10px] leading-none font-black ${textClass}`}>{item.Grave}</span>
      <span className="text-[8px] leading-none text-gray-600 font-mono tracking-tighter truncate max-w-full">{item.Row}</span>
      <div className={`w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm ${bgClass}`}></div>
    </div>
  );
});

export default GravePlotCell;