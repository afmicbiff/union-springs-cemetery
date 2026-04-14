import React, { memo } from "react";

const STATUS_COLORS = {
  Available: 'bg-green-500', Reserved: 'bg-yellow-400', Occupied: 'bg-red-500',
  Veteran: 'bg-blue-600', Unavailable: 'bg-gray-500', Unknown: 'bg-purple-500',
  'Not Usable': 'bg-gray-400',
};

const OldPlotTooltip = memo(function OldPlotTooltip({ data, visible }) {
  if (!visible || !data) return null;
  const isVet = data.Status === 'Veteran' || (data.Notes && data.Notes.toLowerCase().includes('vet'));
  const statusKey = isVet ? 'Veteran' : (STATUS_COLORS[data.Status] ? data.Status : 'Unknown');
  const bgClass = STATUS_COLORS[statusKey] || 'bg-gray-400';
  
  return (
    <div className="fixed z-[9999] inset-0 flex items-center justify-center pointer-events-none">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-72 max-w-[85vw] pointer-events-none p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-3 h-3 rounded-full ${bgClass}`} />
          <span className="font-bold text-gray-900">Plot #{data.Grave || data.plot_number}</span>
          <span className="text-xs text-gray-500 ml-auto">{statusKey}</span>
        </div>
        <p className="text-sm text-gray-600">Row: {data.Row || data.row_number}</p>
        {data['Family Name'] && <p className="text-sm font-medium mt-2 text-teal-700">Family: {data['Family Name']}</p>}
        {(data['First Name'] || data['Last Name']) && (
          <p className="text-sm font-medium mt-1">{data['First Name']} {data['Last Name']}</p>
        )}
        {data.Birth && data.Death && <p className="text-xs text-gray-500">{data.Birth} – {data.Death}</p>}
        {data.Notes && <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">{data.Notes}</p>}
      </div>
    </div>
  );
});

export default OldPlotTooltip;