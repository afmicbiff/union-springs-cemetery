import React, { useState, useEffect, useRef } from "react";
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

export default function GravePlotCell({ item, baseColorClass, statusColors, isAdmin, onHover, onEdit, sectionKey }) {
  const [isBlinking, setIsBlinking] = useState(false);
  const hasInitializedBlink = useRef(false);

  const plotNum = parseNum(item?.Grave);

  // Blinking logic
  useEffect(() => {
    if (hasInitializedBlink.current || !item) return;

    const params = new URLSearchParams(window.location.search);
    const targetPlotNum = parseInt(params.get('plot') || '', 10);
    const targetSection = params.get('section') || '';
    const fromSearch = params.get('from') === 'search';

    const normalizedTarget = normalizeSectionKey(targetSection);
    const normalizedPlot = normalizeSectionKey(sectionKey);

    const isSelected = fromSearch
      && Number.isFinite(targetPlotNum)
      && Number.isFinite(plotNum)
      && plotNum === targetPlotNum
      && (!normalizedTarget || normalizedPlot === normalizedTarget);

    if (isSelected) {
      hasInitializedBlink.current = true;
      setIsBlinking(true);
      const timer = setTimeout(() => setIsBlinking(false), 60000);
      return () => clearTimeout(timer);
    }
  }, [plotNum, sectionKey, item]);

  if (!item) {
    return <div className="w-16 h-8 m-0.5 border border-dashed border-gray-300 bg-gray-50/50 rounded-[1px]" />;
  }

  const isVet = (item.Status === 'Veteran') || ((item.Notes || '').toLowerCase().includes('vet') && item.Status === 'Occupied');
  const statusKey = isVet ? 'Veteran' : ((statusColors && statusColors[item.Status]) ? item.Status : 'Default');
  const fullClass = (statusColors && statusColors[statusKey]) || '';
  const bgClass = (fullClass.split(' ').find(cn => cn.startsWith('bg-'))) || 'bg-gray-400';
  const textClass = STATUS_TEXT[statusKey] || STATUS_TEXT.Default;

  const blinkingClass = 'ring-8 ring-green-500 ring-offset-2 ring-offset-white scale-110 z-30 shadow-2xl animate-plot-blink';

  return (
    <div
      id={`plot-${sectionKey}-${plotNum}`}
      data-section={sectionKey}
      data-plot-num={plotNum}
      className={`border ${baseColorClass} w-16 h-8 px-1.5 text-[8px] m-0.5 rounded-[1px] flex items-center justify-between bg-opacity-90 plot-element cursor-pointer hover:opacity-100 transition-all ${isBlinking ? blinkingClass : ''}`}
      onMouseEnter={(e) => onHover && onHover(e, item)}
      onMouseLeave={() => onHover && onHover(null, null)}
      onClick={(e) => {
        e.stopPropagation();
        if (isAdmin && onEdit && item._entity === 'Plot') onEdit(item);
      }}
      title={`Row: ${item.Row}, Grave: ${item.Grave}`}
    >
      <span className={`text-[10px] leading-none font-black ${textClass}`}>{item.Grave}</span>
      <span className="text-[8px] leading-none text-gray-600 font-mono tracking-tighter truncate max-w-full">{item.Row}</span>
      <div className={`w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm ${bgClass}`}></div>
    </div>
  );
}