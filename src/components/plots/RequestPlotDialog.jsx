import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';

export default function RequestPlotDialog({ open, onOpenChange, selectedPlot }) {
  const authQ = useQuery({
    queryKey: ['is-auth'],
    queryFn: () => base44.auth.isAuthenticated(),
    initialData: false,
  });

  const userQ = useQuery({
    queryKey: ['me'],
    enabled: !!authQ.data,
    queryFn: () => base44.auth.me(),
  });

  const memberQ = useQuery({
    queryKey: ['member-by-email', userQ.data?.email],
    enabled: !!userQ.data?.email,
    queryFn: async () => {
      const res = await base44.entities.Member.filter({ email_primary: userQ.data.email }, null, 1);
      return res?.[0] || null;
    },
  });

  const goToPortal = async () => {
    const portalUrl = createPageUrl('MemberPortal') + '?tab=reservations' + (selectedPlot?.id ? `&plotId=${encodeURIComponent(selectedPlot.id)}` : '');
    try {
      if (selectedPlot?.id) {
        localStorage.setItem('selected_plot_id', selectedPlot.id);
        localStorage.setItem('selected_plot_details', JSON.stringify({
          id: selectedPlot.id,
          section: selectedPlot.section || '',
          row_number: selectedPlot.row_number || '',
          plot_number: selectedPlot.plot_number || ''
        }));
        if (await base44.auth.isAuthenticated()) {
          await base44.auth.updateMe({ last_selected_plot_id: selectedPlot.id });
        }
      }
    } catch (_) {}
    if (!authQ.data) {
      base44.auth.redirectToLogin(portalUrl);
      return;
    }
    window.location.href = portalUrl;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Reserve a Plot – Start Here</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm text-stone-700">
          {!authQ.data ? (
            <div className="p-3 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
              You are not logged in. You’ll be asked to sign up or log in to continue.
            </div>
          ) : !memberQ.data ? (
            <div className="p-3 rounded-md bg-blue-50 text-blue-900 border border-blue-200">
              Welcome! Please complete your Member Profile after entering the portal to proceed with a reservation.
            </div>
          ) : (
            <div className="p-3 rounded-md bg-green-50 text-green-900 border border-green-200">
              Profile found. You can continue in the Member Portal/Account to request your plot.
            </div>
          )}

          {selectedPlot && (
            <div className="p-2 rounded-md bg-stone-50 border border-stone-200 text-xs">
              Selected plot: Section {selectedPlot.section || '-'} • Row {selectedPlot.row_number || '-'} • Plot {selectedPlot.plot_number || '-'}
            </div>
          )}
          <div>
            <div className="font-medium mb-2">Steps to get a plot</div>
            <ol className="list-decimal ml-5 space-y-1">
              <li>Sign up or log in to the Member Portal/Account.</li>
              <li>Fill out your Member Profile (contact details).</li>
              <li>Select your plot, review and sign the documents.</li>
              <li>Complete payment to finalize the reservation.</li>
            </ol>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}