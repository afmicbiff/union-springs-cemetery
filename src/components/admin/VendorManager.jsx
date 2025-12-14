import React, { useState } from 'react';
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

export default function VendorManager() {
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    return (
        <div className="space-y-6">
            {!selectedVendor ? (
                <VendorList 
                    onSelect={setSelectedVendor} 
                    onCreate={() => setIsCreateOpen(true)} 
                    isCreateOpen={isCreateOpen}
                    setIsCreateOpen={setIsCreateOpen}
                />
            ) : (
                <VendorProfile 
                    vendor={selectedVendor} 
                    onBack={() => setSelectedVendor(null)} 
                />
            )}
        </div>
    );
}

function VendorList({ onSelect, onCreate, isCreateOpen, setIsCreateOpen }) {
    const [searchTerm, setSearchTerm] = useState("");
    const { data: vendors, isLoading } = useQuery({
        queryKey: ['vendors'],
        queryFn: () => base44.entities.Vendor.list('-created_date', 100),
        initialData: []
    });

    const filtered = vendors.filter(v => 
        v.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.vendor_id?.includes(searchTerm)
    );

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-teal-600"/> Vendor Management
                    </CardTitle>
                    <CardDescription>Manage suppliers, invoices, and documents.</CardDescription>
                </div>
                <Button onClick={onCreate} className="bg-teal-700 hover:bg-teal-800">
                    <Plus className="w-4 h-4 mr-2"/> Onboard Vendor
                </Button>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2 mb-4">
                    <div className="relative flex-grow max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-500"/>
                        <Input 
                            placeholder="Search vendors..." 
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-stone-50">
                                <TableHead>ID</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Terms</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8 text-stone-500">No vendors found.</TableCell></TableRow>
                            ) : (
                                filtered.map(v => (
                                    <TableRow key={v.id}>
                                        <TableCell className="font-mono">{v.vendor_id}</TableCell>
                                        <TableCell className="font-medium">{v.company_name}</TableCell>
                                        <TableCell>
                                            <div className="text-sm">{v.contact_name}</div>
                                            <div className="text-xs text-stone-500">{v.email}</div>
                                        </TableCell>
                                        <TableCell><Badge variant="outline">{v.payment_terms}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" onClick={() => onSelect(v)} className="bg-teal-700 hover:bg-teal-800 text-white">View</Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-2xl">
                    <VendorOnboardingForm onSuccess={() => setIsCreateOpen(false)} />
                </DialogContent>
            </Dialog>
        </Card>
    );
}

function VendorOnboardingForm({ onSuccess }) {
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            const res = await base44.functions.invoke('createVendor', data);
            if (res.data.error) throw new Error(res.data.error);
            
            toast.success(`Vendor ${data.company_name} onboarded!`);
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
            onSuccess();
        } catch (err) {
            toast.error("Failed to create: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
                <Plus className="w-5 h-5"/> Onboard New Vendor
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Company Name *</Label>
                        <Input name="company_name" required />
                    </div>
                    <div className="space-y-2">
                        <Label>Tax ID / EIN</Label>
                        <Input name="tax_id" />
                    </div>
                    <div className="space-y-2">
                        <Label>Contact Name</Label>
                        <Input name="contact_name" />
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input name="email" type="email" />
                    </div>
                    <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input name="phone" />
                    </div>
                    <div className="space-y-2">
                        <Label>Payment Terms</Label>
                        <Select name="payment_terms" defaultValue="Net 30">
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                                <SelectItem value="Net 15">Net 15</SelectItem>
                                <SelectItem value="Net 30">Net 30</SelectItem>
                                <SelectItem value="Net 60">Net 60</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                        <Label>Address</Label>
                        <Input name="address_street" placeholder="Street" className="mb-2" />
                        <div className="grid grid-cols-3 gap-2">
                            <Input name="address_city" placeholder="City" />
                            <Input name="address_state" placeholder="State" />
                            <Input name="address_zip" placeholder="Zip" />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
                    <Button type="submit" className="bg-teal-700" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin"/> : "Create Vendor"}
                    </Button>
                </div>
            </form>
        </div>
    );
}

function VendorProfile({ vendor, onBack }) {
    const queryClient = useQueryClient();
    const [isEditOpen, setIsEditOpen] = useState(false);
    
    // Invoices Query
    const { data: invoices } = useQuery({
        queryKey: ['invoices', vendor.id],
        queryFn: () => base44.entities.VendorInvoice.filter({ vendor_id: vendor.id }),
        initialData: []
    });

    // Update Vendor Mutation
    const updateVendor = useMutation({
        mutationFn: (data) => base44.entities.Vendor.update(vendor.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
            toast.success("Vendor updated");
        }
    });

    const handleDocUpload = (doc) => {
        const current = vendor.documents || [];
        updateVendor.mutate({ documents: [...current, doc] });
    };

    const handleDeleteDoc = (doc) => {
        const current = vendor.documents || [];
        const filtered = current.filter(d => d.file_uri !== doc.file_uri);
        updateVendor.mutate({ documents: filtered });
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4">
            <div className="flex items-center gap-4">
                <Button onClick={onBack} className="bg-teal-700 hover:bg-teal-800 text-white">Back to List</Button>
                <h1 className="text-2xl font-bold">{vendor.company_name} <span className="text-stone-400 text-lg font-normal">#{vendor.vendor_id}</span></h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Info Card */}
                <Card className="md:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle>Details</CardTitle>
                        <Button size="sm" onClick={() => setIsEditOpen(true)} className="bg-teal-700 hover:bg-teal-800 text-white">
                            <Edit className="w-4 h-4 text-white" />
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm pt-4">
                        <div>
                            <Label className="text-stone-500">Contact</Label>
                            <p>{vendor.contact_name}</p>
                            <p>{vendor.email}</p>
                            <p>{vendor.phone}</p>
                        </div>
                        <div>
                            <Label className="text-stone-500">Address</Label>
                            <p>{vendor.address_street}</p>
                            <p>{vendor.address_city}, {vendor.address_state} {vendor.address_zip}</p>
                        </div>
                        <div>
                            <Label className="text-stone-500">Financials</Label>
                            <p>Tax ID: {vendor.tax_id || "N/A"}</p>
                            <p>Terms: {vendor.payment_terms}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabs for Finance & Docs */}
                <Card className="md:col-span-2">
                    <Tabs defaultValue="financials">
                        <CardHeader className="pb-0">
                            <TabsList className="bg-transparent p-0 gap-2">
                                <TabsTrigger value="financials" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white bg-white text-teal-700 shadow-sm">Invoices & Payments</TabsTrigger>
                                <TabsTrigger value="documents" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white bg-white text-teal-700 shadow-sm">Documents</TabsTrigger>
                            </TabsList>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <TabsContent value="financials">
                                <InvoiceManager vendorId={vendor.id} invoices={invoices} />
                            </TabsContent>
                            <TabsContent value="documents" className="space-y-4">
                                <DocumentUploader onUploadComplete={handleDocUpload} />
                                <DocumentList documents={vendor.documents} onDelete={handleDeleteDoc} />
                            </TabsContent>
                        </CardContent>
                    </Tabs>
                </Card>
            </div>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-2xl">
                    <VendorEditForm vendor={vendor} onSuccess={() => setIsEditOpen(false)} />
                </DialogContent>
            </Dialog>
        </div>
    );
}

function VendorEditForm({ vendor, onSuccess }) {
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            await base44.entities.Vendor.update(vendor.id, data);
            toast.success(`Vendor updated!`);
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
            onSuccess();
        } catch (err) {
            toast.error("Failed to update: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
                Edit Vendor Details
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Company Name *</Label>
                        <Input name="company_name" required defaultValue={vendor.company_name} />
                    </div>
                    <div className="space-y-2">
                        <Label>Tax ID / EIN</Label>
                        <Input name="tax_id" defaultValue={vendor.tax_id} />
                    </div>
                    <div className="space-y-2">
                        <Label>Contact Name</Label>
                        <Input name="contact_name" defaultValue={vendor.contact_name} />
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input name="email" type="email" defaultValue={vendor.email} />
                    </div>
                    <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input name="phone" defaultValue={vendor.phone} />
                    </div>
                    <div className="space-y-2">
                        <Label>Payment Terms</Label>
                        <Select name="payment_terms" defaultValue={vendor.payment_terms || "Net 30"}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                                <SelectItem value="Net 15">Net 15</SelectItem>
                                <SelectItem value="Net 30">Net 30</SelectItem>
                                <SelectItem value="Net 60">Net 60</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                        <Label>Address</Label>
                        <Input name="address_street" placeholder="Street" className="mb-2" defaultValue={vendor.address_street} />
                        <div className="grid grid-cols-3 gap-2">
                            <Input name="address_city" placeholder="City" defaultValue={vendor.address_city} />
                            <Input name="address_state" placeholder="State" defaultValue={vendor.address_state} />
                            <Input name="address_zip" placeholder="Zip" defaultValue={vendor.address_zip} />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
                    <Button type="submit" className="bg-teal-700" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin"/> : "Save Changes"}
                    </Button>
                </div>
            </form>
        </div>
    );
}

function InvoiceManager({ vendorId, invoices }) {
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    // Refresh Overdue Status on Mount
    React.useEffect(() => {
        base44.functions.invoke('checkOverdueInvoices')
            .then(() => queryClient.invalidateQueries({ queryKey: ['invoices', vendorId] }))
            .catch(console.error);
    }, []);

    const addInvoice = useMutation({
        mutationFn: (data) => base44.entities.VendorInvoice.create({ ...data, vendor_id: vendorId, status: 'Pending' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices', vendorId] });
            setIsAddOpen(false);
            toast.success("Invoice added");
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
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold flex items-center gap-2">
                    <DollarSign className="w-4 h-4"/> Financial History
                </h3>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild><Button size="sm" className="bg-teal-700 hover:bg-teal-800 text-white">Add Invoice</Button></DialogTrigger>
                    <DialogContent>
                        <h3 className="font-bold mb-4">Record New Invoice</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Invoice #</Label>
                                    <Input name="invoice_number" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Amount Owed</Label>
                                    <Input name="amount_owed" type="number" step="0.01" min="0" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Invoice Date</Label>
                                    <Input name="invoice_date" type="date" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Due Date</Label>
                                    <Input name="due_date" type="date" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Input name="notes" />
                            </div>
                            <Button type="submit" className="w-full">Save Invoice</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-stone-50">
                            <TableHead>Date</TableHead>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Paid</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="text-center text-stone-500">No invoices recorded.</TableCell></TableRow>
                        ) : (
                            invoices.map(inv => {
                                const owed = parseFloat(inv.amount_owed || 0);
                                const paid = parseFloat(inv.amount_paid || 0);
                                const balance = owed - paid;

                                return (
                                    <React.Fragment key={inv.id}>
                                        <TableRow 
                                            className="cursor-pointer hover:bg-stone-50" 
                                            onClick={() => setSelectedInvoice(selectedInvoice === inv.id ? null : inv.id)}
                                        >
                                            <TableCell>{format(new Date(inv.invoice_date), 'MMM d, yyyy')}</TableCell>
                                            <TableCell className="font-mono">{inv.invoice_number}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`
                                                    ${inv.status === 'Paid' ? 'bg-green-100 text-green-800 border-green-200' : ''}
                                                    ${inv.status === 'Overdue' ? 'bg-red-100 text-red-800 border-red-200' : ''}
                                                    ${inv.status === 'Partial' ? 'bg-amber-100 text-amber-800 border-amber-200' : ''}
                                                    ${inv.status === 'Pending' ? 'bg-yellow-300 text-black border-yellow-400' : ''}
                                                `}>
                                                    {inv.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">${owed.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">${paid.toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-bold text-stone-900">${balance.toFixed(2)}</TableCell>
                                            <TableCell>
                                                <Button size="icon" className="h-6 w-6 bg-teal-700 hover:bg-teal-800 text-white">
                                                    {selectedInvoice === inv.id ? '-' : '+'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                        {selectedInvoice === inv.id && (
                                            <TableRow className="bg-stone-50/50 hover:bg-stone-50/50">
                                                <TableCell colSpan={7} className="p-4">
                                                    <InvoiceDetailView invoice={inv} onUpdate={(data) => updateInvoice.mutate({ id: inv.id, data })} />
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function InvoiceDetailView({ invoice, onUpdate }) {
    const [uploading, setUploading] = useState(false);
    
    // Payments Logic
    const handleAddPayment = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const amount = parseFloat(formData.get('amount'));

        if (amount < 0) {
            if (!window.confirm("You have entered a negative payment amount. Is this intended?")) return;
        }

        const newPayment = {
            id: crypto.randomUUID(),
            payment_date: formData.get('payment_date'),
            amount: amount,
            method: formData.get('method'),
            reference_number: formData.get('reference_number'),
            notes: formData.get('notes')
        };

        const currentPayments = invoice.payments || [];
        const updatedPayments = [...currentPayments, newPayment];
        
        // Recalculate totals
        const newTotalPaid = updatedPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const owed = parseFloat(invoice.amount_owed || 0);
        
        let newStatus = invoice.status;
        if (newTotalPaid >= owed) newStatus = 'Paid';
        else if (newTotalPaid > 0) newStatus = 'Partial';
        else if (invoice.status !== 'Overdue') newStatus = 'Pending'; // Keep overdue if 0 paid and overdue

        onUpdate({
            payments: updatedPayments,
            amount_paid: newTotalPaid,
            status: newStatus
        });
        
        e.target.reset();
    };

    // Document Logic
    const handleInvoiceUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
            const newDoc = {
                name: file.name,
                file_uri: file_uri,
                uploaded_at: new Date().toISOString()
            };
            const currentDocs = invoice.documents || [];
            onUpdate({ documents: [...currentDocs, newDoc] });
            toast.success("Document attached");
        } catch (err) {
            toast.error("Upload failed: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleViewDoc = async (doc) => {
        try {
            const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: doc.file_uri });
            window.open(signed_url, '_blank');
        } catch (err) {
            toast.error("Failed to open document");
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payments Section */}
            <div className="space-y-4">
                <h4 className="font-semibold text-sm text-stone-700">Payment History</h4>
                
                {/* Add Payment Form */}
                <form onSubmit={handleAddPayment} className="bg-white p-3 border rounded-md space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <Input name="payment_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="h-8 text-sm" />
                        <Input name="amount" type="number" step="0.01" placeholder="Amount" required className="h-8 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Select name="method" defaultValue="Check">
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Check">Check</SelectItem>
                                <SelectItem value="Credit Card">Credit Card</SelectItem>
                                <SelectItem value="ACH">ACH</SelectItem>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input name="reference_number" placeholder="Ref/Check #" className="h-8 text-sm" />
                    </div>
                    <Input name="notes" placeholder="Notes..." className="h-8 text-sm" />
                    <Button type="submit" size="sm" className="w-full h-7 bg-teal-700 hover:bg-teal-800 text-white">Record Payment</Button>
                </form>

                {/* Payments List */}
                <div className="space-y-2">
                    {(invoice.payments || []).length === 0 ? (
                        <p className="text-xs text-stone-500 italic">No payments recorded.</p>
                    ) : (
                        (invoice.payments || []).map((p, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm p-2 bg-white border rounded">
                                <div>
                                    <div className="font-medium">${p.amount?.toFixed(2)} <span className="text-stone-400 font-normal">via {p.method}</span></div>
                                    <div className="text-xs text-stone-500">{p.payment_date} • Ref: {p.reference_number || 'N/A'}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Documents Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-sm text-stone-700">Invoice Documents</h4>
                    <div className="relative">
                        <input 
                            type="file" 
                            id={`upload-${invoice.id}`} 
                            className="hidden" 
                            onChange={handleInvoiceUpload}
                            disabled={uploading}
                        />
                        <Button 
                            size="sm" 
                            className="h-7 bg-teal-700 hover:bg-teal-800 text-white" 
                            onClick={() => document.getElementById(`upload-${invoice.id}`).click()}
                            disabled={uploading}
                        >
                            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3 mr-2" />}
                            Upload
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    {(invoice.documents || []).length === 0 ? (
                        <p className="text-xs text-stone-500 italic">No documents attached.</p>
                    ) : (
                        (invoice.documents || []).map((doc, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm p-2 bg-white border rounded">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <FileText className="w-4 h-4 text-stone-400 flex-shrink-0" />
                                    <span className="truncate">{doc.name}</span>
                                </div>
                                <Button size="sm" className="h-6 px-2 bg-teal-700 hover:bg-teal-800 text-white" onClick={() => handleViewDoc(doc)}>View</Button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}