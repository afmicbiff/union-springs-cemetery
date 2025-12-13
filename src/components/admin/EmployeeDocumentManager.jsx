import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, File, Loader2, Trash2, ExternalLink, CheckSquare, Square, User } from 'lucide-react';
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function EmployeeDocumentManager() {
    const queryClient = useQueryClient();
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [fileType, setFileType] = useState("Other");

    // Fetch Employees
    const { data: employees } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.list({ sort: { last_name: 1 } }),
        initialData: [],
    });

    const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

    // Update Employee Mutation (for adding/removing documents)
    const updateEmployeeMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success("Employee record updated");
            setUploading(false);
        },
        onError: (err) => toast.error("Failed to update: " + err.message)
    });

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedEmployee) return;

        setUploading(true);
        try {
            // 1. Upload file
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            
            // 2. Add to employee documents list
            const newDoc = {
                name: file.name,
                url: file_url,
                type: fileType,
                uploaded_at: new Date().toISOString()
            };

            const currentDocs = selectedEmployee.documents || [];
            const currentChecklist = selectedEmployee.checklist || {};
            
            // Auto-update checklist
            const updatedChecklist = { ...currentChecklist };
            if (fileType !== "Other") {
                updatedChecklist[fileType] = true;
            }
            
            updateEmployeeMutation.mutate({
                id: selectedEmployeeId,
                data: {
                    ...selectedEmployee,
                    documents: [...currentDocs, newDoc],
                    checklist: updatedChecklist
                }
            });
            
            if (fileType !== "Other") {
                toast.success(`Marked '${fileType}' as complete`);
            }

        } catch (error) {
            console.error(error);
            toast.error("Upload failed: " + error.message);
            setUploading(false);
        }
    };

    const handleDeleteDoc = (docIndex) => {
        if (!selectedEmployee) return;
        const currentDocs = selectedEmployee.documents || [];
        const newDocs = currentDocs.filter((_, idx) => idx !== docIndex);
        
        updateEmployeeMutation.mutate({
            id: selectedEmployeeId,
            data: { ...selectedEmployee, documents: newDocs }
        });
    };

    const handleChecklistToggle = (item) => {
        if (!selectedEmployee) return;
        const currentChecklist = selectedEmployee.checklist || {};
        
        updateEmployeeMutation.mutate({
            id: selectedEmployeeId,
            data: { 
                ...selectedEmployee, 
                checklist: {
                    ...currentChecklist,
                    [item]: !currentChecklist[item]
                }
            }
        });
    };

    const docTypes = ["Form I-9", "Form W-4", "Form L-4", "Offer Letter", "Minor Cert", "Other"];
    
    const checklistItems = [
        { name: "Form I-9", mandatory: true, type: "Federal" },
        { name: "Form W-4", mandatory: true, type: "Federal" },
        { name: "Form L-4", mandatory: true, type: "State" },
        { name: "Offer Letter", mandatory: true, type: "Notice" },
        { name: "New Hire Reporting", mandatory: true, type: "Task" },
        { name: "Minor Cert", mandatory: false, type: "Permit" }
    ];

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-teal-600"/> Employee Documents
                </CardTitle>
                <CardDescription>
                    Upload and manage mandatory forms for specific employees.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                
                {/* Employee Selector */}
                <div className="space-y-2">
                    <Label>Select Employee</Label>
                    <Select onValueChange={setSelectedEmployeeId} value={selectedEmployeeId || ""}>
                        <SelectTrigger>
                            <SelectValue placeholder="Search employee..." />
                        </SelectTrigger>
                        <SelectContent>
                            {employees.map(emp => (
                                <SelectItem key={emp.id} value={emp.id}>
                                    {emp.last_name}, {emp.first_name} (ID: {emp.employee_number})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selectedEmployee ? (
                    <div className="space-y-6 animate-in fade-in-50">
                        {/* Profile Link */}
                        <div className="flex justify-end">
                            <Link to={`${createPageUrl('EmployeeProfile')}?id=${selectedEmployee.id}`}>
                                <Button variant="outline" size="sm" className="gap-2 text-teal-700 border-teal-200 bg-teal-50 hover:bg-teal-100">
                                    <User className="w-4 h-4" /> View Full Profile
                                </Button>
                            </Link>
                        </div>

                        {/* Upload Section */}
                        <div className="bg-stone-50 p-4 rounded-md border border-stone-200 space-y-4">
                            <h4 className="font-semibold text-stone-800 text-sm">Upload New Document</h4>
                            <div className="flex gap-2">
                                <Select value={fileType} onValueChange={setFileType}>
                                    <SelectTrigger className="w-[180px] bg-white">
                                        <SelectValue placeholder="Doc Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {docTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <div className="relative flex-grow">
                                    <Input 
                                        type="file" 
                                        onChange={handleFileUpload}
                                        disabled={uploading}
                                        className="bg-white"
                                    />
                                    {uploading && (
                                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                            <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Document List */}
                        <div className="space-y-2">
                            <h4 className="font-semibold text-stone-800 text-sm flex justify-between">
                                <span>Attached Files</span>
                                <span className="text-stone-500 font-normal">{selectedEmployee.documents?.length || 0} files</span>
                            </h4>
                            
                            {(!selectedEmployee.documents || selectedEmployee.documents.length === 0) && (
                                <p className="text-sm text-stone-500 italic">No documents uploaded yet.</p>
                            )}

                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {selectedEmployee.documents?.map((doc, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded-sm hover:shadow-sm transition-shadow">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="bg-teal-50 p-2 rounded">
                                                <File className="w-4 h-4 text-teal-700" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-stone-900 truncate">{doc.name}</p>
                                                <div className="flex gap-2 text-xs text-stone-500">
                                                    <Badge variant="outline" className="text-[10px] h-5 px-1">{doc.type}</Badge>
                                                    <span>Uploaded: {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString() : 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-stone-400 hover:text-teal-700" asChild>
                                                <a href={doc.url} target="_blank" rel="noreferrer">
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            </Button>
                                            <Button 
                                                size="icon" 
                                                variant="ghost" 
                                                className="h-8 w-8 text-stone-400 hover:text-red-700"
                                                onClick={() => handleDeleteDoc(idx)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Summary Checklist */}
                        <div className="space-y-2 pt-4 border-t">
                            <h4 className="font-semibold text-stone-800 text-sm">Summary Checklist</h4>
                            <p className="text-xs text-stone-500 mb-2">Check off mandatory forms as they are verified/uploaded.</p>
                            
                            <div className="bg-stone-50 rounded-md border overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-stone-100 text-stone-600">
                                        <tr>
                                            <th className="p-3 w-10">Done</th>
                                            <th className="p-3">Document</th>
                                            <th className="p-3">Type</th>
                                            <th className="p-3">Mandatory?</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {checklistItems.map((item) => (
                                            <tr key={item.name} className="hover:bg-stone-100/50">
                                                <td className="p-3">
                                                    <Checkbox 
                                                        checked={selectedEmployee.checklist?.[item.name] || false}
                                                        onCheckedChange={() => handleChecklistToggle(item.name)}
                                                    />
                                                </td>
                                                <td className="p-3 font-medium">{item.name}</td>
                                                <td className="p-3 text-stone-500">{item.type}</td>
                                                <td className="p-3">
                                                    {item.mandatory ? (
                                                        <span className="text-red-600 font-bold text-xs">Yes</span>
                                                    ) : (
                                                        <span className="text-stone-400 text-xs">Optional</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-stone-400 bg-stone-50 rounded border border-dashed">
                        Select an employee to manage documents
                    </div>
                )}
            </CardContent>
        </Card>
    );
}