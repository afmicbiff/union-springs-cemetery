import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, User, CheckSquare } from 'lucide-react';
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import DocumentUploader from "@/components/documents/DocumentUploader";
import DocumentList from "@/components/documents/DocumentList";

export default function EmployeeDocumentManager() {
    const queryClient = useQueryClient();
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

    // Fetch Employees
    const { data: employees } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.list({ sort: { last_name: 1 } }),
        initialData: [],
    });

    const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

    // Update Employee Mutation
    const updateEmployeeMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success("Employee record updated");
        },
        onError: (err) => toast.error("Failed to update: " + err.message)
    });

    const handleUploadComplete = async (newDoc) => {
        if (!selectedEmployee) return;

        const currentDocs = selectedEmployee.documents || [];
        const currentChecklist = selectedEmployee.checklist || {};
        
        // Auto-update checklist
        const updatedChecklist = { ...currentChecklist };
        // Check if the uploaded type matches any checklist item key
        const checklistKeys = Object.keys(currentChecklist);
        if (checklistKeys.includes(newDoc.type)) {
             updatedChecklist[newDoc.type] = true;
        } else if (["Form I-9", "Form W-4", "Form L-4", "Offer Letter", "Minor Cert"].includes(newDoc.type)) {
             updatedChecklist[newDoc.type] = true;
        }

        updateEmployeeMutation.mutate({
            id: selectedEmployeeId,
            data: {
                ...selectedEmployee,
                documents: [...currentDocs, newDoc],
                checklist: updatedChecklist
            }
        });
        
        // If it was a checklist item, notify user
        if (["Form I-9", "Form W-4", "Form L-4", "Offer Letter", "Minor Cert"].includes(newDoc.type)) {
            toast.success(`Marked '${newDoc.type}' as complete`);
        }
    };

    const handleDeleteDoc = (docToDelete) => {
        if (!selectedEmployee) return;
        // Match by uploaded_at and name to be unique enough
        const currentDocs = selectedEmployee.documents || [];
        const newDocs = currentDocs.filter(d => 
            !(d.name === docToDelete.name && d.uploaded_at === docToDelete.uploaded_at)
        );
        
        updateEmployeeMutation.mutate({
            id: selectedEmployeeId,
            data: { ...selectedEmployee, documents: newDocs }
        });
        toast.success("Document removed");
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
                    Securely upload and manage employee files.
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
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-stone-900">{selectedEmployee.first_name} {selectedEmployee.last_name}</h3>
                            <Link to={`${createPageUrl('EmployeeProfile')}?id=${selectedEmployee.id}`}>
                                <Button variant="outline" size="sm" className="gap-2 text-teal-700 border-teal-200 bg-teal-50 hover:bg-teal-100">
                                    <User className="w-4 h-4" /> View Full Profile
                                </Button>
                            </Link>
                        </div>

                        {/* New Robust Components */}
                        <DocumentUploader onUploadComplete={handleUploadComplete} />
                        
                        <div className="space-y-2">
                            <h4 className="font-semibold text-stone-800 text-sm">Attached Files</h4>
                            <DocumentList 
                                documents={selectedEmployee.documents} 
                                onDelete={handleDeleteDoc} 
                            />
                        </div>

                        {/* Summary Checklist */}
                        <div className="space-y-2 pt-4 border-t">
                            <h4 className="font-semibold text-stone-800 text-sm flex items-center gap-2">
                                <CheckSquare className="w-4 h-4 text-teal-600" /> Onboarding Checklist
                            </h4>
                            <div className="bg-stone-50 rounded-md border overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-stone-100 text-stone-600">
                                        <tr>
                                            <th className="p-3 w-10">Done</th>
                                            <th className="p-3">Item</th>
                                            <th className="p-3">Type</th>
                                            <th className="p-3">Required</th>
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
                    <div className="text-center py-12 text-stone-400 bg-stone-50 rounded border border-dashed">
                        <User className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>Select an employee to manage their secure documents.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}