import React from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { Phone } from 'lucide-react';

export default function RequestPlotDialog({ open, onOpenChange, selectedPlot }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Question about the new plots</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm text-stone-700">
          {selectedPlot && (
            <div className="p-2 rounded-md bg-stone-50 border border-stone-200 text-xs">
              Selected plot: Section {selectedPlot.section || '-'} • Row {selectedPlot.row_number || '-'} • Plot {selectedPlot.plot_number || '-'}
            </div>
          )}
          <p>Send a message to the Plot administrator</p>

          <Link to={createPageUrl('Contact')} onClick={() => onOpenChange(false)}>
            <Button className="bg-red-800 hover:bg-red-900 text-white font-serif px-4 py-3 sm:py-4 text-sm sm:text-base md:text-lg rounded-sm shadow-lg w-full whitespace-normal break-words leading-snug text-center flex items-center justify-center gap-2 touch-manipulation active:scale-[0.98]">
              <Phone className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              <span>Contact Administrator</span>
            </Button>
          </Link>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}