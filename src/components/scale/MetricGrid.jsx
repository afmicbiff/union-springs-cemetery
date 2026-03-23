import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function MetricGrid({ items }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
      {items.map((item) => (
        <Card key={item.label} className="border-stone-200 bg-white">
          <CardContent className="p-4 space-y-1">
            <div className="text-xs uppercase tracking-wide text-stone-500">{item.label}</div>
            <div className="text-sm font-semibold text-stone-900">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}