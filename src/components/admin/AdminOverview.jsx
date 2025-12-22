import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO, isAfter } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Calendar, Bell, CheckSquare } from 'lucide-react';
import UserSummaryWidget from "@/components/dashboard/UserSummaryWidget";
import FollowUpWidget from "./FollowUpWidget";

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
    const { data: tasks = [], isLoading: tasksLoading } = useQuery({
        queryKey: ['tasks-overview'],
        queryFn: () => base44.entities.Task.filter({ is_archived: false }, '-created_date', 200),
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


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <FollowUpWidget />
                
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="col-span-1">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Upcoming Schedule</CardTitle>
                    <CardDescription>Next events from the calendar.</CardDescription>
                  </div>
                  <Calendar className="w-4 h-4 text-stone-400" />
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[260px] pr-4">
                    <div className="space-y-3">
                      {eventsLoading ? (
                        <div className="text-sm text-stone-500">Loading…</div>
                      ) : upcomingEvents.length === 0 ? (
                        <div className="text-sm text-stone-500 italic">No upcoming events.</div>
                      ) : (
                        upcomingEvents.slice(0, 20).map(ev => (
                          <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg border bg-white hover:bg-stone-50">
                            <Calendar className="w-4 h-4 text-teal-600 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between text-[11px] text-stone-500">
                                <span>{format(parseISO(ev.start_time), 'MMM d, h:mm a')}</span>
                                {ev.location && <span className="truncate max-w-[120px] text-right">{ev.location}</span>}
                              </div>
                              <div className="font-medium text-sm text-stone-900 truncate">{ev.title}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="col-span-1">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Tasks</CardTitle>
                    <CardDescription>Your current work queue.</CardDescription>
                  </div>
                  <CheckSquare className="w-4 h-4 text-stone-400" />
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[260px] pr-4">
                    <div className="space-y-3">
                      {tasksLoading ? (
                        <div className="text-sm text-stone-500">Loading…</div>
                      ) : tasksSorted.length === 0 ? (
                        <div className="text-sm text-stone-500 italic">No active tasks.</div>
                      ) : (
                        tasksSorted.slice(0, 20).map(t => (
                          <div key={t.id} className="p-3 rounded-lg border bg-white hover:bg-stone-50">
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-medium text-sm text-stone-900 truncate">{t.title}</div>
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                                {t.priority && <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>}
                              </div>
                            </div>
                            <div className="text-[11px] text-stone-500 mt-1">
                              {t.due_date ? `Due ${format(new Date(t.due_date), 'MMM d')}` : 'No due date'}
                            </div>
                            {t.description && <div className="text-xs text-stone-600 mt-1 line-clamp-2">{t.description}</div>}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="col-span-1">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>Latest system activity.</CardDescription>
                  </div>
                  <Bell className="w-4 h-4 text-stone-400" />
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[260px] pr-4">
                    <div className="space-y-3">
                      {notesLoading ? (
                        <div className="text-sm text-stone-500">Loading…</div>
                      ) : notifications.length === 0 ? (
                        <div className="text-sm text-stone-500 italic">No notifications.</div>
                      ) : (
                        notifications.slice(0, 20).map(n => (
                          <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg border bg-white hover:bg-stone-50 ${!n.is_read ? 'border-teal-200' : ''}`}>
                            <Bell className={`w-4 h-4 mt-0.5 ${!n.is_read ? 'text-teal-600' : 'text-stone-400'}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between text-[11px] text-stone-500">
                                <span>{n.created_at ? format(new Date(n.created_at), 'MMM d, h:mm a') : ''}</span>
                                {!n.is_read && <span className="inline-block w-2 h-2 rounded-full bg-teal-600" />}
                              </div>
                              <div className="text-sm text-stone-800 leading-snug line-clamp-2">{n.message}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
        </div>
    );
}