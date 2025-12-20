import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function MemberDashboard({ user, setActiveTab }) {
    // Fetch Member Record
    const { data: memberData } = useQuery({
        queryKey: ['member-profile', user.email],
        queryFn: async () => {
            const res = await base44.entities.Member.list({ email_primary: user.email }, 1);
            return res[0] || null;
        },
        enabled: !!user.email
    });

    // Fetch Reservations (Plots)
    const { data: reservations, isLoading: loadingReservations } = useQuery({
        queryKey: ['member-reservations', user.email],
        queryFn: async () => {
            // Fetch reservations where owner_email matches
            const res = await base44.entities.Reservation.list(null, 100); 
            // Client-side filter because .list filter might be limited or for safety
            return res.filter(r => r.owner_email === user.email);
        },
        enabled: !!user.email
    });

    const pendingReservations = reservations?.filter(r => r.status === 'Pending') || [];
    const confirmedReservations = reservations?.filter(r => r.status === 'Confirmed') || [];

    // Calculate Outstanding Tasks
    const tasks = [];
    if (pendingReservations.length > 0) {
        tasks.push({
            id: 'pending-res',
            title: 'Pending Reservations',
            description: `You have ${pendingReservations.length} reservation(s) awaiting approval or payment.`,
            type: 'alert',
            action: () => setActiveTab('messages') // Direct to messages to inquire
        });
    }
    if (!memberData?.phone_primary || !memberData?.address) {
        tasks.push({
            id: 'profile-incomplete',
            title: 'Complete Your Profile',
            description: 'Please update your contact information to help us reach you.',
            type: 'info',
            action: () => setActiveTab('profile')
        });
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Outstanding Tasks / Action Items */}
                <Card className="md:col-span-2 bg-stone-50 border-stone-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-600" /> 
                            Action Items
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {tasks.length === 0 ? (
                            <div className="flex items-center gap-2 text-green-700">
                                <CheckCircle2 className="w-5 h-5" />
                                <span className="font-medium">You're all caught up! No outstanding tasks.</span>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {tasks.map(task => (
                                    <div key={task.id} className="flex justify-between items-center bg-white p-3 rounded-md border border-stone-200 shadow-sm">
                                        <div>
                                            <h4 className="font-semibold text-stone-800">{task.title}</h4>
                                            <p className="text-sm text-stone-600">{task.description}</p>
                                        </div>
                                        <Button size="sm" variant="outline" onClick={task.action}>View</Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* My Plots / Reservations */}
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="w-5 h-5" /> My Plots
                        </CardTitle>
                        <CardDescription>Your reserved and owned locations</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingReservations ? (
                            <Loader2 className="animate-spin w-6 h-6 text-stone-400" />
                        ) : confirmedReservations.length === 0 ? (
                            <p className="text-stone-500 italic">No confirmed plots found.</p>
                        ) : (
                            <div className="space-y-3">
                                {confirmedReservations.map(res => (
                                    <div key={res.id} className="p-3 bg-stone-50 rounded-md border flex justify-between items-center">
                                        <div>
                                            <div className="font-medium text-teal-900">Plot {res.plot_id}</div>
                                            <div className="text-xs text-stone-500">Reserved: {res.date ? format(new Date(res.date), 'MMM d, yyyy') : 'N/A'}</div>
                                        </div>
                                        <Badge className="bg-teal-600">Owned</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Activity / Pending */}
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5" /> Recent Requests
                        </CardTitle>
                        <CardDescription>Status of your recent applications</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingReservations ? (
                            <Loader2 className="animate-spin w-6 h-6 text-stone-400" />
                        ) : pendingReservations.length === 0 ? (
                            <p className="text-stone-500 italic">No pending requests.</p>
                        ) : (
                            <div className="space-y-3">
                                {pendingReservations.map(res => (
                                    <div key={res.id} className="p-3 bg-white border rounded-md shadow-sm">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-medium">Plot Reservation: {res.plot_id}</span>
                                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Pending</Badge>
                                        </div>
                                        <div className="text-xs text-stone-500">Submitted: {res.date ? format(new Date(res.date), 'MMM d, yyyy') : 'N/A'}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}