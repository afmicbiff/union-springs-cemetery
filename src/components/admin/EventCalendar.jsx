import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, addWeeks, addYears, parseISO, getDay, getDate, getMonth, startOfDay, isValid } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus, DollarSign, Briefcase, Users, RefreshCw } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import EventDialog from './EventDialog';
import EventDetailsDialog from './EventDetailsDialog';

export default function EventCalendar() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [viewEvent, setViewEvent] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    const [dayViewOpen, setDayViewOpen] = useState(false);
    const [dayEventsData, setDayEventsData] = useState([]);
    const queryClient = useQueryClient();

    // Fetch Events
    const { data: events, isLoading } = useQuery({
        queryKey: ['events'],
        queryFn: () => base44.entities.Event.list('-created_date', 500),
        initialData: []
    });

    // Fetch Employees for Attendees
    const { data: employees } = useQuery({
        queryKey: ['employees-list-all'],
        queryFn: () => base44.entities.Employee.list('-created_date', 1000),
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
    const onDateClick = (day, events = []) => {
        setSelectedDate(day);
        if (events.length > 0) {
            setDayEventsData(events);
            setDayViewOpen(true);
        } else {
            setEditingEvent(null);
            setIsDialogOpen(true);
        }
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
                <div key={i} className="text-center text-sm font-medium text-stone-500 py-2 uppercase tracking-wider min-w-[100px]">
                    {format(addDays(date, i), "EEE")}
                </div>
            );
        }
        return <div className="grid grid-cols-7 border-b border-stone-200 mb-2 min-w-[700px]">{days}</div>;
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
                        className={`min-h-[120px] p-2 border border-stone-100 relative group transition-colors hover:bg-stone-50 min-w-[100px]
                            ${!isSameMonth(day, monthStart) ? "bg-stone-50/50 text-stone-400" : 
                              dayEvents.length > 0 ? "bg-green-100" : "bg-white"}
                            ${isSameDay(day, new Date()) ? "ring-2 ring-teal-600 ring-inset" : ""}
                        `}
                        onClick={() => onDateClick(cloneDay, dayEvents)}
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
                <div key={day} className="grid grid-cols-7 gap-0 min-w-[700px]">
                    {days}
                </div>
            );
            days = [];
        }
        return <div className="border rounded-lg overflow-x-auto"><div className="min-w-[700px]">{rows}</div></div>;
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Event Calendar</CardTitle>
                <CardDescription>Manage meetings, vendor schedules, and invoice due dates.</CardDescription>
            </CardHeader>
            <CardContent>
                {renderHeader()}
                
                {isLoading ? (
                    <div className="space-y-4 animate-pulse">
                        <div className="grid grid-cols-7 gap-2">
                            {[...Array(7)].map((_, i) => (
                                <Skeleton key={i} className="h-8 w-full" />
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-0 border rounded-lg overflow-hidden h-[600px]">
                            {[...Array(35)].map((_, i) => (
                                <div key={i} className="border border-stone-100 p-2">
                                    <Skeleton className="h-4 w-4 mb-2" />
                                    <Skeleton className="h-4 w-full rounded-sm" />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            {renderDays()}
                            {renderCells()}
                        </div>
                    </>
                )}

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

                <Dialog open={dayViewOpen} onOpenChange={setDayViewOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Events for {format(selectedDate, 'MMMM d, yyyy')}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2 my-2 max-h-[60vh] overflow-y-auto pr-1">
                            {dayEventsData.map((ev) => (
                                <div 
                                    key={ev.id} 
                                    className={`
                                        p-3 rounded-md border cursor-pointer hover:shadow-sm transition-all
                                        ${ev.type === 'meeting' ? 'bg-blue-50 border-blue-100 hover:bg-blue-100' : ''}
                                        ${ev.type === 'vendor_service' ? 'bg-green-50 border-green-100 hover:bg-green-100' : ''}
                                        ${ev.type === 'invoice_due' ? 'bg-red-50 border-red-100 hover:bg-red-100' : ''}
                                        ${ev.type === 'other' ? 'bg-stone-50 border-stone-100 hover:bg-stone-100' : ''}
                                    `}
                                    onClick={() => setViewEvent(ev)}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="text-[10px] h-5 px-1 bg-white/50">{ev.type}</Badge>
                                        <span className="text-xs text-stone-500 font-medium">
                                            {format(parseISO(ev.start_time), 'h:mm a')}
                                        </span>
                                    </div>
                                    <h4 className="font-semibold text-stone-900 text-sm leading-tight">{ev.title}</h4>
                                    {ev.description && (
                                        <p className="text-xs text-stone-500 mt-1 line-clamp-2">{ev.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                        <DialogFooter>
                            <Button className="w-full bg-teal-700 hover:bg-teal-800" onClick={() => {
                                setDayViewOpen(false);
                                setEditingEvent(null);
                                setIsDialogOpen(true);
                            }}>
                                <Plus className="w-4 h-4 mr-2" /> Add Another Event
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}