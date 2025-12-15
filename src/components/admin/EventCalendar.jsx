import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, addWeeks, addYears, parseISO, getDay, getDate, getMonth, startOfDay, isValid } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar as CalendarIcon, Clock, DollarSign, Briefcase, Users, RefreshCw } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function EventCalendar() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [viewEvent, setViewEvent] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    const queryClient = useQueryClient();

    // Fetch Events
    const { data: events, isLoading } = useQuery({
        queryKey: ['events'],
        queryFn: () => base44.entities.Event.list({ limit: 500 }),
        initialData: []
    });

    // Fetch Employees for Attendees
    const { data: employees } = useQuery({
        queryKey: ['employees-list'],
        queryFn: () => base44.entities.Employee.list({ limit: 100 }),
        initialData: []
    });

    // Mutations
    const createEventMutation = useMutation({
        mutationFn: async (data) => {
            const res = await base44.functions.invoke('createEvent', data);
            if (res.data.error) throw new Error(res.data.error);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] }); // Refresh notifications
            setIsDialogOpen(false);
            toast.success("Event created & invitations sent");
        },
        onError: (err) => {
            toast.error("Failed to create event: " + err.message);
        }
    });

    const updateEventMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const res = await base44.functions.invoke('updateEvent', { id, data });
            if (res.data.error) throw new Error(res.data.error);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] }); // Refresh notifications
            toast.success("Event updated & notifications sent");
            setIsDialogOpen(false);
            setEditingEvent(null);
            setViewEvent(null);
        },
        onError: (err) => toast.error("Failed to update event: " + err.message)
    });

    const deleteEventMutation = useMutation({
        mutationFn: async (id) => {
            const res = await base44.functions.invoke('deleteEvent', { id });
            if (res.data.error) throw new Error(res.data.error);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] }); // Refresh notifications
            toast.success("Event deleted & notifications sent");
            setViewEvent(null);
        },
        onError: (err) => toast.error("Failed to delete event: " + err.message)
    });

    // Calendar Navigation
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const onDateClick = (day) => {
        setSelectedDate(day);
        setEditingEvent(null);
        setIsDialogOpen(true);
    };

    const handleEventClick = (e, ev) => {
        e.stopPropagation();
        setViewEvent(ev);
    };

    const handleSaveEvent = (eventData) => {
        if (editingEvent) {
            updateEventMutation.mutate({ id: editingEvent.id, data: eventData });
        } else {
            createEventMutation.mutate(eventData);
        }
    };

    // Calendar Grid Generation
    const renderHeader = () => {
        return (
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-stone-900 font-serif">
                        {format(currentMonth, "MMMM yyyy")}
                    </h2>
                    <div className="flex gap-1">
                        <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8"><ChevronLeft className="w-4 h-4" /></Button>
                        <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8"><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                </div>
                <Button onClick={() => { setSelectedDate(new Date()); setEditingEvent(null); setIsDialogOpen(true); }} className="bg-teal-700 hover:bg-teal-800 text-white">
                    <Plus className="w-4 h-4 mr-2" /> Add Event
                </Button>
            </div>
        );
    };

    const renderDays = () => {
        const days = [];
        const date = startOfWeek(currentMonth);
        for (let i = 0; i < 7; i++) {
            days.push(
                <div key={i} className="text-center text-sm font-medium text-stone-500 py-2 uppercase tracking-wider">
                    {format(addDays(date, i), "EEE")}
                </div>
            );
        }
        return <div className="grid grid-cols-7 border-b border-stone-200 mb-2">{days}</div>;
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = "";

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, "d");
                const cloneDay = day;
                
                // Recurrence & Date Match Logic
                const dayEvents = events.filter(e => {
                    if (!e.start_time) return false;
                    const eventStart = parseISO(e.start_time);
                    if (!isValid(eventStart)) return false;

                    // 1. Exact Date Match (One-time)
                    // Note: isSameDay compares local dates
                    if (isSameDay(eventStart, day)) return true;

                    // 2. Recurrence Logic
                    if (e.recurrence && e.recurrence !== 'none') {
                        const dayStart = startOfDay(day);
                        const eventStartDay = startOfDay(eventStart);

                        // Don't show recurring events before the start date
                        if (dayStart < eventStartDay) return false;

                        // Check Recurrence End
                        let endDate = null;
                        if (e.recurrence_end_date) {
                            endDate = startOfDay(parseISO(e.recurrence_end_date));
                        } else if (e.recurrence_count) {
                            const count = e.recurrence_count;
                            if (e.recurrence === 'daily') endDate = addDays(eventStartDay, count - 1);
                            if (e.recurrence === 'weekly') endDate = addWeeks(eventStartDay, count - 1);
                            if (e.recurrence === 'monthly') endDate = addMonths(eventStartDay, count - 1);
                            if (e.recurrence === 'yearly') endDate = addYears(eventStartDay, count - 1);
                        }

                        if (endDate && dayStart > endDate) return false;

                        if (e.recurrence === 'daily') return true;
                        if (e.recurrence === 'weekly') return getDay(day) === getDay(eventStart);
                        if (e.recurrence === 'monthly') return getDate(day) === getDate(eventStart);
                        if (e.recurrence === 'yearly') return getMonth(day) === getMonth(eventStart) && getDate(day) === getDate(eventStart);
                    }
                    return false;
                });
                
                days.push(
                    <div
                        key={day}
                        className={`min-h-[120px] p-2 border border-stone-100 relative group transition-colors hover:bg-stone-50
                            ${!isSameMonth(day, monthStart) ? "bg-stone-50/50 text-stone-400" : 
                              dayEvents.length > 0 ? "bg-green-100" : "bg-white"}
                            ${isSameDay(day, new Date()) ? "ring-2 ring-teal-600 ring-inset" : ""}
                        `}
                        onClick={() => onDateClick(cloneDay)}
                    >
                        <span className={`text-sm font-semibold ${!isSameMonth(day, monthStart) ? "text-stone-300" : "text-stone-700"}`}>
                            {formattedDate}
                        </span>
                        
                        <div className="mt-1 space-y-1 overflow-y-auto max-h-[90px] scrollbar-hide">
                            {dayEvents.map((ev) => (
                                <div 
                                    key={ev.id} 
                                    className={`
                                        text-xs px-1.5 py-1 rounded truncate cursor-pointer flex items-center gap-1
                                        ${ev.type === 'meeting' ? 'bg-blue-100 text-blue-800' : ''}
                                        ${ev.type === 'vendor_service' ? 'bg-green-100 text-green-800' : ''}
                                        ${ev.type === 'invoice_due' ? 'bg-red-100 text-red-800' : ''}
                                        ${ev.type === 'other' ? 'bg-gray-100 text-gray-800' : ''}
                                    `}
                                    onClick={(e) => handleEventClick(e, ev)}
                                    title={ev.title}
                                >
                                    {ev.type === 'invoice_due' && <DollarSign className="w-3 h-3 flex-shrink-0" />}
                                    {ev.type === 'meeting' && <Users className="w-3 h-3 flex-shrink-0" />}
                                    {ev.type === 'vendor_service' && <Briefcase className="w-3 h-3 flex-shrink-0" />}
                                    {ev.recurrence && ev.recurrence !== 'none' && <RefreshCw className="w-3 h-3 flex-shrink-0 text-stone-500" />}
                                    <span className="truncate">{ev.title}</span>
                                </div>
                            ))}
                        </div>
                        
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="w-4 h-4 text-stone-400 hover:text-teal-600 cursor-pointer" />
                        </div>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div key={day} className="grid grid-cols-7 gap-0">
                    {days}
                </div>
            );
            days = [];
        }
        return <div className="border rounded-lg overflow-hidden">{rows}</div>;
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Event Calendar</CardTitle>
                <CardDescription>Manage meetings, vendor schedules, and invoice due dates.</CardDescription>
            </CardHeader>
            <CardContent>
                {renderHeader()}
                {renderDays()}
                {renderCells()}

                <EventDialog 
                    isOpen={isDialogOpen} 
                    onClose={() => { setIsDialogOpen(false); setEditingEvent(null); }} 
                    selectedDate={selectedDate}
                    onSave={handleSaveEvent}
                    employees={employees}
                    eventToEdit={editingEvent}
                />

                <EventDetailsDialog 
                    event={viewEvent}
                    isOpen={!!viewEvent}
                    onClose={() => setViewEvent(null)}
                    employees={employees}
                    onDelete={(id) => deleteEventMutation.mutate(id)}
                    onEdit={(ev) => {
                        setViewEvent(null);
                        setEditingEvent(ev);
                        setSelectedDate(parseISO(ev.start_time));
                        setIsDialogOpen(true);
                    }}
                />
            </CardContent>
        </Card>
    );
}

function EventDetailsDialog({ event, isOpen, onClose, employees, onDelete, onEdit }) {
    if (!event) return null;

    const attendees = employees.filter(emp => event.attendee_ids?.includes(emp.id));

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
                            <Label className="text-xs text-stone-500 uppercase tracking-wider">Attendees</Label>
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
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="destructive" onClick={() => {
                        if (confirm("Are you sure you want to delete this event?")) {
                            onDelete(event.id);
                        }
                    }}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>Close</Button>
                        <Button onClick={() => onEdit(event)} className="bg-teal-700 hover:bg-teal-800">Edit Event</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function EventDialog({ isOpen, onClose, selectedDate, onSave, employees, eventToEdit }) {
    const [formData, setFormData] = useState({
        title: "",
        type: "other",
        time: "09:00",
        description: "",
        recurrence: "none",
        recurrence_end_type: "never", // never, on_date, after_occurrences
        recurrence_end_date: "",
        recurrence_count: "",
        attendee_ids: []
    });

    React.useEffect(() => {
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
                attendee_ids: eventToEdit.attendee_ids || []
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
                attendee_ids: []
            });
        }
    }, [eventToEdit, isOpen]);
    const [employeeSearch, setEmployeeSearch] = useState("");

    const filteredEmployees = employees.filter(emp => 
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        emp.email?.toLowerCase().includes(employeeSearch.toLowerCase())
    );

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

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
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