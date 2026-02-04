import React, { memo, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Loader2, Shield, ShieldOff } from 'lucide-react';

const BlockedIPRow = memo(function BlockedIPRow({ record, intelMatch, onUnblock }) {
  const now = Date.now();
  const isActive = record.active && new Date(record.blocked_until).getTime() > now;
  const status = isActive ? 'Active' : (record.active ? 'Expired' : 'Inactive');
  
  const handleUnblock = useCallback(() => onUnblock(record), [record, onUnblock]);

  return (
    <tr className="hover:bg-stone-50 transition-colors">
      <td className="p-1.5 sm:p-2 font-mono text-[10px] sm:text-xs">{record.ip_address}</td>
      <td className="p-1.5 sm:p-2 text-[10px] sm:text-xs max-w-[100px] sm:max-w-[150px] truncate">{record.reason || '-'}</td>
      <td className="p-1.5 sm:p-2 text-[10px] sm:text-xs whitespace-nowrap">
        {record.blocked_until ? format(new Date(record.blocked_until), 'MMM d, HH:mm') : '-'}
      </td>
      <td className="p-1.5 sm:p-2">
        <Badge className={`${isActive ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-600'} text-[10px] sm:text-xs`}>
          {isActive ? <Shield className="w-2.5 h-2.5 mr-0.5" /> : <ShieldOff className="w-2.5 h-2.5 mr-0.5" />}
          {status}
        </Badge>
      </td>
      <td className="p-1.5 sm:p-2">
        {intelMatch ? (
          <Badge className="bg-red-100 text-red-700 text-[10px]">Threat</Badge>
        ) : (
          <span className="text-stone-400 text-[10px]">—</span>
        )}
      </td>
      <td className="p-1.5 sm:p-2">
        {isActive ? (
          <Button size="sm" variant="outline" onClick={handleUnblock} className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs">
            Unblock
          </Button>
        ) : (
          <span className="text-stone-400 text-[10px]">—</span>
        )}
      </td>
    </tr>
  );
});

function BlockedIPsTable({ records = [], intelMap = {}, isLoading = false, onUnblock }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 sm:py-8 text-stone-500 text-sm">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading blocked IPs…
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-6 sm:py-8 text-stone-500 text-xs sm:text-sm">
        No blocked IPs found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-3 sm:mx-0">
      <table className="w-full text-sm min-w-[500px]">
        <thead className="bg-stone-50">
          <tr>
            <th className="p-1.5 sm:p-2 text-left text-[10px] sm:text-xs font-medium">IP</th>
            <th className="p-1.5 sm:p-2 text-left text-[10px] sm:text-xs font-medium">Reason</th>
            <th className="p-1.5 sm:p-2 text-left text-[10px] sm:text-xs font-medium">Until</th>
            <th className="p-1.5 sm:p-2 text-left text-[10px] sm:text-xs font-medium">Status</th>
            <th className="p-1.5 sm:p-2 text-left text-[10px] sm:text-xs font-medium">Intel</th>
            <th className="p-1.5 sm:p-2 text-left text-[10px] sm:text-xs font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {records.map(record => (
            <BlockedIPRow
              key={record.id}
              record={record}
              intelMatch={intelMap[record.ip_address]?.matched}
              onUnblock={onUnblock}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default memo(BlockedIPsTable);