import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO, getDay, getDate, getMonth } from 'date-fns';
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
        mutationFn: (data) => base44.entities.Event.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['events']);
            toast.success("Event created successfully");
            setIsDialogOpen(false);
        },
        onError: (err) => toast.error("Failed to create event: " + err.message)
    });

    const deleteEventMutation = useMutation({
        mutationFn: (id) => base44.entities.Event.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['events']);
            toast.success("Event deleted");
        },
        onError: (err) => toast.error("Failed to delete event: " + err.message)
    });

    // Calendar Navigation
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const onDateClick = (day) => {
        setSelectedDate(day);
        setIsDialogOpen(true);
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
                <Button onClick={() => setIsDialogOpen(true)} className="bg-teal-700 hover:bg-teal-800 text-white">
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
                    const eventStart = parseISO(e.start_time);
                    
                    // 1. Exact Date Match (One-time)
                    if (isSameDay(eventStart, day)) return true;

                    // 2. Recurrence Logic
                    if (e.recurrence && e.recurrence !== 'none') {
                        // Don't show recurring events before they started
                        if (day < eventStart && !isSameDay(day, eventStart)) return false;

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
                            ${!isSameMonth(day, monthStart) ? "bg-stone-50/50 text-stone-400" : "bg-white"}
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
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Handle event click (maybe show details)
                                        // For now, just a small alert or detail view could be added
                                        // But I'll stick to a simple delete for now as per prompt "delete events"
                                        if (confirm(`Delete event "${ev.title}"?`)) {
                                            deleteEventMutation.mutate(ev.id);
                                        }
                                    }}
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
                    onClose={() => setIsDialogOpen(false)} 
                    selectedDate={selectedDate}
                    createEvent={createEventMutation.mutate}
                    employees={employees}
                />
            </CardContent>
        </Card>
    );
}

function EventDialog({ isOpen, onClose, selectedDate, createEvent, employees }) {
    const [formData, setFormData] = useState({
        title: "",
        type: "other",
        time: "09:00",
        description: "",
        recurrence: "none",
        attendee_ids: []
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Combine date and time correctly handling local time
        const startDateTime = new Date(selectedDate);
        const [hours, minutes] = formData.time.split(':');
        startDateTime.setHours(parseInt(hours), parseInt(minutes));
        
        createEvent({
            title: formData.title,
            type: formData.type,
            start_time: startDateTime.toISOString(),
            description: formData.description,
            recurrence: formData.recurrence,
            attendee_ids: formData.attendee_ids,
            reminders_sent: { "1h": false, "30m": false, "15m": false } // Reset reminders
        });
        
        setFormData({ 
            title: "", 
            type: "other", 
            time: "09:00", 
            description: "", 
            recurrence: "none",
            attendee_ids: []
        }); 
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
                    <DialogTitle>Add Event for {format(selectedDate, 'MMM d, yyyy')}</DialogTitle>
                    <DialogDescription>Create a new calendar event.</DialogDescription>
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

                    <div className="space-y-2">
                        <Label>Attendees (Company Employees)</Label>
                        <div className="border rounded-md p-3 max-h-32 overflow-y-auto bg-stone-50 space-y-2">
                            {employees.length === 0 ? (
                                <p className="text-xs text-stone-500 italic">No employees found.</p>
                            ) : (
                                employees.map(emp => (
                                    <div key={emp.id} className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={`emp-${emp.id}`} 
                                            checked={formData.attendee_ids.includes(emp.id)}
                                            onCheckedChange={() => toggleAttendee(emp.id)}
                                        />
                                        <label 
                                            htmlFor={`emp-${emp.id}`} 
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            {emp.first_name} {emp.last_name}
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
                        <Button type="submit" className="bg-teal-700 hover:bg-teal-800">Save Event</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}