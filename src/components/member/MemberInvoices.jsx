import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function MemberInvoices({ user }) {
    const { data: member } = useQuery({
        queryKey: ['member-profile', user?.email],
        queryFn: async () => {
            if (!user?.email) return null;
            const res = await base44.entities.Member.filter({ email_primary: user.email }, null, 1);
            return (res && res[0]) || null;
        },
        enabled: !!user?.email
    });

    const { data: invoices = [], isLoading } = useQuery({
        queryKey: ['member-invoices', member?.id || 'none'],
        queryFn: async () => {
            if (!member?.id) return [];
            return await base44.entities.Invoice.filter({ member_id: member.id }, '-due_date', 50);
        },
        enabled: !!member?.id
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'Paid': return 'bg-green-100 text-green-800 border-green-200';
            case 'Overdue': return 'bg-red-100 text-red-800 border-red-200';
            case 'Cancelled': return 'bg-stone-100 text-stone-800 border-stone-200';
            default: return 'bg-amber-100 text-amber-800 border-amber-200';
        }
    };

    if (isLoading) return <div className="p-8 text-center text-stone-500">Loading financial records...</div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Receipt className="w-5 h-5" /> Invoices & Payments
                </CardTitle>
                <CardDescription>View your invoice history and outstanding balances.</CardDescription>
            </CardHeader>
            <CardContent>
                {!invoices || invoices.length === 0 ? (
                    <div className="text-center py-12 bg-stone-50 rounded-lg border border-dashed border-stone-200">
                        <CheckCircle2 className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                        <p className="text-stone-500 font-medium">No invoices found</p>
                        <p className="text-sm text-stone-400">You don't have any payment history yet.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {invoices.map(invoice => (
                            <div key={invoice.id} className="border rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-stone-50 transition-colors">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold text-stone-900">{invoice.title}</span>
                                        <Badge variant="outline" className={getStatusColor(invoice.status)}>
                                            {invoice.status}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-stone-500">#{invoice.invoice_number} • Due {format(new Date(invoice.due_date), 'MMM d, yyyy')}</p>
                                    {invoice.description && <p className="text-sm text-stone-600 mt-1">{invoice.description}</p>}
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-lg font-bold text-stone-900">
                                        ${invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    {invoice.status === 'Paid' && invoice.paid_date && (
                                        <div className="text-xs text-green-600 flex items-center justify-end gap-1 mt-1">
                                            <CheckCircle2 className="w-3 h-3" /> Paid {format(new Date(invoice.paid_date), 'MMM d')}
                                        </div>
                                    )}
                                    {invoice.status === 'Pending' && (
                                        <div className="text-xs text-amber-600 flex items-center justify-end gap-1 mt-1">
                                            <Clock className="w-3 h-3" /> Outstanding
                                        </div>
                                    )}
                                    {invoice.status === 'Overdue' && (
                                        <div className="text-xs text-red-600 flex items-center justify-end gap-1 mt-1">
                                            <AlertCircle className="w-3 h-3" /> Payment Required
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}