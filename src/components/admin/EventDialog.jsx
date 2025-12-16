import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function EventDialog({ isOpen, onClose, selectedDate, onSave, employees, eventToEdit }) {
    const [formData, setFormData] = useState({
        title: "",
        type: "other",
        time: "09:00",
        description: "",
        recurrence: "none",
        recurrence_end_type: "never", // never, on_date, after_occurrences
        recurrence_end_date: "",
        recurrence_count: "",
        attendee_ids: [],
        external_attendees: []
    });

    useEffect(() => {
        if (eventToEdit) {
            const startDate = parseISO(eventToEdit.start_time);
            setFormData({
                title: eventToEdit.title,
                type: eventToEdit.type,
                time: format(startDate, 'HH:mm'),
                description: eventToEdit.description || "",
                recurrence: eventToEdit.recurrence || "none",
                recurrence_end_type: eventToEdit.recurrence_end_date ? 'on_date' : (eventToEdit.recurrence_count ? 'after_occurrences' : 'never'),
                recurrence_end_date: eventToEdit.recurrence_end_date ? format(parseISO(eventToEdit.recurrence_end_date), 'yyyy-MM-dd') : "",
                recurrence_count: eventToEdit.recurrence_count || "",
                attendee_ids: eventToEdit.attendee_ids || [],
                external_attendees: eventToEdit.external_attendees || []
            });
        } else {
            setFormData({
                title: "",
                type: "other",
                time: "09:00",
                description: "",
                recurrence: "none",
                recurrence_end_type: "never",
                recurrence_end_date: "",
                recurrence_count: "",
                attendee_ids: [],
                external_attendees: []
            });
        }
    }, [eventToEdit, isOpen]);
    const [employeeSearch, setEmployeeSearch] = useState("");

    // Enhanced fuzzy search for employees
    const filteredEmployees = useMemo(() => {
        if (!employeeSearch.trim()) return employees;
        const search = employeeSearch.toLowerCase().trim();

        // Levenshtein distance
        const getDist = (a, b) => {
            if (a.length === 0) return b.length;
            if (b.length === 0) return a.length;
            const matrix = [];
            for (let i = 0; i <= b.length; i++) matrix[i] = [i];
            for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
            for (let i = 1; i <= b.length; i++) {
                for (let j = 1; j <= a.length; j++) {
                    if (b.charAt(i - 1) === a.charAt(j - 1)) {
                        matrix[i][j] = matrix[i - 1][j - 1];
                    } else {
                        matrix[i][j] = Math.min(
                            matrix[i - 1][j - 1] + 1,
                            matrix[i][j - 1] + 1,
                            matrix[i - 1][j] + 1
                        );
                    }
                }
            }
            return matrix[b.length][a.length];
        };

        const uniqueEmployees = Array.from(new Map(employees.map(item => [item.id, item])).values());
        
        return uniqueEmployees.filter(emp => {
            const first = (emp.first_name || "").toLowerCase();
            const last = (emp.last_name || "").toLowerCase();
            const email = (emp.email || "").toLowerCase();
            const full = `${first} ${last}`.trim();
            
            // 1. Direct match (includes)
            if (full.includes(search) || email.includes(search)) return true;

            // 2. Fuzzy match parts
            const targets = [first, last, full];
            
            // Allow leniency based on search length
            const maxDist = search.length <= 3 ? 1 : (search.length <= 6 ? 2 : 3);

            return targets.some(target => {
                if (!target) return false;
                // If close enough
                return getDist(target, search) <= maxDist;
            });
        });
    }, [employees, employeeSearch]);

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Combine date and time correctly handling local time
        const startDateTime = new Date(selectedDate);
        const [hours, minutes] = formData.time.split(':');
        startDateTime.setHours(parseInt(hours), parseInt(minutes));
        
        const eventData = {
            title: formData.title,
            type: formData.type,
            start_time: startDateTime.toISOString(),
            description: formData.description,
            recurrence: formData.recurrence,
            attendee_ids: formData.attendee_ids,
            external_attendees: formData.external_attendees,
            reminders_sent: eventToEdit ? eventToEdit.reminders_sent : { "1h": false, "30m": false, "15m": false }
        };

        if (formData.recurrence !== 'none') {
            if (formData.recurrence_end_type === 'on_date' && formData.recurrence_end_date) {
                eventData.recurrence_end_date = new Date(formData.recurrence_end_date).toISOString();
            } else if (formData.recurrence_end_type === 'after_occurrences' && formData.recurrence_count) {
                eventData.recurrence_count = parseInt(formData.recurrence_count);
            }
        }

        onSave(eventData);
    };

    const toggleAttendee = (empId) => {
        setFormData(prev => ({
            ...prev,
            attendee_ids: prev.attendee_ids.includes(empId) 
                ? prev.attendee_ids.filter(id => id !== empId)
                : [...prev.attendee_ids, empId]
        }));
    };

    const addExternalAttendee = () => {
        setFormData(prev => ({
            ...prev,
            external_attendees: [...prev.external_attendees, { name: "", email: "", status: "pending" }]
        }));
    };

    const removeExternalAttendee = (index) => {
        setFormData(prev => ({
            ...prev,
            external_attendees: prev.external_attendees.filter((_, i) => i !== index)
        }));
    };

    const updateExternalAttendee = (index, field, value) => {
        setFormData(prev => {
            const updated = [...prev.external_attendees];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, external_attendees: updated };
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{eventToEdit ? 'Edit Event' : 'Add Event'} for {format(selectedDate, 'MMM d, yyyy')}</DialogTitle>
                    <DialogDescription>{eventToEdit ? 'Modify event details.' : 'Create a new calendar event.'}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Event Title</Label>
                        <Input 
                            required
                            placeholder="e.g. Board Meeting"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select 
                                value={formData.type} 
                                onValueChange={(val) => setFormData({...formData, type: val})}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="meeting">Meeting</SelectItem>
                                    <SelectItem value="vendor_service">Vendor Service</SelectItem>
                                    <SelectItem value="invoice_due">Invoice Due</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Time</Label>
                            <Input 
                                type="time"
                                value={formData.time}
                                onChange={(e) => setFormData({...formData, time: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Recurrence</Label>
                        <Select 
                            value={formData.recurrence} 
                            onValueChange={(val) => setFormData({...formData, recurrence: val})}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Recurrence" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">One-time Event</SelectItem>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {formData.recurrence !== 'none' && (
                        <div className="space-y-4 border p-3 rounded-md bg-stone-50">
                            <Label>Ends</Label>
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <input 
                                        type="radio" 
                                        id="end-never" 
                                        name="recurrence_end" 
                                        checked={formData.recurrence_end_type === 'never'}
                                        onChange={() => setFormData({...formData, recurrence_end_type: 'never'})}
                                        className="text-teal-600 focus:ring-teal-500"
                                    />
                                    <Label htmlFor="end-never" className="font-normal">Never</Label>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                    <input 
                                        type="radio" 
                                        id="end-date" 
                                        name="recurrence_end" 
                                        checked={formData.recurrence_end_type === 'on_date'}
                                        onChange={() => setFormData({...formData, recurrence_end_type: 'on_date'})}
                                        className="text-teal-600 focus:ring-teal-500"
                                    />
                                    <Label htmlFor="end-date" className="font-normal">On Date</Label>
                                    {formData.recurrence_end_type === 'on_date' && (
                                        <Input 
                                            type="date" 
                                            value={formData.recurrence_end_date}
                                            onChange={(e) => setFormData({...formData, recurrence_end_date: e.target.value})}
                                            className="h-8 w-40 ml-2"
                                        />
                                    )}
                                </div>

                                <div className="flex items-center space-x-2">
                                    <input 
                                        type="radio" 
                                        id="end-count" 
                                        name="recurrence_end" 
                                        checked={formData.recurrence_end_type === 'after_occurrences'}
                                        onChange={() => setFormData({...formData, recurrence_end_type: 'after_occurrences'})}
                                        className="text-teal-600 focus:ring-teal-500"
                                    />
                                    <Label htmlFor="end-count" className="font-normal">After</Label>
                                    {formData.recurrence_end_type === 'after_occurrences' && (
                                        <Input 
                                            type="number" 
                                            min="1"
                                            value={formData.recurrence_count}
                                            onChange={(e) => setFormData({...formData, recurrence_count: e.target.value})}
                                            className="h-8 w-20 ml-2"
                                        />
                                    )}
                                    <span className="text-sm text-stone-600">occurrences</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Attendees (Company Employees)</Label>
                        <Input 
                            placeholder="Search employees..." 
                            value={employeeSearch}
                            onChange={(e) => setEmployeeSearch(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                            className="mb-2 h-8 text-sm"
                        />
                        <div className="border rounded-md p-3 max-h-48 overflow-y-auto bg-stone-50 space-y-2">
                            {filteredEmployees.length === 0 ? (
                                <p className="text-xs text-stone-500 italic">No employees found.</p>
                            ) : (
                                filteredEmployees.map(emp => (
                                    <div key={emp.id} className="flex items-center space-x-2">
                                        <Checkbox 
                                            type="button"
                                            id={`emp-${emp.id}`} 
                                            checked={formData.attendee_ids.includes(emp.id)}
                                            onCheckedChange={() => toggleAttendee(emp.id)}
                                        />
                                        <label 
                                            htmlFor={`emp-${emp.id}`} 
                                            className="text-sm font-medium leading-none cursor-pointer"
                                        >
                                            {emp.first_name} {emp.last_name} <span className="text-stone-400 text-xs">({emp.employment_type})</span>
                                        </label>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>External Guests</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addExternalAttendee} className="h-7 text-xs">
                                <Plus className="w-3 h-3 mr-1" /> Add Guest
                            </Button>
                        </div>
                        {formData.external_attendees.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {formData.external_attendees.map((attendee, index) => (
                                    <div key={index} className="flex gap-2 items-start bg-stone-50 p-2 rounded-md border">
                                        <div className="flex-1 space-y-1">
                                            <Input 
                                                placeholder="Name" 
                                                value={attendee.name} 
                                                onChange={(e) => updateExternalAttendee(index, 'name', e.target.value)}
                                                className="h-8 text-sm"
                                            />
                                            <Input 
                                                placeholder="Email (for invite)" 
                                                value={attendee.email} 
                                                onChange={(e) => updateExternalAttendee(index, 'email', e.target.value)}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeExternalAttendee(index)} className="h-8 w-8 text-red-500 hover:text-red-700">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                            {attendee.status && (
                                                <Badge variant="outline" className={`text-[10px] capitalize ${
                                                    attendee.status === 'accepted' ? 'text-green-600 border-green-200' : 
                                                    attendee.status === 'declined' ? 'text-red-600 border-red-200' : 'text-stone-400'
                                                }`}>
                                                    {attendee.status}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-stone-500 italic p-2 border border-dashed rounded-md text-center">No external guests added.</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea 
                            placeholder="Additional details..."
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" className="bg-teal-700 hover:bg-teal-800">{eventToEdit ? 'Update' : 'Save'} Event</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}