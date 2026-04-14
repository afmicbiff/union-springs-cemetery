import React, { memo, useState, useEffect, useCallback, useRef } from "react";

const STATUS_BG = {
  Available: 'bg-green-500',
  Reserved: 'bg-yellow-400',
  Occupied: 'bg-red-500',
  Veteran: 'bg-blue-600',
  Unavailable: 'bg-gray-500',
  Unknown: 'bg-purple-500',
  'Not Usable': 'bg-gray-400',
};

// Inject blink animation CSS once
if (typeof document !== 'undefined' && !document.getElementById('old-plot-blink-style')) {
  const style = document.createElement('style');
  style.id = 'old-plot-blink-style';
  style.textContent = `
    @keyframes oldPlotBlink {
      0%, 100% { box-shadow: 0 0 4px 2px rgba(34,197,94,0.5); border-color: #15803d; }
      50% { box-shadow: 0 0 8px 4px rgba(74,222,128,0.6); border-color: #22c55e; }
    }
    .animate-old-plot-blink { animation: oldPlotBlink 1s ease-in-out infinite; }
  `;
  document.head.appendChild(style);
}

function parseNum(g) {
  const n = parseInt(String(g || '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

const OldPlotCell = memo(function OldPlotCell({ item, isAdmin, onHover, onEdit }) {
  const [isBlinking, setIsBlinking] = useState(false);
  const blinkRef = useRef(false);
  const plotNum = item ? parseNum(item.Grave || item.plot_number) : null;

  useEffect(() => {
    if (!item || plotNum == null) return;
    const handleBlink = (e) => {
      if (e.detail?.targetPlotNum === plotNum) { blinkRef.current = true; setIsBlinking(true); }
    };
    const handleStop = () => { if (blinkRef.current) { blinkRef.current = false; setIsBlinking(false); } };
    window.addEventListener('plot-start-blink', handleBlink);
    window.addEventListener('plot-search-blink', handleBlink);
    window.addEventListener('plot-stop-all-blink', handleStop);
    return () => {
      window.removeEventListener('plot-start-blink', handleBlink);
      window.removeEventListener('plot-search-blink', handleBlink);
      window.removeEventListener('plot-stop-all-blink', handleStop);
    };
  }, [plotNum, item]);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (blinkRef.current) { blinkRef.current = false; setIsBlinking(false); window.dispatchEvent(new CustomEvent('plot-stop-all-blink')); }
    if (isAdmin && onEdit && item) onEdit(item);
  }, [isAdmin, onEdit, item]);

  const handleMouseEnter = useCallback((e) => { if (onHover && item) onHover(e, item); }, [onHover, item]);
  const handleMouseLeave = useCallback(() => { if (onHover) onHover(null, null); }, [onHover]);

  if (!item) return <div className="w-[68px] h-[38px] border-r border-gray-100/50" />;

  const isVet = item.Status === 'Veteran' || ((item.Notes || '').toLowerCase().includes('vet') && item.Status === 'Occupied');
  const statusKey = isVet ? 'Veteran' : (item.Status || 'Unknown');
  const dotBg = STATUS_BG[statusKey] || 'bg-gray-300';
  const lastName = item['Last Name'] || item.last_name || '';
  const display = lastName.length > 9 ? lastName.substring(0, 9) + '…' : lastName;
  const graveLabel = item.Grave || item.plot_number || '';

  return (
    <div
      data-plot-num={plotNum}
      className={`w-[68px] h-[38px] px-0.5 flex items-center gap-0.5 border-r border-gray-200/50 cursor-pointer hover:bg-yellow-50 transition-colors ${isBlinking ? 'animate-old-plot-blink ring-2 ring-green-500 ring-offset-1 z-50 relative' : ''}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={`#${graveLabel} ${item.Row || item.row_number || ''} - ${statusKey}`}
    >
      <div className={`w-2 h-2 rounded-full shrink-0 ${dotBg}`} />
      <div className="flex flex-col leading-none min-w-0 overflow-hidden">
        <span className="text-[9px] font-bold text-gray-800 truncate">#{graveLabel}</span>
        {display && <span className="text-[7px] text-gray-500 truncate">{display}</span>}
      </div>
    </div>
  );
});

export default OldPlotCell;