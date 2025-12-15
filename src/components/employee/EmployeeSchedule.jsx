import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay, parseISO, addMonths, subMonths, getDay, getDate, getMonth, startOfDay, isValid, addWeeks, addYears } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock, MapPin, AlignLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function EmployeeSchedule() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState(null);

    // Get Current User
    const { data: user } = useQuery({
        queryKey: ['me'],
        queryFn: () => base44.auth.me().catch(() => null),
    });

    // Get Employee Record
    const { data: employee } = useQuery({
        queryKey: ['my-employee-profile', user?.email],
        queryFn: async () => {
            if (!user?.email) return null;
            const res = await base44.entities.Employee.list({ limit: 1000 });
            return res.find(e => e.email === user.email);
        },
        enabled: !!user?.email
    });

    // Get Events
    const { data: events } = useQuery({
        queryKey: ['my-schedule-events', employee?.id],
        queryFn: () => base44.entities.Event.list({ limit: 500 }),
        enabled: !!employee?.id,
        initialData: []
    });

    // Filter events for this employee
    const myEvents = events.filter(e => e.attendee_ids?.includes(employee?.id));

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const renderHeader = () => {
        return (
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-stone-900 font-serif">
                    {format(currentMonth, "MMMM yyyy")}
                </h2>
                <div className="flex gap-1">
                    <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8"><ChevronLeft className="w-4 h-4" /></Button>
                    <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8"><ChevronRight className="w-4 h-4" /></Button>
                </div>
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const rows = [];
        let days = [];
        let day = startDate;

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                const cloneDay = day;
                const formattedDate = format(day, "d");
                
                // Event Matching Logic (Same as EventCalendar.js)
                const dayEvents = myEvents.filter(e => {
                    if (!e.start_time) return false;
                    const eventStart = parseISO(e.start_time);
                    if (!isValid(eventStart)) return false;

                    if (isSameDay(eventStart, day)) return true;

                    if (e.recurrence && e.recurrence !== 'none') {
                        const dayStart = startOfDay(day);
                        const eventStartDay = startOfDay(eventStart);
                        if (dayStart < eventStartDay) return false;

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
                        className={`min-h-[100px] p-2 border border-stone-100 relative transition-colors
                            ${!isSameMonth(day, monthStart) ? "bg-stone-50/50 text-stone-300" : "bg-white"}
                            ${isSameDay(day, new Date()) ? "bg-teal-50/30" : ""}
                        `}
                        onClick={() => setSelectedDate(cloneDay)}
                    >
                        <span className={`text-sm font-semibold ${isSameDay(day, new Date()) ? "text-teal-700" : ""}`}>
                            {formattedDate}
                        </span>
                        <div className="mt-1 space-y-1">
                            {dayEvents.map((ev) => (
                                <div 
                                    key={ev.id} 
                                    className="text-xs px-1.5 py-1 rounded bg-teal-100 text-teal-800 truncate cursor-pointer hover:bg-teal-200"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedEvent(ev);
                                    }}
                                >
                                    {format(parseISO(ev.start_time), 'h:mm a')} {ev.title}
                                </div>
                            ))}
                        </div>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div key={day} className="grid grid-cols-7 gap-0">{days}</div>
            );
            days = [];
        }
        return <div className="border rounded-lg overflow-hidden">{rows}</div>;
    };

    if (!user) return <div className="p-4 text-center">Please log in to view your schedule.</div>;
    if (!employee) return <div className="p-4 text-center">No employee profile found for {user.email}.</div>;

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>My Schedule</CardTitle>
                <CardDescription>Your assigned events and tasks.</CardDescription>
            </CardHeader>
            <CardContent>
                {renderHeader()}
                <div className="grid grid-cols-7 border-b border-stone-200 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="text-center text-xs font-medium text-stone-500 py-2 uppercase">
                            {d}
                        </div>
                    ))}
                </div>
                {renderCells()}
            </CardContent>

            <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedEvent?.title}</DialogTitle>
                        <DialogDescription>
                            <div className="flex flex-col gap-2 mt-2">
                                <div className="flex items-center gap-2 text-stone-600">
                                    <Clock className="w-4 h-4" />
                                    <span>
                                        {selectedEvent && format(parseISO(selectedEvent.start_time), 'PPPP')} at {selectedEvent && format(parseISO(selectedEvent.start_time), 'h:mm a')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline">{selectedEvent?.type}</Badge>
                                </div>
                                {selectedEvent?.description && (
                                    <div className="mt-2 p-3 bg-stone-50 rounded-md text-sm text-stone-800 flex gap-2">
                                        <AlignLeft className="w-4 h-4 shrink-0 mt-0.5 text-stone-400" />
                                        {selectedEvent.description}
                                    </div>
                                )}
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setSelectedEvent(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}