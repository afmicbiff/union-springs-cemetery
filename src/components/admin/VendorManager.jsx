import React, { useState, memo, useCallback, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Plus, Loader2, FileText, DollarSign, Upload, Search, Edit } from 'lucide-react';
import { toast } from "sonner";
import { format } from 'date-fns';
import DocumentUploader from '@/components/documents/DocumentUploader';
import DocumentList from '@/components/documents/DocumentList';

// Memoized vendor row for table performance
const VendorRow = memo(({ v, onSelect }) => (
    <TableRow>
        <TableCell className="font-mono text-xs">{v.vendor_id}</TableCell>
        <TableCell className="font-medium text-sm">{v.company_name}</TableCell>
        <TableCell>
            <div className="text-xs">{v.contact_name}</div>
            <div className="text-[10px] text-stone-500">{v.email}</div>
        </TableCell>
        <TableCell><Badge variant="outline" className="text-[10px]">{v.payment_terms}</Badge></TableCell>
        <TableCell className="text-right">
            <Button size="sm" className="h-7 text-xs bg-teal-700 hover:bg-teal-800 text-white" onClick={() => onSelect(v)}>View</Button>
        </TableCell>
    </TableRow>
));

export default function VendorManager() {
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const handleSelect = useCallback((v) => setSelectedVendor(v), []);
    const handleBack = useCallback(() => setSelectedVendor(null), []);
    const handleCreate = useCallback(() => setIsCreateOpen(true), []);

    return (
        <div className="space-y-4">
            {!selectedVendor ? (
                <VendorList onSelect={handleSelect} onCreate={handleCreate} isCreateOpen={isCreateOpen} setIsCreateOpen={setIsCreateOpen}/>
            ) : (
                <VendorProfile vendor={selectedVendor} onBack={handleBack}/>
            )}
        </div>
    );
}

const VendorList = memo(function VendorList({ onSelect, onCreate, isCreateOpen, setIsCreateOpen }) {
    const [searchTerm, setSearchTerm] = useState("");
    const { data: vendors = [], isLoading } = useQuery({
        queryKey: ['vendors'],
        queryFn: () => base44.entities.Vendor.list('-created_date', 50),
        staleTime: 3 * 60_000,
    });

    const filtered = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return vendors.filter(v => v.company_name?.toLowerCase().includes(term) || v.vendor_id?.includes(searchTerm));
    }, [vendors, searchTerm]);

    return (
        <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3">
                <div>
                    <CardTitle className="flex items-center gap-2 text-base"><Building2 className="w-4 h-4 text-teal-600"/>Vendors</CardTitle>
                    <CardDescription className="text-xs">Manage suppliers & invoices</CardDescription>
                </div>
                <Button onClick={onCreate} size="sm" className="bg-teal-700 hover:bg-teal-800 h-8"><Plus className="w-3.5 h-3.5 mr-1"/>Add Vendor</Button>
            </CardHeader>
            <CardContent className="px-4">
                <div className="relative max-w-xs mb-3">
                    <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-stone-500"/>
                    <Input placeholder="Search..." className="pl-7 h-8 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                </div>
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-stone-50">
                                <TableHead className="text-xs">ID</TableHead>
                                <TableHead className="text-xs">Company</TableHead>
                                <TableHead className="text-xs">Contact</TableHead>
                                <TableHead className="text-xs">Terms</TableHead>
                                <TableHead className="text-xs text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-6"><Loader2 className="w-4 h-4 animate-spin inline mr-2"/>Loading...</TableCell></TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-6 text-stone-500 text-sm">No vendors found.</TableCell></TableRow>
                            ) : filtered.map(v => <VendorRow key={v.id} v={v} onSelect={onSelect}/>)}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <VendorOnboardingForm onSuccess={() => setIsCreateOpen(false)}/>
                </DialogContent>
            </Dialog>
        </Card>
    );
});

const VendorOnboardingForm = memo(function VendorOnboardingForm({ onSuccess }) {
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        try {
            const res = await base44.functions.invoke('createVendor', data);
            if (res.data.error) throw new Error(res.data.error);
            toast.success(`Vendor created`);
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
            onSuccess();
        } catch (err) {
            toast.error("Failed: " + err.message);
        } finally {
            setLoading(false);
        }
    }, [queryClient, onSuccess]);

    return (
        <div className="space-y-3">
            <h2 className="text-base font-bold flex items-center gap-2"><Plus className="w-4 h-4"/>New Vendor</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-xs">Company *</Label><Input name="company_name" required className="h-8 text-sm"/></div>
                    <div className="space-y-1"><Label className="text-xs">Tax ID</Label><Input name="tax_id" className="h-8 text-sm"/></div>
                    <div className="space-y-1"><Label className="text-xs">Contact</Label><Input name="contact_name" className="h-8 text-sm"/></div>
                    <div className="space-y-1"><Label className="text-xs">Email</Label><Input name="email" type="email" className="h-8 text-sm"/></div>
                    <div className="space-y-1"><Label className="text-xs">Phone</Label><Input name="phone" className="h-8 text-sm"/></div>
                    <div className="space-y-1"><Label className="text-xs">Terms</Label>
                        <Select name="payment_terms" defaultValue="Net 30"><SelectTrigger className="h-8 text-sm"><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="Due on Receipt">Due on Receipt</SelectItem><SelectItem value="Net 15">Net 15</SelectItem><SelectItem value="Net 30">Net 30</SelectItem><SelectItem value="Net 60">Net 60</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-1 sm:col-span-2 space-y-1">
                        <Label className="text-xs">Address</Label>
                        <Input name="address_street" placeholder="Street" className="h-8 text-sm mb-2"/>
                        <div className="grid grid-cols-3 gap-2">
                            <Input name="address_city" placeholder="City" className="h-8 text-sm"/>
                            <Input name="address_state" placeholder="State" className="h-8 text-sm"/>
                            <Input name="address_zip" placeholder="Zip" className="h-8 text-sm"/>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={onSuccess}>Cancel</Button>
                    <Button type="submit" size="sm" className="bg-teal-700" disabled={loading}>{loading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/>:"Create"}</Button>
                </div>
            </form>
        </div>
    );
});

const VendorProfile = memo(function VendorProfile({ vendor, onBack }) {
    const queryClient = useQueryClient();
    const [isEditOpen, setIsEditOpen] = useState(false);

    const { data: invoices = [] } = useQuery({
        queryKey: ['invoices', vendor.id],
        queryFn: () => base44.entities.VendorInvoice.filter({ vendor_id: vendor.id }),
        staleTime: 2 * 60_000,
    });

    const updateVendor = useMutation({
        mutationFn: (data) => base44.entities.Vendor.update(vendor.id, data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendors'] }); toast.success("Updated"); }
    });

    const handleDocUpload = useCallback((doc) => {
        updateVendor.mutate({ documents: [...(vendor.documents || []), doc] });
    }, [vendor.documents, updateVendor]);

    const handleDeleteDoc = useCallback((doc) => {
        updateVendor.mutate({ documents: (vendor.documents || []).filter(d => d.file_uri !== doc.file_uri) });
    }, [vendor.documents, updateVendor]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <Button onClick={onBack} size="sm" className="bg-teal-700 hover:bg-teal-800 text-white h-8">Back</Button>
                <h1 className="text-lg sm:text-xl font-bold truncate">{vendor.company_name} <span className="text-stone-400 text-sm font-normal">#{vendor.vendor_id}</span></h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 py-3">
                        <CardTitle className="text-sm">Details</CardTitle>
                        <Button size="icon" className="h-7 w-7 bg-teal-700 hover:bg-teal-800 text-white" onClick={() => setIsEditOpen(true)}><Edit className="w-3.5 h-3.5"/></Button>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs px-4 pt-2">
                        <div><Label className="text-stone-500 text-[10px]">Contact</Label><p>{vendor.contact_name}</p><p>{vendor.email}</p><p>{vendor.phone}</p></div>
                        <div><Label className="text-stone-500 text-[10px]">Address</Label><p>{vendor.address_street}</p><p>{vendor.address_city}, {vendor.address_state} {vendor.address_zip}</p></div>
                        <div><Label className="text-stone-500 text-[10px]">Financials</Label><p>Tax ID: {vendor.tax_id||"N/A"}</p><p>Terms: {vendor.payment_terms}</p></div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <Tabs defaultValue="financials">
                        <CardHeader className="pb-0 px-4 py-3">
                            <TabsList className="bg-transparent p-0 gap-1 flex-wrap">
                                <TabsTrigger value="financials" className="h-7 text-xs data-[state=active]:bg-teal-700 data-[state=active]:text-white">Invoices</TabsTrigger>
                                <TabsTrigger value="documents" className="h-7 text-xs data-[state=active]:bg-teal-700 data-[state=active]:text-white">Docs</TabsTrigger>
                            </TabsList>
                        </CardHeader>
                        <CardContent className="pt-4 px-4">
                            <TabsContent value="financials"><InvoiceManager vendorId={vendor.id} vendorName={vendor.company_name} invoices={invoices}/></TabsContent>
                            <TabsContent value="documents" className="space-y-3"><DocumentUploader onUploadComplete={handleDocUpload}/><DocumentList documents={vendor.documents} onDelete={handleDeleteDoc}/></TabsContent>
                        </CardContent>
                    </Tabs>
                </Card>
            </div>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"><VendorEditForm vendor={vendor} onSuccess={() => setIsEditOpen(false)}/></DialogContent>
            </Dialog>
        </div>
    );
});

const VendorEditForm = memo(function VendorEditForm({ vendor, onSuccess }) {
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setLoading(true);
        const data = Object.fromEntries(new FormData(e.target));
        try {
            await base44.entities.Vendor.update(vendor.id, data);
            toast.success("Updated");
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
            onSuccess();
        } catch (err) {
            toast.error("Failed: " + err.message);
        } finally {
            setLoading(false);
        }
    }, [vendor.id, queryClient, onSuccess]);

    return (
        <div className="space-y-3">
            <h2 className="text-base font-bold">Edit Vendor</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-xs">Company *</Label><Input name="company_name" required defaultValue={vendor.company_name} className="h-8 text-sm"/></div>
                    <div className="space-y-1"><Label className="text-xs">Tax ID</Label><Input name="tax_id" defaultValue={vendor.tax_id} className="h-8 text-sm"/></div>
                    <div className="space-y-1"><Label className="text-xs">Contact</Label><Input name="contact_name" defaultValue={vendor.contact_name} className="h-8 text-sm"/></div>
                    <div className="space-y-1"><Label className="text-xs">Email</Label><Input name="email" type="email" defaultValue={vendor.email} className="h-8 text-sm"/></div>
                    <div className="space-y-1"><Label className="text-xs">Phone</Label><Input name="phone" defaultValue={vendor.phone} className="h-8 text-sm"/></div>
                    <div className="space-y-1"><Label className="text-xs">Terms</Label>
                        <Select name="payment_terms" defaultValue={vendor.payment_terms||"Net 30"}><SelectTrigger className="h-8 text-sm"><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="Due on Receipt">Due on Receipt</SelectItem><SelectItem value="Net 15">Net 15</SelectItem><SelectItem value="Net 30">Net 30</SelectItem><SelectItem value="Net 60">Net 60</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-1 sm:col-span-2 space-y-1">
                        <Label className="text-xs">Address</Label>
                        <Input name="address_street" placeholder="Street" defaultValue={vendor.address_street} className="h-8 text-sm mb-2"/>
                        <div className="grid grid-cols-3 gap-2">
                            <Input name="address_city" placeholder="City" defaultValue={vendor.address_city} className="h-8 text-sm"/>
                            <Input name="address_state" placeholder="State" defaultValue={vendor.address_state} className="h-8 text-sm"/>
                            <Input name="address_zip" placeholder="Zip" defaultValue={vendor.address_zip} className="h-8 text-sm"/>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={onSuccess}>Cancel</Button>
                    <Button type="submit" size="sm" className="bg-teal-700" disabled={loading}>{loading?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:"Save"}</Button>
                </div>
            </form>
        </div>
    );
});

const InvoiceManager = memo(function InvoiceManager({ vendorId, vendorName, invoices }) {
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    // Debounce overdue check to avoid blocking render
    React.useEffect(() => {
        const t = setTimeout(() => {
            base44.functions.invoke('checkOverdueInvoices').then(() => queryClient.invalidateQueries({ queryKey: ['invoices', vendorId] })).catch(() => {});
        }, 1500);
        return () => clearTimeout(t);
    }, [vendorId, queryClient]);

    const addInvoice = useMutation({
        mutationFn: (data) => base44.entities.VendorInvoice.create({ ...data, vendor_id: vendorId, status: 'Pending' }),
        onSuccess: async (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['invoices', vendorId] });
            setIsAddOpen(false);
            
            // Auto-create Calendar Event if due_date is set
            if (variables.due_date) {
                try {
                     // Find admins to notify
                     const employees = await base44.entities.Employee.list({ limit: 100 });
                     const admins = employees.filter(emp => emp.employment_type === 'Administrator').map(emp => emp.id);

                     const dueDate = new Date(variables.due_date);
                     dueDate.setHours(9, 0, 0, 0); // Default to 9 AM

                     await base44.entities.Event.create({
                         title: `Invoice Due: ${vendorName || 'Vendor'} (#${variables.invoice_number})`,
                         description: `Amount: $${variables.amount_owed}. ${variables.notes || ''}`,
                         start_time: dueDate.toISOString(),
                         end_time: new Date(dueDate.getTime() + 60 * 60 * 1000).toISOString(),
                         type: 'invoice_due',
                         recurrence: 'none',
                         attendee_ids: admins,
                         reminders_sent: {}
                     });
                     toast.success("Invoice added & Calendar event scheduled");
                } catch (err) {
                    console.error(err);
                    toast.success("Invoice added (Event creation failed)");
                }
            } else {
                toast.success("Invoice added");
            }
        }
    });

    const updateInvoice = useMutation({
        mutationFn: ({id, data}) => base44.entities.VendorInvoice.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices', vendorId] });
            toast.success("Invoice updated");
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        if (data.amount_owed) data.amount_owed = parseFloat(data.amount_owed);
        addInvoice.mutate(data);
    };

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm flex items-center gap-1"><DollarSign className="w-3.5 h-3.5"/>Invoices</h3>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild><Button size="sm" className="h-7 text-xs bg-teal-700 hover:bg-teal-800 text-white">Add</Button></DialogTrigger>
                    <DialogContent className="max-w-sm">
                        <h3 className="font-bold text-sm mb-3">New Invoice</h3>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1"><Label className="text-xs">Invoice #</Label><Input name="invoice_number" required className="h-8 text-sm"/></div>
                                <div className="space-y-1"><Label className="text-xs">Amount</Label><Input name="amount_owed" type="number" step="0.01" min="0" required className="h-8 text-sm"/></div>
                                <div className="space-y-1"><Label className="text-xs">Invoice Date</Label><Input name="invoice_date" type="date" required className="h-8 text-sm"/></div>
                                <div className="space-y-1"><Label className="text-xs">Due Date</Label><Input name="due_date" type="date" className="h-8 text-sm"/></div>
                            </div>
                            <div className="space-y-1"><Label className="text-xs">Notes</Label><Input name="notes" className="h-8 text-sm"/></div>
                            <Button type="submit" size="sm" className="w-full bg-teal-700">Save</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-stone-50">
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs">Invoice</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs text-right">Owed</TableHead>
                            <TableHead className="text-xs text-right hidden sm:table-cell">Paid</TableHead>
                            <TableHead className="text-xs text-right">Bal</TableHead>
                            <TableHead className="w-8"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="text-center text-stone-500 text-sm py-4">No invoices.</TableCell></TableRow>
                        ) : invoices.map(inv => {
                            const owed = parseFloat(inv.amount_owed||0), paid = parseFloat(inv.amount_paid||0), balance = owed - paid;
                            return (
                                <React.Fragment key={inv.id}>
                                    <TableRow className="cursor-pointer hover:bg-stone-50" onClick={() => setSelectedInvoice(selectedInvoice === inv.id ? null : inv.id)}>
                                        <TableCell className="text-xs">{format(new Date(inv.invoice_date),'M/d/yy')}</TableCell>
                                        <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                                        <TableCell><Badge variant="outline" className={`text-[10px] ${inv.status==='Paid'?'bg-green-100 text-green-800':''} ${inv.status==='Overdue'?'bg-red-100 text-red-800':''} ${inv.status==='Partial'?'bg-amber-100 text-amber-800':''} ${inv.status==='Pending'?'bg-yellow-200 text-yellow-900':''}`}>{inv.status}</Badge></TableCell>
                                        <TableCell className="text-right text-xs">${owed.toFixed(2)}</TableCell>
                                        <TableCell className="text-right text-xs hidden sm:table-cell">${paid.toFixed(2)}</TableCell>
                                        <TableCell className="text-right text-xs font-semibold">${balance.toFixed(2)}</TableCell>
                                        <TableCell><Button size="icon" className="h-5 w-5 bg-teal-700 text-white text-[10px]">{selectedInvoice===inv.id?'-':'+'}</Button></TableCell>
                                    </TableRow>
                                    {selectedInvoice===inv.id && (
                                        <TableRow className="bg-stone-50/50"><TableCell colSpan={7} className="p-3"><InvoiceDetailView invoice={inv} onUpdate={(data) => updateInvoice.mutate({id:inv.id,data})}/></TableCell></TableRow>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
});

const InvoiceDetailView = memo(function InvoiceDetailView({ invoice, onUpdate }) {
    const [uploading, setUploading] = useState(false);

    const handleAddPayment = useCallback((e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const amount = parseFloat(fd.get('amount'));
        if (amount < 0 && !window.confirm("Negative amount?")) return;
        const newPayment = { id: crypto.randomUUID(), payment_date: fd.get('payment_date'), amount, method: fd.get('method'), reference_number: fd.get('reference_number'), notes: fd.get('notes') };
        const updatedPayments = [...(invoice.payments || []), newPayment];
        const newTotalPaid = updatedPayments.reduce((s, p) => s + (parseFloat(p.amount)||0), 0);
        const owed = parseFloat(invoice.amount_owed||0);
        let newStatus = invoice.status;
        if (newTotalPaid >= owed) newStatus = 'Paid';
        else if (newTotalPaid > 0) newStatus = 'Partial';
        else if (invoice.status !== 'Overdue') newStatus = 'Pending';
        onUpdate({ payments: updatedPayments, amount_paid: newTotalPaid, status: newStatus });
        e.target.reset();
    }, [invoice, onUpdate]);

    const handleInvoiceUpload = useCallback(async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
            onUpdate({ documents: [...(invoice.documents||[]), { name: file.name, file_uri, uploaded_at: new Date().toISOString() }] });
            toast.success("Attached");
        } catch (err) { toast.error("Failed"); }
        finally { setUploading(false); }
    }, [invoice.documents, onUpdate]);

    const handleViewDoc = useCallback(async (doc) => {
        try { const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: doc.file_uri }); window.open(signed_url, '_blank'); }
        catch { toast.error("Failed"); }
    }, []);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
                <h4 className="font-semibold text-xs text-stone-700">Payments</h4>
                <form onSubmit={handleAddPayment} className="bg-white p-2 border rounded space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <Input name="payment_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="h-7 text-xs"/>
                        <Input name="amount" type="number" step="0.01" placeholder="Amt" required className="h-7 text-xs"/>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Select name="method" defaultValue="Check"><SelectTrigger className="h-7 text-xs"><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="Check">Check</SelectItem><SelectItem value="Credit Card">Card</SelectItem><SelectItem value="ACH">ACH</SelectItem><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                        </Select>
                        <Input name="reference_number" placeholder="Ref#" className="h-7 text-xs"/>
                    </div>
                    <Input name="notes" placeholder="Notes" className="h-7 text-xs"/>
                    <Button type="submit" size="sm" className="w-full h-6 text-xs bg-teal-700">Record</Button>
                </form>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                    {(invoice.payments||[]).length === 0 ? <p className="text-[10px] text-stone-500 italic">None</p> : (invoice.payments||[]).map((p,i) => (
                        <div key={i} className="text-xs p-1.5 bg-white border rounded">
                            <div className="font-medium">${p.amount?.toFixed(2)} <span className="text-stone-400 font-normal text-[10px]">via {p.method}</span></div>
                            <div className="text-[10px] text-stone-500">{p.payment_date} • Ref: {p.reference_number||'N/A'}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-xs text-stone-700">Documents</h4>
                    <div className="relative">
                        <input type="file" id={`upload-${invoice.id}`} className="hidden" onChange={handleInvoiceUpload} disabled={uploading}/>
                        <Button size="sm" className="h-6 text-xs bg-teal-700" onClick={() => document.getElementById(`upload-${invoice.id}`).click()} disabled={uploading}>
                            {uploading ? <Loader2 className="w-3 h-3 animate-spin"/> : <><Upload className="w-3 h-3 mr-1"/>Upload</>}
                        </Button>
                    </div>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                    {(invoice.documents||[]).length === 0 ? <p className="text-[10px] text-stone-500 italic">None</p> : (invoice.documents||[]).map((doc,i) => (
                        <div key={i} className="flex justify-between items-center text-xs p-1.5 bg-white border rounded">
                            <div className="flex items-center gap-1 overflow-hidden"><FileText className="w-3 h-3 text-stone-400 flex-shrink-0"/><span className="truncate text-[10px]">{doc.name}</span></div>
                            <Button size="sm" className="h-5 px-1.5 text-[10px] bg-teal-700" onClick={() => handleViewDoc(doc)}>View</Button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});