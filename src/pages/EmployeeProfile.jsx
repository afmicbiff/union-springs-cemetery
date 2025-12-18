import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { 
    User, Mail, Phone, MapPin, Heart, 
    AlertTriangle, FileText, Edit, 
    ChevronLeft, Loader2, CheckSquare,
    Briefcase, GraduationCap, Building
} from 'lucide-react';
import { toast } from "sonner";
import EmployeeEditDialog from '@/components/admin/EmployeeEditDialog';
import DocumentUploader from '@/components/documents/DocumentUploader';
import DocumentList from '@/components/documents/DocumentList';
import TaskManager from "@/components/tasks/TaskManager";
import EmployeeSchedule from "@/components/employee/EmployeeSchedule";

export default function EmployeeProfile() {
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const queryClient = useQueryClient();
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isSendingReminder, setIsSendingReminder] = useState(false);

    const { data: currentUser, isLoading: isAuthLoading } = useQuery({
        queryKey: ['me'],
        queryFn: () => base44.auth.me().catch(() => null),
    });

    React.useEffect(() => {
        if (!isAuthLoading) {
            if (!currentUser) {
                base44.auth.redirectToLogin(window.location.pathname);
            } else if (currentUser.role !== 'admin') {
                window.location.href = '/';
            }
        }
    }, [currentUser, isAuthLoading]);

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
        onSuccess: (data) => {
            if (data) {
                queryClient.setQueryData(['employee', id], data);
            }
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
        onError: (err) => toast.error("Update failed: " + err.message)
    });

    const handleUploadComplete = async (newDoc) => {
        const currentDocs = employee.documents || [];
        const currentChecklist = employee.checklist || {};
        
        // Auto-update checklist
        const updatedChecklist = { ...currentChecklist };
        const checklistKeys = Object.keys(currentChecklist);
        
        if (checklistKeys.includes(newDoc.type) || 
           ["Form I-9", "Form W-4", "Form L-4", "Offer Letter", "New Hire Reporting", "Minor Cert"].includes(newDoc.type)) {
             updatedChecklist[newDoc.type] = true;
        }

        await updateMutation.mutateAsync({ 
            documents: [...currentDocs, newDoc],
            checklist: updatedChecklist
        });
        
        if (updatedChecklist[newDoc.type]) {
            toast.success(`Marked '${newDoc.type}' as complete`);
        }
    };

    const handleDeleteDoc = (docToDelete) => {
        const currentDocs = employee.documents || [];
        const newDocs = currentDocs.filter(d => 
             !(d.name === docToDelete.name && d.uploaded_at === docToDelete.uploaded_at)
        );
        updateMutation.mutate({ documents: newDocs });
        toast.success("Document removed");
    };

    const handleChecklistToggle = (item, checked) => {
        const currentChecklist = employee.checklist || {};
        const updatedChecklist = { ...currentChecklist, [item]: checked };

        // Optimistically update UI
        queryClient.setQueryData(['employee', id], (old) => ({
             ...old,
             checklist: updatedChecklist
        }));

        updateMutation.mutate({ 
            checklist: updatedChecklist
        }, {
            onError: () => {
                queryClient.invalidateQueries(['employee', id]);
            }
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

    if (isAuthLoading || !currentUser || currentUser.role !== 'admin') return <div className="flex justify-center items-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>;

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

    return (
        <div className="min-h-screen bg-stone-100 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header Navigation */}
                <div className="flex items-center gap-4 mb-6">
                    <Link to={createPageUrl('Admin')}>
                        <Button size="sm" className="gap-2 bg-teal-700 hover:bg-teal-800 text-white">
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
                                <AvatarFallback className="text-4xl bg-teal-700 text-white">
                                    {employee.first_name?.[0]}{employee.last_name?.[0]}
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
                                {employee.status === 'inactive' ? (
                                    <Badge variant="outline" className="bg-stone-100 text-stone-500 border-stone-200">
                                        Inactive
                                    </Badge>
                                ) : (
                                    <Badge className="bg-teal-700 text-white hover:bg-teal-800 border-none">
                                        Active
                                    </Badge>
                                )}
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

                            <Button className="w-full mt-4 gap-2 bg-teal-700 hover:bg-teal-800 text-white" onClick={() => setIsEditOpen(true)}>
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
                            <TabsList className="w-full justify-start bg-white border p-1 h-auto flex-wrap gap-1">
                                <TabsTrigger value="details" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white">Personal Details</TabsTrigger>
                                <TabsTrigger value="professional" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white">Professional</TabsTrigger>
                                <TabsTrigger value="schedule" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white">Schedule</TabsTrigger>
                                <TabsTrigger value="tasks" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white">Tasks</TabsTrigger>
                                <TabsTrigger value="documents" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white">Documents</TabsTrigger>
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

                            {/* Professional Tab */}
                            <TabsContent value="professional">
                                <Card className="shadow-lg">
                                    <CardHeader>
                                        <CardTitle>Professional Profile</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                                                    <Building className="w-4 h-4 text-teal-600" /> Role & Department
                                                </h3>
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <span className="text-stone-500">Department:</span>
                                                    <span>{employee.department || "Unassigned"}</span>
                                                    <span className="text-stone-500">Job Title:</span>
                                                    <span>{employee.job_title || "N/A"}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                                                    <Briefcase className="w-4 h-4 text-teal-600" /> Skills
                                                </h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {employee.skills && employee.skills.length > 0 ? (
                                                        employee.skills.map((skill, idx) => (
                                                            <Badge key={idx} variant="secondary">{skill}</Badge>
                                                        ))
                                                    ) : (
                                                        <span className="text-sm text-stone-500 italic">No skills listed</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-4 md:col-span-2">
                                                <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                                                    <GraduationCap className="w-4 h-4 text-teal-600" /> Professional Development
                                                </h3>
                                                <div className="space-y-2">
                                                    <p className="text-sm font-medium text-stone-700">Classes & Certifications in Progress:</p>
                                                    {employee.classes_taking && employee.classes_taking.length > 0 ? (
                                                        <ul className="list-disc list-inside text-sm text-stone-600">
                                                            {employee.classes_taking.map((item, idx) => (
                                                                <li key={idx}>{item}</li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-sm text-stone-500 italic">No active training</p>
                                                    )}
                                                </div>
                                            </div>

                                            {employee.bio && (
                                                <div className="space-y-4 md:col-span-2 border-t pt-4">
                                                    <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-teal-600" /> Bio
                                                    </h3>
                                                    <p className="text-sm text-stone-600 leading-relaxed bg-stone-50 p-4 rounded-md">
                                                        {employee.bio}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="schedule">
                                <EmployeeSchedule employeeId={employee.id} />
                            </TabsContent>

                            <TabsContent value="tasks">
                                <TaskManager isAdmin={true} currentEmployeeId={employee.id} />
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
                                                                    checked={!!employee.checklist?.[item.name]}
                                                                    onCheckedChange={(checked) => handleChecklistToggle(item.name, checked)}
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
                                        {/* New Robust Uploader */}
                                        <DocumentUploader onUploadComplete={handleUploadComplete} />

                                        {/* New Robust List */}
                                        <div className="mt-4">
                                             <DocumentList 
                                                 documents={employee.documents} 
                                                 onDelete={handleDeleteDoc}
                                                 onUpdate={handleUploadComplete}
                                             />
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