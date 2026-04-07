import React, { memo, useState, useEffect, useCallback, useRef } from "react";

// Inject blink animation CSS
if (typeof document !== 'undefined' && !document.getElementById('plot-blink-style')) {
  const style = document.createElement('style');
  style.id = 'plot-blink-style';
  style.textContent = `
    @keyframes plotBlink {
      0%, 100% { background-color: #22c55e; border-color: #15803d; box-shadow: 0 0 4px 2px rgba(34, 197, 94, 0.4); }
      50% { background-color: #4ade80; border-color: #22c55e; box-shadow: 0 0 6px 3px rgba(74, 222, 128, 0.5); }
    }
    .animate-plot-blink { animation: plotBlink 1s ease-in-out infinite; }
  `;
  document.head.appendChild(style);
}

const STATUS_BG = {
  Available: 'bg-green-500',
  Reserved: 'bg-yellow-400',
  Occupied: 'bg-red-500',
  Veteran: 'bg-blue-600',
  Unavailable: 'bg-gray-500',
  Unknown: 'bg-purple-500',
  'Not Usable': 'bg-gray-400',
  Default: 'bg-gray-300',
};

function parseNum(g) {
  const n = parseInt(String(g || "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

const ExcelGridCell = memo(function ExcelGridCell({ item, isAdmin, onHover, onEdit }) {
  const [isBlinking, setIsBlinking] = useState(false);
  const isBlinkingRef = useRef(false);
  const plotNum = item ? parseNum(item.Grave || item.plot_number) : null;

  useEffect(() => {
    if (!item || plotNum == null) return;

    const handleBlink = (e) => {
      const { targetPlotNum } = e.detail || {};
      if (targetPlotNum === plotNum) {
        isBlinkingRef.current = true;
        setIsBlinking(true);
      }
    };
    const handleSearchBlink = (e) => {
      const { targetPlotNum } = e.detail || {};
      if (targetPlotNum === plotNum) {
        isBlinkingRef.current = true;
        setIsBlinking(true);
      }
    };
    const handleStop = () => {
      if (isBlinkingRef.current) {
        isBlinkingRef.current = false;
        setIsBlinking(false);
      }
    };

    window.addEventListener('plot-start-blink', handleBlink);
    window.addEventListener('plot-search-blink', handleSearchBlink);
    window.addEventListener('plot-stop-all-blink', handleStop);
    return () => {
      window.removeEventListener('plot-start-blink', handleBlink);
      window.removeEventListener('plot-search-blink', handleSearchBlink);
      window.removeEventListener('plot-stop-all-blink', handleStop);
    };
  }, [plotNum, item]);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (isBlinkingRef.current) {
      isBlinkingRef.current = false;
      setIsBlinking(false);
      window.dispatchEvent(new CustomEvent('plot-stop-all-blink'));
    }
    if (isAdmin && onEdit && item) onEdit(item);
  }, [isAdmin, onEdit, item]);

  const handleMouseEnter = useCallback((e) => {
    if (onHover && item) onHover(e, item);
  }, [onHover, item]);

  const handleMouseLeave = useCallback(() => {
    if (onHover) onHover(null, null);
  }, [onHover]);

  // Empty cell
  if (!item) {
    return <div className="w-[66px] h-9 border-r border-gray-100" />;
  }

  const isVet = item.Status === 'Veteran' || ((item.Notes || '').toLowerCase().includes('vet') && item.Status === 'Occupied');
  const statusKey = isVet ? 'Veteran' : (STATUS_BG[item.Status] ? item.Status : 'Default');
  const dotBg = STATUS_BG[statusKey] || STATUS_BG.Default;

  const lastName = item['Last Name'] || item.last_name || '';
  const displayName = lastName.length > 8 ? lastName.substring(0, 8) + '…' : lastName;
  const graveLabel = item.Grave || item.plot_number || '';

  return (
    <div
      data-plot-num={plotNum}
      className={`w-[66px] h-9 px-1 flex items-center gap-0.5 border-r border-gray-200/50 cursor-pointer hover:bg-yellow-50 transition-colors plot-element ${
        isBlinking ? 'animate-plot-blink ring-2 ring-green-500 ring-offset-1 z-50 relative' : ''
      }`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={`#${graveLabel} ${item.Row || item.row_number || ''} - ${item.Status || ''}`}
    >
      <div className={`w-2 h-2 rounded-full shrink-0 ${dotBg}`} />
      <div className="flex flex-col leading-none min-w-0 overflow-hidden">
        <span className="text-[9px] font-bold text-gray-800 truncate">#{graveLabel}</span>
        {displayName && (
          <span className="text-[7px] text-gray-500 truncate">{displayName}</span>
        )}
      </div>
    </div>
  );
});

export default ExcelGridCell;