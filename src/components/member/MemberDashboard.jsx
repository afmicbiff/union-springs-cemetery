import React, { memo, useMemo, useCallback } from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Calendar, AlertCircle, CheckCircle2, RefreshCw, Bell } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

// Safe date formatter
function safeFormatDate(dateStr, formatStr = 'MMM d, yyyy') {
  if (!dateStr) return 'N/A';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    return isValid(d) ? format(d, formatStr) : 'N/A';
  } catch {
    return 'N/A';
  }
}

// Memoized Task Item
const TaskItem = memo(function TaskItem({ task, onAction }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 bg-white p-3 rounded-md border border-stone-200 shadow-sm">
      <div className="min-w-0 flex-1">
        <h4 className="font-semibold text-stone-800 text-sm sm:text-base">{task.title}</h4>
        <p className="text-xs sm:text-sm text-stone-600">{task.description}</p>
      </div>
      <Button size="sm" variant="outline" onClick={task.action} className="h-8 text-xs shrink-0 self-end sm:self-center">View</Button>
    </div>
  );
});

// Memoized Reservation Card
const ReservationCard = memo(function ReservationCard({ reservation, status }) {
  const isConfirmed = status === 'confirmed';
  return (
    <div className={`p-3 rounded-md border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 ${isConfirmed ? 'bg-stone-50' : 'bg-white shadow-sm'}`}>
      <div className="min-w-0">
        <div className={`font-medium text-sm ${isConfirmed ? 'text-teal-900' : 'text-stone-800'}`}>
          Plot {reservation.plot_id}
        </div>
        <div className="text-xs text-stone-500">
          {isConfirmed ? 'Reserved' : 'Submitted'}: {safeFormatDate(reservation.date)}
        </div>
      </div>
      <Badge className={isConfirmed ? 'bg-teal-600' : 'text-amber-600 border-amber-200 bg-amber-50'} variant={isConfirmed ? 'default' : 'outline'}>
        {isConfirmed ? 'Owned' : 'Pending'}
      </Badge>
    </div>
  );
});

function MemberDashboard({ user, setActiveTab }) {
    // Fetch Member Record
    const { data: memberData } = useQuery({
        queryKey: ['member-profile', user?.email],
        queryFn: async () => {
            const res = await base44.entities.Member.filter({ email_primary: user.email }, null, 1);
            return res?.[0] || null;
        },
        enabled: !!user?.email,
        initialData: null,
        staleTime: 5 * 60_000,
        retry: 2,
    });

    // Fetch Reservations (Plots)
    const { data: reservations, isLoading: loadingReservations, isError: reservationsError, refetch: refetchReservations, isFetching } = useQuery({
        queryKey: ['member-reservations', user?.email],
        queryFn: async () => {
            const res = await base44.entities.Reservation.list(null, 100); 
            return (res || []).filter(r => r.owner_email === user.email);
        },
        enabled: !!user?.email,
        staleTime: 2 * 60_000,
        retry: 2,
    });

    // Fetch user notifications
    const { data: notifications = [] } = useQuery({
        queryKey: ['member-notifications', user?.email],
        queryFn: () => base44.entities.Notification.filter({ user_email: user.email, is_read: false }, '-created_at', 5),
        enabled: !!user?.email,
        staleTime: 60_000,
        retry: 1,
    });

    const pendingReservations = useMemo(() => (reservations || []).filter(r => r.status === 'Pending'), [reservations]);
    const confirmedReservations = useMemo(() => (reservations || []).filter(r => r.status === 'Confirmed'), [reservations]);

    // Calculate Outstanding Tasks
    const tasks = useMemo(() => {
        const items = [];
        if (pendingReservations.length > 0) {
            items.push({
                id: 'pending-res',
                title: 'Pending Reservations',
                description: `You have ${pendingReservations.length} reservation(s) awaiting approval or payment.`,
                type: 'alert',
                action: () => setActiveTab('messages')
            });
        }
        if (!memberData?.phone_primary || !memberData?.address) {
            items.push({
                id: 'profile-incomplete',
                title: 'Complete Your Profile',
                description: 'Please update your contact information to help us reach you.',
                type: 'info',
                action: () => setActiveTab('profile')
            });
        }
        if (notifications.length > 0) {
            items.push({
                id: 'unread-notifications',
                title: 'Unread Notifications',
                description: `You have ${notifications.length} unread notification(s).`,
                type: 'info',
                action: () => setActiveTab('messages')
            });
        }
        return items;
    }, [pendingReservations.length, memberData, notifications.length, setActiveTab]);

    const handleRefresh = useCallback(() => {
        refetchReservations();
    }, [refetchReservations]);

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Outstanding Tasks / Action Items */}
                <Card className="md:col-span-2 bg-stone-50 border-stone-200">
                    <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" /> 
                                Action Items
                            </CardTitle>
                            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isFetching} className="h-7 w-7 sm:h-8 sm:w-8">
                                <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFetching ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6">
                        {tasks.length === 0 ? (
                            <div className="flex items-center gap-2 text-green-700 py-2">
                                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                                <span className="font-medium text-sm sm:text-base">You're all caught up! No outstanding tasks.</span>
                            </div>
                        ) : (
                            <div className="space-y-2 sm:space-y-3">
                                {tasks.map(task => (
                                    <TaskItem key={task.id} task={task} />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* My Plots / Reservations */}
                <Card className="h-full">
                    <CardHeader className="px-3 sm:px-6 pb-2 sm:pb-3">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <MapPin className="w-4 h-4 sm:w-5 sm:h-5" /> My Plots
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Your reserved and owned locations</CardDescription>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6">
                        {reservationsError ? (
                            <div className="text-center py-4">
                                <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                                <p className="text-xs text-stone-500">Failed to load plots</p>
                                <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2 h-7 text-xs">Try Again</Button>
                            </div>
                        ) : loadingReservations ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="animate-spin w-5 h-5 sm:w-6 sm:h-6 text-stone-400" />
                            </div>
                        ) : confirmedReservations.length === 0 ? (
                            <div className="text-center py-4">
                                <MapPin className="w-6 h-6 mx-auto mb-2 text-stone-200" />
                                <p className="text-stone-500 italic text-sm">No confirmed plots found.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 sm:space-y-3">
                                {confirmedReservations.map(res => (
                                    <ReservationCard key={res.id} reservation={res} status="confirmed" />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Activity / Pending */}
                <Card className="h-full">
                    <CardHeader className="px-3 sm:px-6 pb-2 sm:pb-3">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" /> Recent Requests
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Status of your recent applications</CardDescription>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6">
                        {reservationsError ? (
                            <div className="text-center py-4">
                                <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                                <p className="text-xs text-stone-500">Failed to load requests</p>
                            </div>
                        ) : loadingReservations ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="animate-spin w-5 h-5 sm:w-6 sm:h-6 text-stone-400" />
                            </div>
                        ) : pendingReservations.length === 0 ? (
                            <div className="text-center py-4">
                                <Calendar className="w-6 h-6 mx-auto mb-2 text-stone-200" />
                                <p className="text-stone-500 italic text-sm">No pending requests.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 sm:space-y-3">
                                {pendingReservations.map(res => (
                                    <ReservationCard key={res.id} reservation={res} status="pending" />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default MemberDashboard;