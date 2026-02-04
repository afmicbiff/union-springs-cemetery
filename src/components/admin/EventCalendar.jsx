import React, { useState, useCallback, useMemo, memo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, addWeeks, addYears, parseISO, getDay, getDate, getMonth, startOfDay, isValid } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus, DollarSign, Briefcase, Users, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from "sonner";

import EventDialog from './EventDialog';
import EventDetailsDialog from './EventDetailsDialog';

// Memoized calendar cell for performance
const CalendarCell = memo(({ day, monthStart, dayEvents, isToday, onDateClick, onEventClick }) => {
    const formattedDate = format(day, "d");
    const inMonth = isSameMonth(day, monthStart);
    return (
        <div
            className={`min-h-[80px] sm:min-h-[100px] p-1.5 border border-stone-100 relative group transition-colors hover:bg-stone-50
                ${!inMonth ? "bg-stone-50/50 text-stone-400" : dayEvents.length > 0 ? "bg-green-50" : "bg-white"}
                ${isToday ? "ring-2 ring-teal-600 ring-inset" : ""}`}
            onClick={() => onDateClick(day, dayEvents)}
        >
            <span className={`text-xs font-semibold ${!inMonth ? "text-stone-300" : "text-stone-700"}`}>{formattedDate}</span>
            <div className="mt-0.5 space-y-0.5 overflow-y-auto max-h-[60px] sm:max-h-[75px]">
                {dayEvents.slice(0, 3).map((ev) => (
                    <div key={ev.id} className={`text-[10px] px-1 py-0.5 rounded truncate cursor-pointer flex items-center gap-0.5
                        ${ev.type === 'meeting' ? 'bg-blue-100 text-blue-800' : ''}
                        ${ev.type === 'vendor_service' ? 'bg-green-100 text-green-800' : ''}
                        ${ev.type === 'invoice_due' ? 'bg-red-100 text-red-800' : ''}
                        ${ev.type === 'other' ? 'bg-gray-100 text-gray-800' : ''}`}
                        onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                        title={ev.title}
                    >
                        {ev.recurrence && ev.recurrence !== 'none' && <RefreshCw className="w-2.5 h-2.5 flex-shrink-0"/>}
                        <span className="truncate">{ev.title}</span>
                    </div>
                ))}
                {dayEvents.length > 3 && <div className="text-[9px] text-stone-500 pl-1">+{dayEvents.length - 3} more</div>}
            </div>
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus className="w-3 h-3 text-stone-400"/>
            </div>
        </div>
    );
});

const EventCalendar = memo(function EventCalendar() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [viewEvent, setViewEvent] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    const [dayViewOpen, setDayViewOpen] = useState(false);
    const [dayEventsData, setDayEventsData] = useState([]);
    const queryClient = useQueryClient();

    // Fetch Events - limit to 200 for performance, cache 3min
    const { data: events = [], isLoading } = useQuery({
        queryKey: ['events'],
        queryFn: () => base44.entities.Event.list('-start_time', 200),
        staleTime: 3 * 60_000,
        gcTime: 5 * 60_000,
    });

    // Fetch Employees - cache 5min
    const { data: employees = [] } = useQuery({
        queryKey: ['employees-calendar'],
        queryFn: () => base44.entities.Employee.filter({ status: 'active' }, '-created_date', 100),
        staleTime: 5 * 60_000,
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

    // Memoized navigation
    const nextMonth = useCallback(() => setCurrentMonth(m => addMonths(m, 1)), []);
    const prevMonth = useCallback(() => setCurrentMonth(m => subMonths(m, 1)), []);
    
    const onDateClick = useCallback((day, evts = []) => {
        setSelectedDate(day);
        if (evts.length > 0) { setDayEventsData(evts); setDayViewOpen(true); }
        else { setEditingEvent(null); setIsDialogOpen(true); }
    }, []);

    const handleEventClick = useCallback((ev) => setViewEvent(ev), []);

    const handleSaveEvent = useCallback((eventData) => {
        if (editingEvent) updateEventMutation.mutate({ id: editingEvent.id, data: eventData });
        else createEventMutation.mutate(eventData);
    }, [editingEvent, updateEventMutation, createEventMutation]);

    // Pre-compute event map for current month view (memoized)
    const eventsByDay = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);
        const map = new Map();
        
        let day = startDate;
        while (day <= endDate) {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayEvents = events.filter(e => {
                if (!e.start_time) return false;
                const eventStart = parseISO(e.start_time);
                if (!isValid(eventStart)) return false;
                if (isSameDay(eventStart, day)) return true;
                if (e.recurrence && e.recurrence !== 'none') {
                    const dayStart = startOfDay(day);
                    const eventStartDay = startOfDay(eventStart);
                    if (dayStart < eventStartDay) return false;
                    let recEnd = null;
                    if (e.recurrence_end_date) recEnd = startOfDay(parseISO(e.recurrence_end_date));
                    else if (e.recurrence_count) {
                        const c = e.recurrence_count;
                        if (e.recurrence === 'daily') recEnd = addDays(eventStartDay, c - 1);
                        if (e.recurrence === 'weekly') recEnd = addWeeks(eventStartDay, c - 1);
                        if (e.recurrence === 'monthly') recEnd = addMonths(eventStartDay, c - 1);
                        if (e.recurrence === 'yearly') recEnd = addYears(eventStartDay, c - 1);
                    }
                    if (recEnd && dayStart > recEnd) return false;
                    if (e.recurrence === 'daily') return true;
                    if (e.recurrence === 'weekly') return getDay(day) === getDay(eventStart);
                    if (e.recurrence === 'monthly') return getDate(day) === getDate(eventStart);
                    if (e.recurrence === 'yearly') return getMonth(day) === getMonth(eventStart) && getDate(day) === getDate(eventStart);
                }
                return false;
            });
            map.set(dayKey, dayEvents);
            day = addDays(day, 1);
        }
        return map;
    }, [events, currentMonth]);

    // Memoized grid data
    const calendarGrid = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);
        const today = new Date();
        const rows = [];
        let day = startDate;
        while (day <= endDate) {
            const week = [];
            for (let i = 0; i < 7; i++) {
                const dayKey = format(day, 'yyyy-MM-dd');
                week.push({ day: new Date(day), dayKey, dayEvents: eventsByDay.get(dayKey) || [], isToday: isSameDay(day, today) });
                day = addDays(day, 1);
            }
            rows.push(week);
        }
        return { rows, monthStart };
    }, [currentMonth, eventsByDay]);

    const { rows, monthStart } = calendarGrid;
    const daysOfWeek = useMemo(() => {
        const d = startOfWeek(currentMonth);
        return Array.from({ length: 7 }, (_, i) => format(addDays(d, i), "EEE"));
    }, [currentMonth]);

    return (
        <Card className="h-full">
            <CardHeader className="px-4 py-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <CardTitle className="text-base">Calendar</CardTitle>
                        <CardDescription className="text-xs">Events & schedules</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={prevMonth} className="h-7 w-7"><ChevronLeft className="w-3.5 h-3.5"/></Button>
                        <span className="text-sm font-semibold min-w-[120px] text-center">{format(currentMonth, "MMM yyyy")}</span>
                        <Button variant="outline" size="icon" onClick={nextMonth} className="h-7 w-7"><ChevronRight className="w-3.5 h-3.5"/></Button>
                        <Button size="sm" onClick={() => { setSelectedDate(new Date()); setEditingEvent(null); setIsDialogOpen(true); }} className="bg-teal-700 hover:bg-teal-800 text-white h-7 text-xs ml-2">
                            <Plus className="w-3 h-3 mr-1"/>Add
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-2 sm:px-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-teal-600"/></div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="min-w-[560px]">
                            <div className="grid grid-cols-7 border-b border-stone-200 mb-1">
                                {daysOfWeek.map((d, i) => <div key={i} className="text-center text-[10px] font-medium text-stone-500 py-1 uppercase">{d}</div>)}
                            </div>
                            <div className="border rounded-lg overflow-hidden">
                                {rows.map((week, wi) => (
                                    <div key={wi} className="grid grid-cols-7">
                                        {week.map(({ day, dayEvents, isToday }) => (
                                            <CalendarCell key={day.toISOString()} day={day} monthStart={monthStart} dayEvents={dayEvents} isToday={isToday} onDateClick={onDateClick} onEventClick={handleEventClick}/>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <EventDialog isOpen={isDialogOpen} onClose={() => { setIsDialogOpen(false); setEditingEvent(null); }} selectedDate={selectedDate} onSave={handleSaveEvent} employees={employees} eventToEdit={editingEvent}/>
                <EventDetailsDialog event={viewEvent} isOpen={!!viewEvent} onClose={() => setViewEvent(null)} employees={employees} onDelete={(id) => deleteEventMutation.mutate(id)} onEdit={(ev) => { setViewEvent(null); setEditingEvent(ev); setSelectedDate(parseISO(ev.start_time)); setIsDialogOpen(true); }}/>

                <Dialog open={dayViewOpen} onOpenChange={setDayViewOpen}>
                    <DialogContent className="max-w-sm max-h-[85vh] overflow-hidden flex flex-col">
                        <DialogHeader><DialogTitle className="text-sm">{format(selectedDate, 'MMM d, yyyy')}</DialogTitle></DialogHeader>
                        <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                            {dayEventsData.map((ev) => (
                                <div key={ev.id} className={`p-2 rounded-md border cursor-pointer text-xs ${ev.type === 'meeting' ? 'bg-blue-50' : ev.type === 'vendor_service' ? 'bg-green-50' : ev.type === 'invoice_due' ? 'bg-red-50' : 'bg-stone-50'}`} onClick={() => setViewEvent(ev)}>
                                    <div className="flex items-center gap-1 mb-0.5"><Badge variant="outline" className="text-[9px] h-4 px-1">{ev.type}</Badge><span className="text-[10px] text-stone-500">{format(parseISO(ev.start_time), 'h:mm a')}</span></div>
                                    <h4 className="font-semibold text-stone-900 leading-tight">{ev.title}</h4>
                                </div>
                            ))}
                        </div>
                        <DialogFooter><Button size="sm" className="w-full bg-teal-700 h-8 text-xs" onClick={() => { setDayViewOpen(false); setEditingEvent(null); setIsDialogOpen(true); }}><Plus className="w-3 h-3 mr-1"/>Add Event</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
});

export default EventCalendar;