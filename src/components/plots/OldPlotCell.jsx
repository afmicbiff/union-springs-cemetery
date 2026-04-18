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
      0%, 100% { box-shadow: 0 0 8px 6px rgba(34,197,94,0.7); border-color: #15803d; background-color: rgba(74,222,128,0.25); }
      50% { box-shadow: 0 0 16px 10px rgba(74,222,128,0.8); border-color: #22c55e; background-color: rgba(74,222,128,0.45); }
    }
    .animate-old-plot-blink { animation: oldPlotBlink 0.8s ease-in-out infinite; }
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

const OldPlotCell = memo(function OldPlotCell({ item, isAdmin, onHover, onEdit }) {
  const [isBlinking, setIsBlinking] = useState(false);
  const blinkRef = useRef(false);
  const plotNum = item ? parseNum(item.Grave || item.plot_number) : null;

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

  if (!item) return <div className="w-[68px] h-[38px]" />;

  if (item._virtual && !item.Grave && !item.Status && !(item['Last Name'] || item.last_name)) {
    return <div className="w-[68px] h-[38px]" />;
  }

  if (item._virtual && !item.Grave && !item.Status && (item['Last Name'] || item.last_name)) {
    const labelText = item['Last Name'] || item.last_name || '';
    return (
      <div className="w-[68px] h-[38px] px-0.5 flex items-center" title={labelText}>
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
      className={`w-[68px] h-[38px] px-0.5 flex items-center gap-0.5 cursor-pointer hover:bg-yellow-50/50 transition-colors ${isBlinking ? 'animate-old-plot-blink ring-4 ring-green-400 ring-offset-2 z-50 relative rounded-sm border-2 border-green-600' : ''}`}
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