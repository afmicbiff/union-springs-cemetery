import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const statusColor = (s) => ({
  open: 'bg-amber-100 text-amber-800',
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-stone-100 text-stone-700',
}[s] || 'bg-stone-100 text-stone-700');

export default function MaintenanceHistoryDialog({ open, onOpenChange, plotEntity, plotId }) {
  const q = useQuery({
    queryKey: ['plot-maintenance', plotEntity, plotId],
    enabled: open && !!plotEntity && !!plotId,
    queryFn: async () => base44.entities.PlotMaintenance.filter({ plot_entity: plotEntity, plot_ref_id: plotId }, '-created_date', 100),
    initialData: []
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Maintenance History</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {q.isLoading ? (
            <div className="text-sm text-stone-500">Loading…</div>
          ) : q.data.length === 0 ? (
            <div className="text-sm text-stone-500">No maintenance records yet for this plot.</div>
          ) : (
            q.data.map((m) => (
              <div key={m.id} className="border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{m.title}</div>
                  <Badge className={statusColor(m.status)}>{m.status}</Badge>
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  {m.category}
                  {m.scheduled_date ? ` • Scheduled ${m.scheduled_date}` : ''}
                  {m.completed_date ? ` • Completed ${m.completed_date}` : ''}
                </div>
                {m.description && <div className="text-sm text-stone-700 mt-1 whitespace-pre-wrap">{m.description}</div>}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}