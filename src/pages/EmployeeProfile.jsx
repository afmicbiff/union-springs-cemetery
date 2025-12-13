import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { 
    User, Mail, Phone, MapPin, Calendar, CreditCard, Heart, 
    Baby, AlertTriangle, FileText, Download, Trash2, Edit, 
    ChevronLeft, Loader2, Upload, ExternalLink, CheckSquare
} from 'lucide-react';
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EmployeeEditDialog from '@/components/admin/EmployeeEditDialog';

export default function EmployeeProfile() {
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const queryClient = useQueryClient();
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSendingReminder, setIsSendingReminder] = useState(false);
    const [uploadType, setUploadType] = useState("Other");

    const { data: employee, isLoading, error } = useQuery({
        queryKey: ['employee', id],
        queryFn: async () => {
            if (!id) return null;
            const res = await base44.entities.Employee.filter({ id });
            return res?.[0] || null;
        },
        enabled: !!id
    });

    const updateMutation = useMutation({
        mutationFn: (data) => base44.entities.Employee.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employee', id] });
            queryClient.invalidateQueries({ queryKey: ['employees'] }); // Update lists too
            toast.success("Updated successfully");
            setIsUploading(false);
        },
        onError: (err) => toast.error("Update failed: " + err.message)
    });

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setIsUploading(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            const newDoc = {
                name: file.name,
                url: file_url,
                type: uploadType,
                uploaded_at: new Date().toISOString()
            };
            
            const currentDocs = employee.documents || [];
            const currentChecklist = employee.checklist || {};
            
            // Auto-update checklist if uploaded type matches a checklist item
            const updatedChecklist = { ...currentChecklist };
            if (uploadType !== "Other") {
                updatedChecklist[uploadType] = true;
            }

            updateMutation.mutate({ 
                documents: [...currentDocs, newDoc],
                checklist: updatedChecklist
            });
            
            if (uploadType !== "Other") {
                toast.success(`Marked '${uploadType}' as complete`);
            }
        } catch (err) {
            toast.error("Upload error: " + err.message);
            setIsUploading(false);
        }
    };

    const handleDeleteDoc = (idx) => {
        const newDocs = [...(employee.documents || [])];
        newDocs.splice(idx, 1);
        updateMutation.mutate({ documents: newDocs });
    };

    const handleChecklistToggle = (item) => {
        const currentChecklist = employee.checklist || {};
        updateMutation.mutate({ 
            checklist: { ...currentChecklist, [item]: !currentChecklist[item] }
        });
    };

    const sendReminder = async () => {
        if (!employee || !employee.email) {
            toast.error("Employee has no email address");
            return;
        }
        
        setIsSendingReminder(true);
        try {
            const { data } = await base44.functions.invoke('sendOnboardingReminder', { employeeId: employee.id });
            if (data.error) throw new Error(data.error);
            
            if (data.sent) {
                toast.success(data.message);
            } else {
                toast.info(data.message);
            }
        } catch (err) {
            toast.error("Failed to send reminder: " + err.message);
        } finally {
            setIsSendingReminder(false);
        }
    };

    if (isLoading) return <div className="flex justify-center items-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>;
    if (error || !employee) return <div className="p-8 text-center text-red-500">Employee not found or error loading profile.</div>;

    const checklistItems = [
        { name: "Form I-9", mandatory: true, type: "Federal" },
        { name: "Form W-4", mandatory: true, type: "Federal" },
        { name: "Form L-4", mandatory: true, type: "State" },
        { name: "Offer Letter", mandatory: true, type: "Notice" },
        { name: "New Hire Reporting", mandatory: true, type: "Task" },
        { name: "Minor Cert", mandatory: false, type: "Permit" }
    ];

    const docTypes = ["Form I-9", "Form W-4", "Form L-4", "Offer Letter", "Minor Cert", "Other"];

    return (
        <div className="min-h-screen bg-stone-100 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header Navigation */}
                <div className="flex items-center gap-4 mb-6">
                    <Link to={createPageUrl('Admin')}>
                        <Button variant="outline" size="sm" className="gap-2">
                            <ChevronLeft className="w-4 h-4" /> Back to Admin
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-serif font-bold text-stone-900">Employee Profile</h1>
                </div>

                {/* Main Profile Card */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: ID Card style info */}
                    <Card className="lg:col-span-1 h-fit shadow-lg border-0">
                        <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
                            <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                                <AvatarFallback className="text-4xl bg-teal-100 text-teal-800">
                                    {employee.first_name[0]}{employee.last_name[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h2 className="text-2xl font-bold text-stone-900">{employee.first_name} {employee.last_name}</h2>
                                <p className="text-stone-500 font-mono text-sm">ID: {employee.employee_number}</p>
                            </div>
                            
                            <div className="flex gap-2 flex-wrap justify-center">
                                <Badge variant="secondary" className="bg-teal-100 text-teal-800 hover:bg-teal-200">
                                    {employee.employment_type}
                                </Badge>
                                <Badge variant="outline" className="text-stone-600">
                                    Active
                                </Badge>
                            </div>

                            <div className="w-full border-t pt-4 text-left space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail className="w-4 h-4 text-stone-400" />
                                    <span className="truncate">{employee.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Phone className="w-4 h-4 text-stone-400" />
                                    <span>{employee.phone_primary}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <MapPin className="w-4 h-4 text-stone-400" />
                                    <span className="line-clamp-2">{employee.address_street}, {employee.address_state} {employee.address_zip}</span>
                                </div>
                            </div>

                            <Button className="w-full mt-4 gap-2" onClick={() => setIsEditOpen(true)}>
                                <Edit className="w-4 h-4" /> Edit Profile
                            </Button>
                            
                            <Button 
                                variant="outline" 
                                className="w-full mt-2 gap-2 text-stone-600" 
                                onClick={sendReminder}
                                disabled={isSendingReminder}
                            >
                                {isSendingReminder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                Send Reminder
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Right Column: Details Tabs */}
                    <div className="lg:col-span-2 space-y-6">
                        <Tabs defaultValue="details" className="w-full">
                            <TabsList className="w-full justify-start bg-white border p-1 h-auto flex-wrap">
                                <TabsTrigger value="details" className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700">Personal Details</TabsTrigger>
                                <TabsTrigger value="documents" className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700">Documents & Checklist</TabsTrigger>
                            </TabsList>
                            
                            {/* Personal Details Tab */}
                            <TabsContent value="details">
                                <Card className="shadow-lg">
                                    <CardHeader>
                                        <CardTitle>Detailed Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                                                    <User className="w-4 h-4 text-teal-600" /> Personal
                                                </h3>
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <span className="text-stone-500">Date of Birth:</span>
                                                    <span>{new Date(employee.date_of_birth).toLocaleDateString()}</span>
                                                    <span className="text-stone-500">SSN:</span>
                                                    <span className="font-mono">***-**-{employee.ssn?.slice(-4)}</span>
                                                    <span className="text-stone-500">Marital Status:</span>
                                                    <span>{employee.marital_status}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                                                    <Heart className="w-4 h-4 text-teal-600" /> Family
                                                </h3>
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <span className="text-stone-500">Spouse:</span>
                                                    <span>{employee.spouse_name || "N/A"}</span>
                                                    <span className="text-stone-500">Spouse Phone:</span>
                                                    <span>{employee.spouse_phone || "N/A"}</span>
                                                    <span className="text-stone-500">Children:</span>
                                                    <span className="col-span-2 text-stone-700 italic bg-stone-50 p-2 rounded block mt-1">
                                                        {employee.children_details || "No details provided"}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-4 md:col-span-2 border-t pt-4">
                                                <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                                                    <AlertTriangle className="w-4 h-4 text-red-600" /> Emergency Contact
                                                </h3>
                                                <div className="bg-red-50 border border-red-100 p-4 rounded-md grid md:grid-cols-3 gap-4 text-sm">
                                                    <div>
                                                        <span className="block text-red-800/60 text-xs uppercase font-bold">Name</span>
                                                        <span className="font-medium">{employee.emergency_contact_first_name} {employee.emergency_contact_last_name}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-red-800/60 text-xs uppercase font-bold">Relationship</span>
                                                        <span>{employee.emergency_contact_relationship}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-red-800/60 text-xs uppercase font-bold">Phone</span>
                                                        <span className="font-mono">{employee.emergency_contact_phone}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Documents & Checklist Tab */}
                            <TabsContent value="documents" className="space-y-6">
                                {/* Checklist */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <CheckSquare className="w-4 h-4 text-teal-600" /> Onboarding Checklist
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="bg-stone-50 rounded-md border overflow-hidden">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-stone-100 text-stone-600">
                                                    <tr>
                                                        <th className="p-3 w-10">Done</th>
                                                        <th className="p-3">Item</th>
                                                        <th className="p-3">Type</th>
                                                        <th className="p-3">Mandatory</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {checklistItems.map((item) => (
                                                        <tr key={item.name} className="hover:bg-stone-100/50">
                                                            <td className="p-3">
                                                                <Checkbox 
                                                                    checked={employee.checklist?.[item.name] || false}
                                                                    onCheckedChange={() => handleChecklistToggle(item.name)}
                                                                />
                                                            </td>
                                                            <td className="p-3 font-medium">{item.name}</td>
                                                            <td className="p-3 text-stone-500">{item.type}</td>
                                                            <td className="p-3">
                                                                {item.mandatory ? <span className="text-red-600 font-bold text-xs">Yes</span> : <span className="text-stone-400 text-xs">Optional</span>}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Documents */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-teal-600" /> Documents
                                            </CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Upload Control */}
                                        <div className="flex gap-2 items-center bg-stone-50 p-3 rounded border">
                                            <Select value={uploadType} onValueChange={setUploadType}>
                                                <SelectTrigger className="w-[140px] bg-white h-9"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {docTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <div className="relative flex-grow">
                                                <Input type="file" onChange={handleFileUpload} disabled={isUploading} className="bg-white h-9" />
                                                {isUploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-teal-600" /></div>}
                                            </div>
                                        </div>

                                        {/* List */}
                                        <div className="space-y-2">
                                            {(!employee.documents || employee.documents.length === 0) ? (
                                                <p className="text-stone-500 italic text-sm text-center py-4">No documents uploaded.</p>
                                            ) : (
                                                employee.documents.map((doc, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded hover:shadow-sm">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className="bg-teal-50 p-2 rounded"><FileText className="w-4 h-4 text-teal-700" /></div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-medium truncate">{doc.name}</p>
                                                                <div className="flex gap-2 text-xs text-stone-500">
                                                                    <Badge variant="outline" className="text-[10px] h-5 px-1">{doc.type}</Badge>
                                                                    <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-stone-400 hover:text-teal-700" asChild>
                                                                <a href={doc.url} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /></a>
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-stone-400 hover:text-red-700" onClick={() => handleDeleteDoc(idx)}>
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {isEditOpen && (
                <EmployeeEditDialog 
                    employee={employee} 
                    open={isEditOpen} 
                    onOpenChange={setIsEditOpen} 
                />
            )}
        </div>
    );
}