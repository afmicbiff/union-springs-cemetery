import React from "react";

function parseNum(g) {
  const n = parseInt(String(g || "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

export default function Section1DnDGrid({ plots, baseColorClass, isAdmin, onHover, onEdit, statusColors }) {
  // Build grid dimensions from numeric graves
  const nums = React.useMemo(() => (
    (plots || [])
      .map((p) => parseNum(p.Grave))
      .filter((n) => Number.isFinite(n) && n > 0)
  ), [plots]);

  const maxNum = React.useMemo(() => (nums.length ? Math.max(...nums) : 0), [nums]);
  const cols = 8;
  const perCol = Math.max(1, Math.ceil(maxNum / cols));
  const total = cols * perCol;

  // Text colors to mimic legend semantics on numbers
  const STATUS_TEXT = {
    Available: 'text-green-700',
    Reserved: 'text-yellow-700',
    Occupied: 'text-red-700',
    Veteran: 'text-blue-700',
    Unavailable: 'text-gray-700',
    Unknown: 'text-purple-700',
    Default: 'text-gray-700',
  };

  // Build cells layout
  const cells = React.useMemo(() => {
    if (!plots || !plots.length) return Array(total).fill(null);

    const nextCells = Array(total).fill(null);

    for (let c = 0; c < cols; c++) {
      const start = c * perCol + 1;
      const end = Math.min((c + 1) * perCol, maxNum);
      const colPlots = plots
        .filter((p) => {
          const n = parseNum(p.Grave);
          return n && n >= start && n <= end;
        })
        .sort((a, b) => (parseNum(a.Grave) || 0) - (parseNum(b.Grave) || 0));

      colPlots.forEach((plot, idx) => {
        const row = perCol - 1 - idx;
        if (row >= 0 && row < perCol) {
          const cellIndex = c * perCol + row;
          nextCells[cellIndex] = plot;
        }
      });
    }

    return nextCells;
  }, [plots, cols, perCol, maxNum, total]);

  const renderCell = (c, r) => {
    const idx = c * perCol + r;
    const item = cells[idx];

    const isVet = item && ((item.Status === 'Veteran') || ((item.Notes || '').toLowerCase().includes('vet') && item.Status === 'Occupied'));
    const statusKey = item ? (isVet ? 'Veteran' : ((statusColors && statusColors[item.Status]) ? item.Status : 'Default')) : 'Default';
    const fullClass = (statusColors && statusColors[statusKey]) || '';
    const bgClass = (fullClass.split(' ').find(cn => cn.startsWith('bg-'))) || 'bg-gray-400';
    const textClass = STATUS_TEXT[statusKey] || STATUS_TEXT.Default;

    return (
      <div key={`s1-c${c}-r${r}`} className="w-16 h-8 m-0.5 rounded-[1px] relative">
        {item ? (
          <div
            className={`border ${baseColorClass} w-16 h-8 px-1.5 text-[8px] m-0.5 rounded-[1px] flex items-center justify-between bg-opacity-90 plot-element cursor-pointer hover:opacity-100 transition-all`}
            onMouseEnter={(e) => onHover && onHover(e, item)}
            onMouseLeave={() => onHover && onHover(null, null)}
            onClick={(e) => {
              e.stopPropagation();
              if (isAdmin && onEdit && item && item._entity === 'Plot') onEdit(item);
            }}
            id={`plot-1-${parseNum(item.Grave)}`}
            title={`Row: ${item.Row}, Grave: ${item.Grave}`}
          >
            <span className={`text-[10px] leading-none font-black ${textClass}`}>{item.Grave}</span>
            <span className="text-[8px] leading-none text-gray-600 font-mono tracking-tighter truncate max-w-full">{item.Row}</span>
            <div className={`w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm ${bgClass}`}></div>
          </div>
        ) : (
          <div className="w-16 h-8 m-0.5 border border-dashed border-gray-300 bg-gray-50/50 rounded-[1px]" />
        )}
      </div>
    );
  };

  return (
    <div className="flex gap-4 justify-center overflow-x-auto pb-2">
      {Array.from({ length: cols }).map((_, c) => (
        <div key={c} className="flex flex-col gap-1 justify-end">
          {Array.from({ length: perCol }).map((__, r) => renderCell(c, r))}
        </div>
      ))}
    </div>
  );
}