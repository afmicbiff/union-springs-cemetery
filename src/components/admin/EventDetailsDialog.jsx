import React, { memo, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RefreshCw, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const EventDetailsDialog = memo(function EventDetailsDialog({ event, isOpen, onClose, employees, onDelete, onEdit }) {
    const attendees = useMemo(() => {
        if (!event) return [];
        return employees.filter(emp => event.attendee_ids?.includes(emp.id));
    }, [event, employees]);

    if (!event) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle className="text-xl">{event.title}</DialogTitle>
                            <DialogDescription className="mt-1 flex items-center gap-2">
                                <Badge variant="outline">{event.type}</Badge>
                                <span>{format(parseISO(event.start_time), 'PPP p')}</span>
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {event.description && (
                        <div>
                            <Label className="text-xs text-stone-500 uppercase tracking-wider">Description</Label>
                            <p className="text-stone-800 bg-stone-50 p-3 rounded-md mt-1 text-sm">{event.description}</p>
                        </div>
                    )}

                    <div>
                        <Label className="text-xs text-stone-500 uppercase tracking-wider">Recurrence</Label>
                        <p className="text-stone-800 text-sm mt-1 capitalize flex items-center gap-2">
                            <RefreshCw className="w-3 h-3" />
                            {event.recurrence === 'none' ? 'One-time event' : event.recurrence}
                            {event.recurrence_end_date && ` (Until ${format(parseISO(event.recurrence_end_date), 'PPP')})`}
                            {event.recurrence_count && ` (For ${event.recurrence_count} times)`}
                        </p>
                    </div>

                    {attendees.length > 0 && (
                        <div>
                            <Label className="text-xs text-stone-500 uppercase tracking-wider">Internal Attendees</Label>
                            <div className="mt-2 space-y-1">
                                {attendees.map(emp => (
                                    <div key={emp.id} className="flex items-center gap-2 text-sm text-stone-700">
                                        <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">
                                            {emp.first_name[0]}{emp.last_name[0]}
                                        </div>
                                        {emp.first_name} {emp.last_name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {event.external_attendees && event.external_attendees.length > 0 && (
                        <div className="mt-4">
                            <Label className="text-xs text-stone-500 uppercase tracking-wider">External Guests</Label>
                            <div className="mt-2 space-y-1">
                                {event.external_attendees.map((guest, idx) => (
                                    <div key={idx} className="flex items-center justify-between gap-2 text-sm text-stone-700 bg-stone-50 p-2 rounded-md">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                                                {(guest.name || "G")[0].toUpperCase()}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{guest.name || "Guest"}</span>
                                                <span className="text-xs text-stone-400">{guest.email}</span>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className={`capitalize ${
                                            guest.status === 'accepted' ? 'bg-green-100 text-green-800 border-green-200' : 
                                            guest.status === 'declined' ? 'bg-red-100 text-red-800 border-red-200' : 'text-stone-500'
                                        }`}>
                                            {guest.status || 'pending'}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 flex-wrap">
                    <Button variant="destructive" size="sm" onClick={() => { if (confirm("Delete?")) onDelete(event.id); }}>
                        <Trash2 className="w-3.5 h-3.5 mr-1"/>Delete
                    </Button>
                    <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
                    <Button size="sm" onClick={() => onEdit(event)} className="bg-teal-700 hover:bg-teal-800">Edit</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
});

export default EventDetailsDialog;