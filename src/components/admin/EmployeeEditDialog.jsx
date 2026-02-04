import React, { memo, useCallback } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Reusing schema from Onboarding, but making fields optional/flexible for edits if needed, 
// keeping strict validation for consistency.
const employeeSchema = z.object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    email: z.string().min(1, "Email is required").email("Invalid email"),
    secondary_email: z.string().email("Invalid email").optional().or(z.literal("")),
    address_street: z.string().min(1, "Street address is required"),
    address_state: z.string().min(1, "State is required"),
    address_zip: z.string().min(5, "Zip code required"),
    phone_primary: z.string().min(10, "Phone number required"),
    phone_secondary: z.string().optional(),
    date_of_birth: z.string().min(1, "DOB is required"),
    ssn: z.string().min(9, "SSN is required"),
    employment_type: z.string().min(1, "Role is required"),
    marital_status: z.string().min(1, "Marital status is required"),
    spouse_name: z.string().optional(),
    spouse_phone: z.string().optional(),
    children_details: z.string().optional(),
    emergency_contact_first_name: z.string().min(1, "Emergency contact name required"),
    emergency_contact_last_name: z.string().min(1, "Emergency contact name required"),
    emergency_contact_phone: z.string().min(10, "Emergency contact phone required"),
    emergency_contact_relationship: z.string().min(1, "Relationship required"),
    department: z.string().optional(),
    job_title: z.string().optional(),
    bio: z.string().optional(),
    skills: z.array(z.string()).optional(),
    classes_taking: z.array(z.string()).optional(),
}).superRefine((data, ctx) => {
    if (["Married", "Separated"].includes(data.marital_status)) {
        if (!data.spouse_name || data.spouse_name.trim() === "") {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["spouse_name"] });
        }
        if (!data.spouse_phone || data.spouse_phone.trim() === "") {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["spouse_phone"] });
        }
    }
});

const EmployeeEditDialog = memo(function EmployeeEditDialog({ employee, open, onOpenChange }) {
    const queryClient = useQueryClient();
    
    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
        resolver: zodResolver(employeeSchema),
        defaultValues: employee || {},
        mode: "onBlur" // Better mobile performance
    });

    const maritalStatus = watch("marital_status");

    const updateMutation = useMutation({
        mutationFn: async (data) => {
            await base44.entities.Employee.update(employee.id, data);
            try {
                const user = await base44.auth.me();
                await base44.entities.AuditLog.create({
                    action: 'update', entity_type: 'Employee', entity_id: employee.id,
                    details: `Employee ${employee.first_name} ${employee.last_name} updated.`,
                    metadata: data, performed_by: user.email, timestamp: new Date().toISOString()
                });
            } catch {}
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            queryClient.invalidateQueries({ queryKey: ['employee', employee.id] });
            toast.success("Updated");
            onOpenChange(false);
        },
        onError: (err) => toast.error("Failed: " + err.message)
    });

    const onSubmit = useCallback((data) => updateMutation.mutate(data), [updateMutation]);

    const getInputClass = useCallback((fieldName) => cn("h-8 text-sm", errors[fieldName] && "border-red-500 bg-red-50"), [errors]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Employee Profile</DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
                    {/* Role & Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Employment Role</Label>
                            <Select defaultValue={employee.employment_type} onValueChange={(v) => setValue("employment_type", v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Administrator">Administrator</SelectItem>
                                    <SelectItem value="Paid Employee">Paid Employee</SelectItem>
                                    <SelectItem value="Volunteer">Volunteer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                             <Label>Date of Birth</Label>
                             <Input type="date" {...register("date_of_birth")} />
                        </div>
                        <div className="space-y-2">
                             <Label>Department</Label>
                             <Select defaultValue={employee.department} onValueChange={(v) => setValue("department", v)}>
                                <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Administration">Administration</SelectItem>
                                    <SelectItem value="Groundskeeping">Groundskeeping</SelectItem>
                                    <SelectItem value="Sales">Sales</SelectItem>
                                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                                    <SelectItem value="Security">Security</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                             <Label>Job Title</Label>
                             <Input {...register("job_title")} placeholder="e.g. Senior Groundskeeper" />
                        </div>
                        <div className="space-y-2">
                            <Label>First Name</Label>
                            <Input {...register("first_name")} className={getInputClass("first_name")} />
                        </div>
                        <div className="space-y-2">
                            <Label>Last Name</Label>
                            <Input {...register("last_name")} className={getInputClass("last_name")} />
                        </div>
                        <div className="space-y-2">
                            <Label>SSN</Label>
                            <Input {...register("ssn")} className={getInputClass("ssn")} />
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold mb-3">Contact Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Email (Primary)</Label>
                                <Input {...register("email")} className={getInputClass("email")} />
                            </div>
                            <div className="space-y-2">
                                <Label>Email (Secondary)</Label>
                                <Input {...register("secondary_email")} />
                            </div>
                            <div className="space-y-2">
                                <Label>Phone (Primary)</Label>
                                <Input {...register("phone_primary")} className={getInputClass("phone_primary")} />
                            </div>
                            <div className="space-y-2">
                                <Label>Phone (Secondary)</Label>
                                <Input {...register("phone_secondary")} />
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div className="border-t pt-4">
                         <h4 className="text-sm font-semibold mb-3">Address</h4>
                         <div className="space-y-2">
                            <Label>Street</Label>
                            <Input {...register("address_street")} className={getInputClass("address_street")} />
                         </div>
                         <div className="grid grid-cols-2 gap-4 mt-2">
                            <div className="space-y-2">
                                <Label>State</Label>
                                <Input {...register("address_state")} className={getInputClass("address_state")} />
                            </div>
                            <div className="space-y-2">
                                <Label>Zip</Label>
                                <Input {...register("address_zip")} className={getInputClass("address_zip")} />
                            </div>
                         </div>
                    </div>

                    {/* Family */}
                    <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold mb-3">Family & Status</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Marital Status</Label>
                                <Select defaultValue={employee.marital_status} onValueChange={(v) => setValue("marital_status", v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Single">Single</SelectItem>
                                        <SelectItem value="Married">Married</SelectItem>
                                        <SelectItem value="Divorced">Divorced</SelectItem>
                                        <SelectItem value="Widowed">Widowed</SelectItem>
                                        <SelectItem value="Separated">Separated</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Spouse Name</Label>
                                <Input {...register("spouse_name")} disabled={!["Married", "Separated"].includes(maritalStatus)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Spouse Phone</Label>
                                <Input {...register("spouse_phone")} disabled={!["Married", "Separated"].includes(maritalStatus)} />
                            </div>
                        </div>
                        <div className="space-y-2 mt-2">
                            <Label>Children Details</Label>
                            <Textarea {...register("children_details")} className="h-20" />
                        </div>
                    </div>

                    {/* Professional Info */}
                    <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold mb-3">Professional Profile</h4>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Professional Bio</Label>
                                <Textarea {...register("bio")} placeholder="Brief professional summary..." className="h-24" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Skills (comma separated)</Label>
                                    <Input 
                                        defaultValue={employee.skills?.join(", ") || ""} 
                                        onChange={(e) => setValue("skills", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                                        placeholder="e.g. Landscaping, heavy machinery..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Classes/Training (comma separated)</Label>
                                    <Input 
                                        defaultValue={employee.classes_taking?.join(", ") || ""} 
                                        onChange={(e) => setValue("classes_taking", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                                        placeholder="e.g. OSHA Safety, First Aid..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Emergency */}
                    <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold mb-3">Emergency Contact</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>First Name</Label>
                                <Input {...register("emergency_contact_first_name")} className={getInputClass("emergency_contact_first_name")} />
                            </div>
                            <div className="space-y-2">
                                <Label>Last Name</Label>
                                <Input {...register("emergency_contact_last_name")} className={getInputClass("emergency_contact_last_name")} />
                            </div>
                            <div className="space-y-2">
                                <Label>Phone</Label>
                                <Input {...register("emergency_contact_phone")} className={getInputClass("emergency_contact_phone")} />
                            </div>
                            <div className="space-y-2">
                                <Label>Relationship</Label>
                                <Input {...register("emergency_contact_relationship")} className={getInputClass("emergency_contact_relationship")} />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" size="sm" className="bg-teal-700 hover:bg-teal-800" disabled={updateMutation.isPending}>
                            {updateMutation.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin"/>}Save
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
});

export default EmployeeEditDialog;