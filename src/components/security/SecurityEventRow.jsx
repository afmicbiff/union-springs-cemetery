import React, { memo, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const SEV_BADGE = {
  info: 'bg-slate-100 text-slate-700',
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};

// Lightweight date formatter - avoid heavy date-fns on each row
const formatEventDate = (dateStr) => {
  try {
    const d = new Date(dateStr);
    const mon = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${mon} ${day}, ${time}`;
  } catch {
    return '-';
  }
};

function SecurityEventRow({ event, isBlocked, intelMatch, onView, onBlockIp }) {
  const handleView = useCallback(() => onView(event), [event, onView]);
  const handleBlock = useCallback(() => onBlockIp(event.ip_address), [event.ip_address, onBlockIp]);

  const formattedDate = useMemo(() => formatEventDate(event.created_date), [event.created_date]);
  const sevClass = SEV_BADGE[event.severity] || SEV_BADGE.info;

  return (
    <tr className="active:bg-stone-100">
      <td className="p-1 sm:p-1.5 text-stone-600 text-[10px] sm:text-xs whitespace-nowrap">{formattedDate}</td>
      <td className="p-1 sm:p-1.5">
        <Badge className={`${sevClass} text-[9px] sm:text-[10px] px-1 py-0`}>
          {event.severity?.slice(0, 4)}
        </Badge>
      </td>
      <td className="p-1 sm:p-1.5 text-[10px] sm:text-xs hidden sm:table-cell">{event.event_type}</td>
      <td className="p-1 sm:p-1.5 max-w-[100px] sm:max-w-[180px] truncate text-[10px] sm:text-xs" title={event.message}>
        {event.message}
      </td>
      <td className="p-1 sm:p-1.5 text-[10px] sm:text-xs">
        <span className="font-mono text-[9px] sm:text-[10px]">{event.ip_address || '-'}</span>
        {intelMatch && <span className="ml-0.5 text-red-600 text-[8px]">⚠</span>}
      </td>
      <td className="p-1 sm:p-1.5">
        <div className="flex gap-0.5 sm:gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleView} 
            className="h-5 sm:h-6 px-1 sm:px-1.5 text-[9px] sm:text-[10px] touch-manipulation"
          >
            View
          </Button>
          {event.ip_address && !isBlocked && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBlock}
              className="h-5 sm:h-6 px-1 sm:px-1.5 text-[9px] sm:text-[10px] text-red-600 touch-manipulation"
            >
              Block
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default memo(SecurityEventRow, (prev, next) => 
  prev.event.id === next.event.id && 
  prev.isBlocked === next.isBlocked && 
  prev.intelMatch === next.intelMatch
);