import React, { memo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const SEV_BADGE = {
  info: 'bg-slate-100 text-slate-700',
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};

function SecurityEventRow({ event, isBlocked, intelMatch, onView, onBlockIp }) {
  const handleView = useCallback(() => onView(event), [event, onView]);
  const handleBlock = useCallback(() => onBlockIp(event.ip_address), [event.ip_address, onBlockIp]);

  const formattedDate = format(new Date(event.created_date), 'MMM d, HH:mm');

  return (
    <tr className="hover:bg-stone-50 transition-colors">
      <td className="p-1.5 sm:p-2 text-stone-600 text-[10px] sm:text-xs whitespace-nowrap">{formattedDate}</td>
      <td className="p-1.5 sm:p-2">
        <Badge className={`${SEV_BADGE[event.severity] || SEV_BADGE.info} text-[10px] sm:text-xs`}>
          {event.severity}
        </Badge>
      </td>
      <td className="p-1.5 sm:p-2 text-[10px] sm:text-xs">{event.event_type}</td>
      <td className="p-1.5 sm:p-2 max-w-[120px] sm:max-w-[200px] lg:max-w-[300px] truncate text-[10px] sm:text-xs" title={event.message}>
        {event.message}
      </td>
      <td className="p-1.5 sm:p-2 text-[10px] sm:text-xs">
        <span className="font-mono">{event.ip_address || '-'}</span>
        {intelMatch && (
          <Badge className="ml-1 bg-red-100 text-red-700 text-[9px]">Threat</Badge>
        )}
      </td>
      <td className="p-1.5 sm:p-2">
        <div className="flex gap-1 sm:gap-1.5">
          <Button variant="outline" size="sm" onClick={handleView} className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs">
            View
          </Button>
          {event.ip_address && (
            <Button 
              variant="secondary" 
              size="sm" 
              disabled={isBlocked} 
              onClick={handleBlock}
              className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs"
            >
              {isBlocked ? 'Blocked' : 'Block'}
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default memo(SecurityEventRow);