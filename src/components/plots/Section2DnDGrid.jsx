import React from "react";
import { normalizeSectionKey } from "./normalizeSectionKey";

// Helper to extract the first integer from a string like "228-A"
function parseNum(v) {
  const m = String(v || "").match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

// Hook to check if a plot should blink
function useBlinkingPlot(plotNum, sectionId) {
  const [isBlinking, setIsBlinking] = React.useState(false);
  const hasInitialized = React.useRef(false);

  React.useEffect(() => {
    if (hasInitialized.current) return;
    const params = new URLSearchParams(window.location.search);
    const targetPlotNum = parseInt(params.get('plot') || '', 10);
    const targetSection = params.get('section') || '';
    const fromSearch = params.get('from') === 'search';

    const normalizedTarget = normalizeSectionKey(targetSection);
    const normalizedPlot = normalizeSectionKey(sectionId);

    const isSelected = fromSearch 
      && Number.isFinite(targetPlotNum) 
      && Number.isFinite(plotNum) 
      && plotNum === targetPlotNum
      && (!normalizedTarget || normalizedPlot === normalizedTarget);

    if (isSelected) {
      hasInitialized.current = true;
      setIsBlinking(true);
      const timer = setTimeout(() => setIsBlinking(false), 60000);
      return () => clearTimeout(timer);
    }
  }, [plotNum, sectionId]);

  return isBlinking;
}

export default function Section2DnDGrid({ plots = [], baseColorClass = "", isAdmin = false, onHover, onEdit, statusColors }) {
  const perCol = 25;
  const reservedBottomRows = 0;
  const cols = 10;

  const STATUS_TEXT = {
    Available: 'text-green-700',
    Reserved: 'text-yellow-700',
    Occupied: 'text-red-700',
    Veteran: 'text-blue-700',
    Unavailable: 'text-gray-700',
    Unknown: 'text-purple-700',
    Default: 'text-gray-700',
  };

  const cells = React.useMemo(() => {
    const sorted = [...(plots || [])].sort((a, b) => (parseNum(a.Grave) || 0) - (parseNum(b.Grave) || 0));
    const idx186 = sorted.findIndex(p => parseNum(p.Grave) === 186);
    const pivoted = idx186 > -1 ? [...sorted.slice(idx186), ...sorted.slice(0, idx186)] : sorted;

    const baseColumns = Array.from({ length: cols }, () => Array(perCol).fill(null));

    let i = 0;
    for (let c = 0; c < cols && i < pivoted.length; c++) {
      for (let r = perCol - 1 - reservedBottomRows; r >= 0 && i < pivoted.length; r--) {
        baseColumns[c][r] = pivoted[i++];
      }
    }

    // Custom sequence 326–348
    const seqStart = 326;
    const seqEnd = 348;
    const anchorNum = 268;

    const byNum = new Map();
    pivoted.forEach((p) => {
      const n = parseNum(p?.Grave);
      if (n != null) byNum.set(n, p);
    });

    let hasAnySeq = false;
    for (let n = seqStart; n <= seqEnd; n++) { if (byNum.has(n)) { hasAnySeq = true; break; } }

    if (hasAnySeq) {
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < perCol; r++) {
          const cell = baseColumns[c][r];
          const n = parseNum(cell?.Grave);
          if (n != null && n >= seqStart && n <= seqEnd) {
            baseColumns[c][r] = null;
          }
        }
      }

      const seqCol = Array(perCol).fill(null);
      let rPtr = perCol - 1 - reservedBottomRows;
      for (let n = seqStart; n <= seqEnd && rPtr >= 0; n++, rPtr--) {
        const p = byNum.get(n);
        if (p) seqCol[rPtr] = p;
      }

      let anchorIdx = baseColumns.findIndex((col) => col.some((cell) => parseNum(cell?.Grave) === anchorNum));
      if (anchorIdx < 0) anchorIdx = 0;
      const targetIdx = Math.min(anchorIdx + 1, cols - 1);

      for (let r = 0; r < perCol; r++) {
        if (seqCol[r]) baseColumns[targetIdx][r] = seqCol[r];
      }
    }

    const out = Array(cols * perCol).fill(null);
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < perCol; r++) {
        out[c * perCol + r] = baseColumns[c][r];
      }
    }
    return out;
  }, [plots, cols, perCol, reservedBottomRows]);

  const PlotCell = React.memo(({ item, baseColorClass, statusColors, STATUS_TEXT, isAdmin, onHover, onEdit }) => {
    const plotNum = parseNum(item?.Grave);
    const isBlinking = useBlinkingPlot(plotNum, '2');

    const isVet = item && ((item.Status === 'Veteran') || ((item.Notes || '').toLowerCase().includes('vet') && item.Status === 'Occupied'));
    const statusKey = item ? (isVet ? 'Veteran' : ((statusColors && statusColors[item.Status]) ? item.Status : 'Default')) : 'Default';
    const fullClass = (statusColors && statusColors[statusKey]) || '';
    const bgClass = (fullClass.split(' ').find(cn => cn.startsWith('bg-'))) || 'bg-gray-400';
    const textClass = STATUS_TEXT[statusKey] || STATUS_TEXT.Default;

    const blinkingClass = 'ring-8 ring-green-500 ring-offset-2 ring-offset-white scale-110 z-30 shadow-2xl animate-plot-blink';

    return (
      <div
        id={`plot-2-${plotNum}`}
        data-section="2"
        data-plot-num={plotNum}
        className={`flex flex-row items-center justify-between px-1.5 w-full h-full text-[8px] overflow-hidden select-none font-bold shadow-sm cursor-pointer plot-element ${isBlinking ? blinkingClass : ''}`}
        onMouseEnter={(e) => onHover && onHover(e, item)}
        onMouseLeave={() => onHover && onHover(null, null)}
        onClick={(e) => {
          e.stopPropagation();
          if (isAdmin && onEdit && item && item._entity === 'Plot') onEdit(item);
        }}
      >
        <span className={`text-[10px] leading-none font-black ${textClass}`}>{item.Grave}</span>
        <span className="text-[8px] leading-none text-gray-600 font-mono tracking-tighter truncate max-w-full">{item.Row}</span>
        <div className={`w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm ${bgClass}`}></div>
      </div>
    );
  });

  return (
    <div className="flex flex-col items-stretch overflow-x-auto pb-2">
      <div className="grid grid-flow-col gap-3" style={{ gridTemplateRows: `repeat(${perCol}, minmax(0, 1fr))`, gridTemplateColumns: `repeat(${cols}, max-content)`, gridAutoColumns: 'max-content' }}>
        {cells.map((item, idx) => (
          <div key={idx} className={`relative transition-all duration-200 ease-in-out transform-gpu ${baseColorClass} opacity-90 hover:opacity-100 border rounded-[1px] w-16 h-8 m-0.5`}>
            {item ? (
              <PlotCell 
                item={item} 
                baseColorClass={baseColorClass} 
                statusColors={statusColors} 
                STATUS_TEXT={STATUS_TEXT} 
                isAdmin={isAdmin} 
                onHover={onHover} 
                onEdit={onEdit} 
              />
            ) : (
              <div className="w-full h-full" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}