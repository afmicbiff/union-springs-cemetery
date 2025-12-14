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
import { Building2, Plus, Loader2, FileText, DollarSign, Upload, Search } from 'lucide-react';
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
                                            <Button variant="ghost" size="sm" onClick={() => onSelect(v)}>View</Button>
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
                <Button variant="outline" onClick={onBack}>Back to List</Button>
                <h1 className="text-2xl font-bold">{vendor.company_name} <span className="text-stone-400 text-lg font-normal">#{vendor.vendor_id}</span></h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Info Card */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
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
                            <TabsList>
                                <TabsTrigger value="financials">Invoices & Payments</TabsTrigger>
                                <TabsTrigger value="documents">Documents</TabsTrigger>
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
        </div>
    );
}

function InvoiceManager({ vendorId, invoices }) {
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);

    const addInvoice = useMutation({
        mutationFn: (data) => base44.entities.VendorInvoice.create({ ...data, vendor_id: vendorId }),
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
        addInvoice.mutate(data);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold flex items-center gap-2">
                    <DollarSign className="w-4 h-4"/> Financial History
                </h3>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild><Button size="sm">Add Invoice</Button></DialogTrigger>
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
                                    <Input name="amount_owed" type="number" step="0.01" required />
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
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center text-stone-500">No invoices recorded.</TableCell></TableRow>
                        ) : (
                            invoices.map(inv => {
                                const owed = parseFloat(inv.amount_owed || 0);
                                const paid = parseFloat(inv.amount_paid || 0);
                                const balance = owed - paid;

                                return (
                                    <TableRow key={inv.id}>
                                        <TableCell>{format(new Date(inv.invoice_date), 'MMM d, yyyy')}</TableCell>
                                        <TableCell className="font-mono">{inv.invoice_number}</TableCell>
                                        <TableCell>
                                            <Badge variant={balance <= 0 ? "default" : "secondary"} className={balance <= 0 ? "bg-green-600" : ""}>
                                                {balance <= 0 ? "Paid" : "Pending"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">${owed.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">${paid.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-bold text-stone-900">${balance.toFixed(2)}</TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}