import React from 'react';
import { Badge } from '@/components/ui/badge';

const tone = {
  High: 'bg-red-100 text-red-800 border-red-200',
  Medium: 'bg-amber-100 text-amber-800 border-amber-200',
  Low: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

export default function IssueCardList({ items }) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="rounded-xl border border-stone-200 p-4 bg-stone-50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="font-semibold text-stone-900">{item.id}</div>
            <Badge className={tone[item.severity] || tone.Medium}>{item.severity}</Badge>
          </div>
          <div className="grid gap-2 text-sm text-stone-700">
            <p><span className="font-medium text-stone-900">Bottleneck scenario:</span> {item.bottleneck}</p>
            <p><span className="font-medium text-stone-900">Root cause:</span> {item.rootCause}</p>
            <p><span className="font-medium text-stone-900">Fix:</span> {item.fix}</p>
            <p><span className="font-medium text-stone-900">Load test results:</span> {item.loadTest}</p>
            <p><span className="font-medium text-stone-900">Regression risk:</span> {item.risk}</p>
          </div>
        </div>
      ))}
    </div>
  );
}