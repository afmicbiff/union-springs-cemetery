import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Clock, User, AlertTriangle, CheckCircle } from 'lucide-react';
import moment from 'moment';
import { Checkbox } from "@/components/ui/checkbox";

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

  // Fetch Audit Logs
  const { data: auditLogs, isLoading: isLoadingLogs } = useQuery({
      queryKey: ['plotAuditLogs', plot?.id],
      queryFn: () => base44.entities.PlotAuditLog.filter({ plot_id: plot.id }, '-timestamp'),
      enabled: !!plot?.id && isOpen
  });

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
        
        <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="history">Audit History</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
                <form onSubmit={handleSubmit} className="grid gap-6 py-4">
                  {/* Needs Review Alert */}
                  {formData.needs_review && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                              <h4 className="text-sm font-bold text-red-800">Flagged for Review</h4>
                              <p className="text-sm text-red-700 mt-1">{formData.review_notes}</p>
                              <div className="flex items-center gap-2 mt-3">
                                  <Checkbox 
                                      id="clear_review" 
                                      checked={!formData.needs_review} // Logic inverse for UI "Mark as Reviewed"
                                      onCheckedChange={(checked) => {
                                          if(checked) {
                                              handleChange('needs_review', false);
                                              handleChange('review_notes', null);
                                          }
                                      }}
                                  />
                                  <Label htmlFor="clear_review" className="text-red-900 font-medium cursor-pointer">
                                      Mark as Reviewed / Resolve Issue
                                  </Label>
                              </div>
                          </div>
                      </div>
                  )}
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
            </TabsContent>

            <TabsContent value="history">
                <div className="py-4">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <History className="w-4 h-4" /> Change Log
                    </h3>
                    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                        {isLoadingLogs ? (
                            <p className="text-center text-gray-500 py-4">Loading history...</p>
                        ) : auditLogs?.length > 0 ? (
                            <div className="space-y-6">
                                {auditLogs.map((log) => (
                                    <div key={log.id} className="relative pl-6 border-l-2 border-gray-200">
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gray-200 border-2 border-white"></div>
                                        <div className="mb-1 flex items-center justify-between">
                                            <span className="text-sm font-semibold text-gray-900">{log.change_summary}</span>
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {moment(log.timestamp).format('MMM D, YYYY h:mm A')}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                                            <User className="w-3 h-3" /> {log.changed_by}
                                        </div>
                                        {log.details && Object.keys(log.details).length > 0 && (
                                            <div className="bg-gray-50 p-2 rounded text-xs font-mono space-y-1">
                                                {Object.entries(log.details).map(([key, diff]) => (
                                                    <div key={key} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                                                        <span className="text-red-600 truncate text-right">{String(diff.from || 'empty')}</span>
                                                        <span className="text-gray-400">→</span>
                                                        <span className="text-green-600 truncate">{String(diff.to || 'empty')}</span>
                                                        <span className="col-span-3 text-gray-400 text-[10px] uppercase tracking-wide border-b border-gray-100 pb-1 mb-1">{key}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 py-8">
                                <History className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p>No audit history found for this plot.</p>
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}