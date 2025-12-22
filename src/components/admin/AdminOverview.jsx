import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO, isAfter } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Calendar, Bell, CheckSquare } from 'lucide-react';
import UserSummaryWidget from "@/components/dashboard/UserSummaryWidget";


export default function AdminOverview() {
    // Overview data sources
    const { data: events = [], isLoading: eventsLoading } = useQuery({
        queryKey: ['events-overview'],
        queryFn: () => base44.entities.Event.list('-created_date', 500),
        initialData: []
    });
    const { data: notifications = [], isLoading: notesLoading } = useQuery({
        queryKey: ['notifications-overview'],
        queryFn: () => base44.entities.Notification.list('-created_at', 50),
        initialData: []
    });


    const upcomingEvents = events
        .filter(e => e.start_time && isAfter(parseISO(e.start_time), new Date()))
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    const tasksSorted = [...tasks].sort((a, b) => {
        const ad = a.due_date ? new Date(a.due_date) : null;
        const bd = b.due_date ? new Date(b.due_date) : null;
        if (ad && bd) return ad - bd;
        if (ad) return -1;
        if (bd) return 1;
        return (a.created_date || 0) > (b.created_date || 0) ? -1 : 1;
    });

    return (
        <div className="space-y-6">
            <UserSummaryWidget />


            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">

                
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Perpetual Care Report</CardTitle>
                        <CardDescription>Maintenance status overview for grounds keeping.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="p-4 bg-stone-50 rounded-sm">
                                <h4 className="font-bold text-stone-800 mb-2">Maintenance Required</h4>
                                <p className="text-stone-600 text-sm">
                                    3 Plots flagged for leveling. <br/>
                                    2 Headstones require cleaning in Old Historic section.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-white rounded-sm shadow-sm border border-stone-100">
                                    <span className="block text-sm text-stone-500">Lawn Maintenance</span>
                                    <span className="font-bold text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Up to Date</span>
                                </div>
                                <div className="p-4 bg-white rounded-sm shadow-sm border border-stone-100">
                                    <span className="block text-sm text-stone-500">Site Inspections</span>
                                    <span className="font-bold text-amber-600 flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> Due in 2 days</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6">





            </div>
        </div>
    );
}