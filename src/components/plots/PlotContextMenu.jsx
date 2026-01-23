import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

export default function PlotContextMenu({ 
  isOpen, 
  onClose, 
  plot, 
  onAddBlankAbove, 
  onDeleteAndShift,
  canDelete 
}) {
  const [addBlank, setAddBlank] = useState(false);
  const [deleteShift, setDeleteShift] = useState(false);

  const handleConfirm = () => {
    if (addBlank) {
      onAddBlankAbove(plot);
    }
    if (deleteShift && canDelete) {
      onDeleteAndShift(plot);
    }
    setAddBlank(false);
    setDeleteShift(false);
    onClose();
  };

  const handleClose = () => {
    setAddBlank(false);
    setDeleteShift(false);
    onClose();
  };

  if (!plot) return null;

  const plotLabel = plot.Grave || plot.plot_number || 'Unknown';
  const isEmpty = !plot.first_name && !plot.last_name && !plot['First Name'] && !plot['Last Name'];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Plot Actions - #{plotLabel}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Add Blank Plot Above */}
          <div className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <Checkbox 
              id="add-blank" 
              checked={addBlank} 
              onCheckedChange={setAddBlank}
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label htmlFor="add-blank" className="flex items-center gap-2 cursor-pointer font-medium">
                <Plus className="w-4 h-4 text-green-600" />
                Add blank plot above
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Inserts a new empty plot directly above plot #{plotLabel}
              </p>
            </div>
          </div>

          {/* Delete and Shift */}
          <div className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
            canDelete && isEmpty 
              ? 'border-gray-200 hover:bg-gray-50' 
              : 'border-gray-100 bg-gray-50 opacity-50'
          }`}>
            <Checkbox 
              id="delete-shift" 
              checked={deleteShift} 
              onCheckedChange={setDeleteShift}
              disabled={!canDelete || !isEmpty}
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label 
                htmlFor="delete-shift" 
                className={`flex items-center gap-2 font-medium ${
                  canDelete && isEmpty ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-4 h-4 text-red-600" />
                Delete plot & shift others up
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                {!isEmpty 
                  ? "Cannot delete: plot has occupant data"
                  : "Removes this empty plot and shifts plots above it down"
                }
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!addBlank && !deleteShift}
            className="bg-teal-700 hover:bg-teal-800"
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}