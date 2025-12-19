import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const STATUS_OPTIONS = [
  'Available',
  'Reserved',
  'Occupied',
  'Veteran',
  'Unavailable',
  'Unknown'
];

export default function PlotEditDialog({ isOpen, onClose, plot, onSave }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (plot) {
      setFormData({ ...plot });
    }
  }, [plot]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!plot) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>Edit Plot Details</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          {/* Location Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider border-b pb-1">Location & Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="Section">Section</Label>
                <Input 
                  id="Section" 
                  value={formData.Section || ''} 
                  onChange={(e) => handleChange('Section', e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="Row">Row</Label>
                <Input 
                  id="Row" 
                  value={formData.Row || ''} 
                  onChange={(e) => handleChange('Row', e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="Grave">Grave Number</Label>
                <Input 
                  id="Grave" 
                  value={formData.Grave || ''} 
                  onChange={(e) => handleChange('Grave', e.target.value)} 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="Status">Status</Label>
              <Select 
                value={STATUS_OPTIONS.includes(formData.Status) ? formData.Status : 'Unknown'} 
                onValueChange={(val) => handleChange('Status', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Occupant Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider border-b pb-1">Occupant / Owner Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="FirstName">First Name</Label>
                <Input 
                  id="FirstName" 
                  value={formData['First Name'] || ''} 
                  onChange={(e) => handleChange('First Name', e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="LastName">Last Name</Label>
                <Input 
                  id="LastName" 
                  value={formData['Last Name'] || ''} 
                  onChange={(e) => handleChange('Last Name', e.target.value)} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="FamilyName">Family Name (Owner/Reservation)</Label>
              <Input 
                id="FamilyName" 
                value={formData['Family Name'] || ''} 
                onChange={(e) => handleChange('Family Name', e.target.value)} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="Birth">Birth Date</Label>
                <Input 
                  id="Birth" 
                  value={formData.Birth || ''} 
                  onChange={(e) => handleChange('Birth', e.target.value)}
                  placeholder="MM/DD/YYYY"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="Death">Death Date</Label>
                <Input 
                  id="Death" 
                  value={formData.Death || ''} 
                  onChange={(e) => handleChange('Death', e.target.value)}
                  placeholder="MM/DD/YYYY"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="Notes">Notes</Label>
            <Textarea 
              id="Notes" 
              value={formData.Notes || ''} 
              onChange={(e) => handleChange('Notes', e.target.value)}
              className="h-24"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}