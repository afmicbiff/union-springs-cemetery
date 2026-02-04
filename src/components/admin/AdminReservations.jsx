import React, { lazy, Suspense, useCallback } from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, DollarSign, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const ReservationCalendar = lazy(() => import("@/components/admin/ReservationCalendar"));

export default function AdminReservations() {
    const { data: reservations, isLoading } = useQuery({
        queryKey: ['reservations'],
        queryFn: () => base44.entities.Reservation.list('-created_date', 50),
        initialData: [],
        staleTime: 5 * 60_000,
        gcTime: 15 * 60_000,
        refetchOnWindowFocus: false,
    });

    const generateReceipt = useCallback(async (reservation) => {
        // Lazy load jsPDF only when needed
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        
        // Header
        doc.setFont("times", "bold");
        doc.setFontSize(22);
        doc.setTextColor(13, 148, 136); // Teal color
        doc.text("Union Springs Cemetery", 105, 20, null, null, "center");
        
        doc.setFontSize(12);
        doc.setTextColor(60, 60, 60);
        doc.text("Donation & Reservation Receipt", 105, 30, null, null, "center");

        // Content
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        
        let y = 50;
        const lineHeight = 10;

        doc.text(`Date: ${format(new Date(), 'PPP')}`, 20, y);
        y += lineHeight * 2;
        
        doc.text(`Received From: ${reservation.owner_name}`, 20, y);
        y += lineHeight;
        doc.text(`Donation Amount: $${reservation.donation_amount?.toFixed(2)}`, 20, y);
        y += lineHeight;
        doc.text(`For Reservation of Plot ID: ${reservation.plot_id}`, 20, y);
        y += lineHeight * 2;

        doc.setFont("times", "italic");
        doc.text("Thank you for your generous donation. This confirms the reservation", 20, y);
        y += lineHeight;
        doc.text("of the specified plot(s) at Union Springs Cemetery.", 20, y);

        // Footer
        doc.setLineWidth(0.5);
        doc.line(20, 250, 190, 250);
        doc.setFontSize(10);
        doc.text("123 Granite Way, Union Springs, USA", 105, 260, null, null, "center");
        doc.text("This is not a bill of sale. Plots are reserved via donation.", 105, 265, null, null, "center");

        doc.save(`Receipt_${reservation.owner_name.replace(/\s+/g, '_')}.pdf`);
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Reservation Management</CardTitle>
                <CardDescription>Track donations and generate receipts. Plots are reserved, not sold.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
                        </div>
                    ) : reservations.length === 0 ? (
                        <p className="text-stone-500 italic text-center py-4">No recent reservations.</p>
                    ) : (
                        <div className="grid gap-4">
                            {reservations.map(res => (
                                <div key={res.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-sm hover:bg-stone-50 gap-4">
                                    <div>
                                        <div className="font-bold text-stone-900">{res.owner_name}</div>
                                        <div className="text-sm text-stone-600">Plot: {res.plot_id} • ${res.donation_amount} Donation</div>
                                        <div className="text-xs text-stone-400">{format(new Date(res.date), 'MMM d, yyyy')}</div>
                                    </div>
                                    <div className="flex items-center gap-2 self-start sm:self-auto">
                                        <Badge variant={res.status === 'Confirmed' ? 'default' : 'outline'}>{res.status}</Badge>
                                        <Button size="sm" variant="ghost" onClick={() => generateReceipt(res)}>
                                            <Download className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Receipt</span>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <Button className="w-full bg-teal-700 hover:bg-teal-800 text-white mt-4">
                        <DollarSign className="w-4 h-4 mr-2" /> Record New Donation
                    </Button>

                    <div className="mt-8">
                        <h3 className="text-base font-semibold text-stone-900 mb-2">Reservation Calendar</h3>
                        <p className="text-sm text-stone-600 mb-4">View upcoming reservation holds by expiry date (Pending Reservation).</p>
                        <Suspense fallback={<div className="h-64 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></div>}>
                            <ReservationCalendar />
                        </Suspense>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}