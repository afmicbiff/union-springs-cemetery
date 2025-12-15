import React from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isAfter } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Calendar, Check, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

export default function UserSummaryWidget() {
    const queryClient = useQueryClient();

    const { data: user } = useQuery({
        queryKey: ['me'],
        queryFn: () => base44.auth.me().catch(() => null),
    });

    const { data: employee } = useQuery({
        queryKey: ['my-employee-profile', user?.email],
        queryFn: async () => {
            if (!user?.email) return null;
            const res = await base44.entities.Employee.list({ limit: 1000 }); // Filter locally or via backend if supported
            return res.find(e => e.email === user.email);
        },
        enabled: !!user?.email
    });

    const { data: notifications } = useQuery({
        queryKey: ['my-notifications', user?.email],
        queryFn: async () => {
            // Get global and user-specific notifications
            const all = await base44.entities.Notification.list({ limit: 50 }, '-created_at');
            return all.filter(n => !n.user_email || n.user_email === user?.email);
        },
        enabled: !!user
    });

    const { data: upcomingEvents } = useQuery({
        queryKey: ['my-events', employee?.id],
        queryFn: async () => {
            if (!employee?.id) return [];
            const allEvents = await base44.entities.Event.list({ limit: 100 });
            return allEvents
                .filter(e => e.attendee_ids?.includes(employee.id))
                .filter(e => isAfter(parseISO(e.start_time), new Date()))
                .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
                .slice(0, 5);
        },
        enabled: !!employee?.id
    });

    const markAsReadMutation = useMutation({
        mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
        onSuccess: () => {
            queryClient.invalidateQueries(['my-notifications']);
        }
    });

    if (!user) return null;

    const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

    return (
        <div className="grid gap-4 md:grid-cols-2">
            {/* Upcoming Events */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Upcoming Schedule
                    </CardTitle>
                    <Calendar className="h-4 w-4 text-stone-500" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4 pt-4">
                        {!upcomingEvents?.length ? (
                            <p className="text-sm text-stone-500">No upcoming events scheduled.</p>
                        ) : (
                            upcomingEvents.map(event => (
                                <div key={event.id} className="flex items-start gap-4 border-l-2 border-teal-500 pl-4">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">{event.title}</p>
                                        <p className="text-xs text-stone-500">
                                            {format(parseISO(event.start_time), 'MMM d, h:mm a')}
                                        </p>
                                    </div>
                                    <Badge variant="outline" className="ml-auto text-xs">{event.type}</Badge>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Notifications
                        {unreadCount > 0 && <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>}
                    </CardTitle>
                    <Bell className="h-4 w-4 text-stone-500" />
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[200px] pr-4">
                        <div className="space-y-4 pt-4">
                            {!notifications?.length ? (
                                <p className="text-sm text-stone-500">No notifications.</p>
                            ) : (
                                notifications.map(notif => (
                                    <div key={notif.id} className={`flex items-start justify-between gap-2 p-2 rounded-md ${notif.is_read ? 'opacity-60' : 'bg-stone-50'}`}>
                                        <div className="space-y-1">
                                            <p className="text-sm leading-snug">{notif.message}</p>
                                            <p className="text-xs text-stone-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {format(parseISO(notif.created_at), 'MMM d, h:mm a')}
                                            </p>
                                        </div>
                                        {!notif.is_read && (
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-6 w-6 shrink-0"
                                                onClick={() => markAsReadMutation.mutate(notif.id)}
                                                title="Mark as read"
                                            >
                                                <Check className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}