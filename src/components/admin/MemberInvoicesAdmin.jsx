import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Receipt, Plus, Mail, Check, AlertCircle, Loader2, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from "sonner";

export default function MemberInvoicesAdmin({ member }) {
    const queryClient = useQueryClient();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    
    // Invoices Query
    const { data: invoices, isLoading } = useQuery({
        queryKey: ['admin-member-invoices', member.id],
        queryFn: () => base44.entities.Invoice.filter({ member_id: member.id }, '-due_date'),
        enabled: !!member.id
    });

    // Create Invoice Mutation
    const createMutation = useMutation({
        mutationFn: async (data) => {
            const invoiceData = {
                ...data,
                member_id: member.id,
                member_email: member.email_primary,
                status: 'Pending',
                invoice_number: `INV-${Date.now().toString().slice(-6)}` // Simple ID generation
            };
            return await base44.entities.Invoice.create(invoiceData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-member-invoices']);
            setIsCreateOpen(false);
            toast.success("Invoice created successfully");
        },
        onError: (err) => toast.error("Failed to create invoice: " + err.message)
    });

    // Update Status Mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, status, payment_method }) => {
            const updateData = { status };
            if (status === 'Paid') {
                updateData.paid_date = new Date().toISOString();
                updateData.payment_method = payment_method;
            }
            return await base44.entities.Invoice.update(id, updateData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-member-invoices']);
            toast.success("Invoice updated");
        }
    });

    // Send Reminder Mutation
    const reminderMutation = useMutation({
        mutationFn: async (invoiceId) => {
            const res = await base44.functions.invoke('sendInvoiceReminder', { invoice_id: invoiceId });
            if (res.data.error) throw new Error(res.data.error);
            return res.data;
        },
        onSuccess: () => toast.success("Reminder sent to member"),
        onError: (err) => toast.error("Failed to send reminder: " + err.message)
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'Paid': return 'bg-green-100 text-green-800';
            case 'Overdue': return 'bg-red-100 text-red-800';
            case 'Cancelled': return 'bg-stone-100 text-stone-500';
            default: return 'bg-amber-100 text-amber-800';
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Financials</h3>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-8 gap-2 border-dashed">
                            <Plus className="w-3.5 h-3.5" /> New Invoice
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Invoice</DialogTitle>
                        </DialogHeader>
                        <CreateInvoiceForm onSubmit={createMutation.mutate} isLoading={createMutation.isPending} />
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin w-5 h-5 text-stone-400" /></div>
            ) : !invoices || invoices.length === 0 ? (
                <p className="text-sm text-stone-400 italic">No invoices recorded.</p>
            ) : (
                <div className="space-y-3">
                    {invoices.map(inv => (
                        <div key={inv.id} className="bg-stone-50 border rounded-md p-3 text-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="font-semibold text-stone-900">{inv.title}</div>
                                    <div className="text-xs text-stone-500">#{inv.invoice_number} • Due {format(new Date(inv.due_date), 'MMM d')}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-stone-900">${inv.amount.toFixed(2)}</div>
                                    <Badge variant="secondary" className={`mt-1 text-[10px] px-1.5 py-0 ${getStatusColor(inv.status)}`}>
                                        {inv.status}
                                    </Badge>
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-stone-200">
                                {inv.status !== 'Paid' && inv.status !== 'Cancelled' && (
                                    <>
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="h-7 w-7 text-stone-500 hover:text-teal-600" 
                                            title="Send Reminder"
                                            onClick={() => reminderMutation.mutate(inv.id)}
                                            disabled={reminderMutation.isPending}
                                        >
                                            <Mail className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-7 px-2 text-green-700 hover:text-green-800 hover:bg-green-50 text-xs"
                                            onClick={() => updateMutation.mutate({ id: inv.id, status: 'Paid', payment_method: 'Check' })} // Simplify for now, maybe add dialog for payment details later
                                        >
                                            <Check className="w-3.5 h-3.5 mr-1" /> Mark Paid
                                        </Button>
                                    </>
                                )}
                                {inv.status === 'Paid' && (
                                    <span className="text-xs text-stone-400 flex items-center">
                                        Paid via {inv.payment_method || 'Unknown'} on {format(new Date(inv.paid_date), 'MM/dd')}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function CreateInvoiceForm({ onSubmit, isLoading }) {
    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        due_date: format(new Date(), 'yyyy-MM-dd'),
        description: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            amount: parseFloat(formData.amount)
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Title</Label>
                    <Input 
                        required 
                        placeholder="e.g. Annual Maintenance"
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Amount ($)</Label>
                    <Input 
                        required 
                        type="number" 
                        step="0.01" 
                        min="0"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={e => setFormData({...formData, amount: e.target.value})}
                    />
                </div>
            </div>
            <div className="space-y-2">
                <Label>Due Date</Label>
                <Input 
                    required 
                    type="date" 
                    value={formData.due_date}
                    onChange={e => setFormData({...formData, due_date: e.target.value})}
                />
            </div>
            <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                    placeholder="Details about services..."
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                />
            </div>
            <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isLoading} className="bg-teal-700 hover:bg-teal-800">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <DollarSign className="w-4 h-4 mr-2" />}
                    Create Invoice
                </Button>
            </div>
        </form>
    );
}