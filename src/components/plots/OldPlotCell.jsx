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

// Inject blink animation CSS once — lightweight opacity-only animation to avoid heavy repaints
if (typeof document !== 'undefined' && !document.getElementById('old-plot-blink-style')) {
  const style = document.createElement('style');
  style.id = 'old-plot-blink-style';
  style.textContent = `
    @keyframes oldPlotBlink {
      0%, 100% { outline-color: rgba(34,197,94,1); }
      50% { outline-color: rgba(34,197,94,0.3); }
    }
    .animate-old-plot-blink {
      outline: 3px solid rgba(34,197,94,1);
      outline-offset: 1px;
      animation: oldPlotBlink 1s ease-in-out infinite;
      will-change: outline-color;
    }
  `;
  document.head.appendChild(style);
}

function parseNum(g) {
  const n = parseInt(String(g || '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

// Delegated event listener manager — one listener per event type instead of one per cell
const blinkListeners = {
  installed: false,
  callbacks: new Map(), // plotNum -> setState callback
  install() {
    if (this.installed) return;
    this.installed = true;
    window.addEventListener('plot-start-blink', (e) => {
      const num = e.detail?.targetPlotNum;
      const cb = this.callbacks.get(num);
      if (cb) cb(true);
    });
    window.addEventListener('plot-search-blink', (e) => {
      const num = e.detail?.targetPlotNum;
      const cb = this.callbacks.get(num);
      if (cb) cb(true);
    });
    window.addEventListener('plot-stop-all-blink', () => {
      this.callbacks.forEach((cb) => cb(false));
    });
  },
  register(plotNum, cb) {
    this.install();
    this.callbacks.set(plotNum, cb);
  },
  unregister(plotNum) {
    this.callbacks.delete(plotNum);
  },
};

const OldPlotCell = memo(function OldPlotCell({ item, isAdmin, onHover, onEdit, colIndex }) {
  const plotNum = item ? parseNum(item.Grave || item.plot_number) : null;
  const sizeClass = plotNum >= 1 && plotNum <= 23
    ? 'w-[100px] h-[53px]'
    : (colIndex === 6 || colIndex === 7) ? 'w-[95px] h-[38px]' : (colIndex >= 0 && colIndex <= 5) ? 'w-[75px] h-[38px]' : 'w-[68px] h-[38px]';
  const [isBlinking, setIsBlinking] = useState(false);
  const blinkRef = useRef(false);

  useEffect(() => {
    if (!item || plotNum == null) return;
    const cb = (on) => { blinkRef.current = on; setIsBlinking(on); };
    blinkListeners.register(plotNum, cb);
    return () => blinkListeners.unregister(plotNum);
  }, [plotNum, item]);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (blinkRef.current) { blinkRef.current = false; setIsBlinking(false); window.dispatchEvent(new CustomEvent('plot-stop-all-blink')); }
    if (isAdmin && onEdit && item) onEdit(item);
  }, [isAdmin, onEdit, item]);

  const handleMouseEnter = useCallback((e) => { if (onHover && item) onHover(e, item); }, [onHover, item]);
  const handleMouseLeave = useCallback(() => { if (onHover) onHover(null, null); }, [onHover]);

  if (!item) return <div className={sizeClass} />;

  if (item._virtual && !item.Grave && !item.Status && !(item['Last Name'] || item.last_name)) {
    return <div className={sizeClass} />;
  }

  if (item._virtual && !item.Grave && !item.Status && (item['Last Name'] || item.last_name)) {
    const labelText = item['Last Name'] || item.last_name || '';
    return (
      <div className={`${sizeClass} px-0.5 flex items-center`} title={labelText}>
        <span className="text-[7px] text-gray-700 font-semibold leading-tight line-clamp-2 overflow-hidden">{labelText}</span>
      </div>
    );
  }

  const isVet = item.Status === 'Veteran' || ((item.Notes || '').toLowerCase().includes('vet') && item.Status === 'Occupied');
  const statusKey = isVet ? 'Veteran' : (item.Status || 'Unknown');
  const dotBg = STATUS_BG[statusKey] || 'bg-gray-300';
  const lastName = item['Last Name'] || item.last_name || '';
  const display = lastName.length > 9 ? lastName.substring(0, 9) + '…' : lastName;
  const graveLabel = item.Grave || item.plot_number || '';
  const isNotUsable = statusKey === 'Not Usable';
  const displayLabel = isNotUsable ? 'N/U' : `#${graveLabel}`;

  return (
    <div
      data-plot-num={plotNum}
      className={`${sizeClass} px-0.5 flex items-center gap-0.5 cursor-pointer hover:bg-yellow-50/50 transition-colors relative ${isBlinking ? 'animate-old-plot-blink z-50 rounded-sm' : ''}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={isNotUsable ? 'Not Usable' : `#${graveLabel} ${item.Row || item.row_number || ''} - ${statusKey}`}
    >
      <div className={`w-2 h-2 rounded-full shrink-0 ${dotBg}`} />
      <div className="flex flex-col leading-none min-w-0 overflow-hidden">
        <span className="text-[9px] font-bold text-gray-800 truncate">{displayLabel}</span>
        {display && <span className="text-[7px] text-gray-500 truncate">{display}</span>}
      </div>
    </div>
  );
});

export default OldPlotCell;