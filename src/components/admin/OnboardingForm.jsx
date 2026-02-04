import React, { useCallback, useMemo, memo } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { UserPlus, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from "@/lib/utils";

// Memoized form field component
const FormField = memo(({ label, error, required, children }) => (
  <div className="space-y-1.5">
    <Label className={cn("text-xs sm:text-sm", error && "text-red-500")}>{label}{required && " *"}</Label>
    {children}
    {error && <p className="text-[10px] sm:text-xs text-red-500">{error.message}</p>}
  </div>
));

// Define validation schema
const employeeSchema = z.object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    secondary_email: z.string().email("Invalid email address").optional().or(z.literal("")),
    address_street: z.string().min(1, "Street address is required"),
    address_state: z.string().min(1, "State is required"),
    address_zip: z.string().min(5, "Zip code must be at least 5 digits"),
    phone_primary: z.string().min(10, "Phone number must be at least 10 digits"),
    phone_secondary: z.string().optional(),
    date_of_birth: z.string().min(1, "Date of birth is required"),
    ssn: z.string().min(9, "SSN is required").regex(/^\d{3}-?\d{2}-?\d{4}$/, "Invalid SSN format (XXX-XX-XXXX)"),
    employment_type: z.string().min(1, "Employment type is required"),
    marital_status: z.string().min(1, "Marital status is required"),
    spouse_name: z.string().optional(),
    spouse_phone: z.string().optional(),
    children_details: z.string().optional(),
    emergency_contact_first_name: z.string().min(1, "Emergency contact first name is required"),
    emergency_contact_last_name: z.string().min(1, "Emergency contact last name is required"),
    emergency_contact_phone: z.string().min(10, "Emergency contact phone is required"),
    emergency_contact_relationship: z.string().min(1, "Relationship is required")
}).superRefine((data, ctx) => {
    if (["Married", "Separated"].includes(data.marital_status)) {
        if (!data.spouse_name || data.spouse_name.trim() === "") {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Spouse name is required when married",
                path: ["spouse_name"]
            });
        }
        if (!data.spouse_phone || data.spouse_phone.trim() === "") {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Spouse phone is required when married",
                path: ["spouse_phone"]
            });
        }
    }
});

const OnboardingForm = memo(function OnboardingForm() {
    const queryClient = useQueryClient();
    
    const { 
        register, 
        handleSubmit, 
        reset, 
        setValue,
        watch,
        formState: { errors, touchedFields, isValid } 
    } = useForm({
        resolver: zodResolver(employeeSchema),
        mode: "onBlur" // Changed from onChange for better mobile performance
    });

    const maritalStatus = watch("marital_status");

    const createEmployeeMutation = useMutation({
        mutationFn: async (data) => {
            // 1. Fetch latest employee to get the next number
            const employees = await base44.entities.Employee.list('-created_date', 1);

            let nextNum = 1;
            if (employees.length > 0 && employees[0].employee_number) {
                const lastNum = parseInt(employees[0].employee_number, 10);
                if (!isNaN(lastNum)) {
                    nextNum = lastNum + 1;
                }
            }
            
            const employeeNumber = String(nextNum).padStart(3, '0');

            // Check for duplicate employee_number
            const existingNumber = await base44.entities.Employee.list({ employee_number: employeeNumber });
            if (existingNumber.length > 0) {
                throw new Error(`Employee ID ${employeeNumber} already exists. Please try again.`);
            }

            // Check for duplicate SSN
            const existingSSN = await base44.entities.Employee.list({ ssn: data.ssn });
            if (existingSSN.length > 0) {
                throw new Error(`An employee with SSN ${data.ssn} already exists.`);
            }

            // 2. Create the new employee
            return base44.entities.Employee.create({
                ...data,
                employee_number: employeeNumber
            });
        },
        onSuccess: (data) => {
            toast.success(`Employee ${data.first_name} ${data.last_name} onboarded! Assigned ID: ${data.employee_number}`);
            reset();
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
        onError: (error) => {
            toast.error("Failed to onboard employee: " + error.message);
        }
    });

    const onSubmit = (data) => {
        createEmployeeMutation.mutate(data);
    };

    const onError = (errors) => {
        toast.error("Please check all required fields marked in red");
    };

    // Memoized input class helper
    const getInputClass = useCallback((fieldName) => {
        const hasError = !!errors[fieldName];
        const isTouched = !!touchedFields[fieldName];
        return cn(
            "h-9 text-sm",
            hasError && "border-red-500 bg-red-50",
            isTouched && !hasError && "border-green-500"
        );
    }, [errors, touchedFields]);

    return (
        <Card>
            <CardHeader className="px-4 sm:px-6 py-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600"/> Employee Onboarding
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Enter employee details below.</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
                <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-4 sm:space-y-6">
                    {/* Personal Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField label="Role" error={errors.employment_type} required>
                            <Select onValueChange={(value) => setValue("employment_type", value)}>
                                <SelectTrigger className={getInputClass("employment_type")}><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Administrator">Administrator</SelectItem>
                                    <SelectItem value="Paid Employee">Paid Employee</SelectItem>
                                    <SelectItem value="Volunteer">Volunteer</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormField>
                        <div className="hidden sm:block" />

                        <FormField label="First Name" error={errors.first_name} required>
                            <Input {...register("first_name")} className={getInputClass("first_name")} />
                        </FormField>
                        <FormField label="Last Name" error={errors.last_name} required>
                            <Input {...register("last_name")} className={getInputClass("last_name")} />
                        </FormField>

                        <FormField label="Date of Birth" error={errors.date_of_birth} required>
                            <Input type="date" {...register("date_of_birth")} className={getInputClass("date_of_birth")} />
                        </FormField>
                        <FormField label="SSN" error={errors.ssn} required>
                            <Input placeholder="XXX-XX-XXXX" {...register("ssn")} className={getInputClass("ssn")} />
                        </FormField>
                    </div>

                    {/* Contact Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField label="Email" error={errors.email} required>
                            <Input type="email" {...register("email")} className={getInputClass("email")} />
                        </FormField>
                        <FormField label="Secondary Email" error={errors.secondary_email}>
                            <Input type="email" {...register("secondary_email")} className={getInputClass("secondary_email")} />
                        </FormField>

                        <FormField label="Phone" error={errors.phone_primary} required>
                            <Input type="tel" {...register("phone_primary")} className={getInputClass("phone_primary")} />
                        </FormField>
                        <FormField label="Secondary Phone" error={errors.phone_secondary}>
                            <Input type="tel" {...register("phone_secondary")} className={getInputClass("phone_secondary")} />
                        </FormField>
                    </div>

                    {/* Address */}
                    <div className="space-y-3 border-t pt-4">
                        <h4 className="text-xs sm:text-sm font-medium text-stone-900">Address</h4>
                        <FormField label="Street" error={errors.address_street} required>
                            <Input {...register("address_street")} className={getInputClass("address_street")} />
                        </FormField>
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="State" error={errors.address_state} required>
                                <Input {...register("address_state")} className={getInputClass("address_state")} placeholder="LA" />
                            </FormField>
                            <FormField label="ZIP" error={errors.address_zip} required>
                                <Input {...register("address_zip")} className={getInputClass("address_zip")} />
                            </FormField>
                        </div>
                    </div>

                    {/* Family & Status */}
                    <div className="space-y-3 border-t pt-4">
                        <h4 className="text-xs sm:text-sm font-medium text-stone-900">Family</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <FormField label="Marital Status" error={errors.marital_status} required>
                                <Select onValueChange={(value) => setValue("marital_status", value)}>
                                    <SelectTrigger className={getInputClass("marital_status")}><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Single">Single</SelectItem>
                                        <SelectItem value="Married">Married</SelectItem>
                                        <SelectItem value="Divorced">Divorced</SelectItem>
                                        <SelectItem value="Widowed">Widowed</SelectItem>
                                        <SelectItem value="Separated">Separated</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormField>
                            
                            <FormField label={`Spouse${["Married","Separated"].includes(maritalStatus) ? " *" : ""}`} error={errors.spouse_name}>
                                <Input {...register("spouse_name")} disabled={!["Married","Separated"].includes(maritalStatus)} className={getInputClass("spouse_name")} />
                            </FormField>
                            
                            <FormField label="Spouse Phone" error={errors.spouse_phone}>
                                <Input {...register("spouse_phone")} disabled={!["Married","Separated"].includes(maritalStatus)} className={getInputClass("spouse_phone")} />
                            </FormField>
                        </div>
                        <FormField label="Children">
                            <Textarea {...register("children_details")} placeholder="Names & ages..." className="h-16 text-sm" />
                        </FormField>
                    </div>

                    {/* Emergency Contact */}
                    <div className="space-y-3 border-t pt-4">
                        <h4 className="text-xs sm:text-sm font-medium text-stone-900">Emergency Contact</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <FormField label="First Name" error={errors.emergency_contact_first_name} required>
                                <Input {...register("emergency_contact_first_name")} className={getInputClass("emergency_contact_first_name")} />
                            </FormField>
                            <FormField label="Last Name" error={errors.emergency_contact_last_name} required>
                                <Input {...register("emergency_contact_last_name")} className={getInputClass("emergency_contact_last_name")} />
                            </FormField>
                            <FormField label="Phone" error={errors.emergency_contact_phone} required>
                                <Input type="tel" {...register("emergency_contact_phone")} className={getInputClass("emergency_contact_phone")} />
                            </FormField>
                            <FormField label="Relationship" error={errors.emergency_contact_relationship} required>
                                <Input {...register("emergency_contact_relationship")} placeholder="e.g. Spouse" className={getInputClass("emergency_contact_relationship")} />
                            </FormField>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row justify-end pt-4 items-center gap-3">
                        {!isValid && Object.keys(touchedFields).length > 0 && (
                            <div className="flex items-center text-red-500 text-xs"><AlertCircle className="w-3.5 h-3.5 mr-1"/>Fix errors</div>
                        )}
                        {isValid && (
                            <div className="flex items-center text-green-600 text-xs"><CheckCircle2 className="w-3.5 h-3.5 mr-1"/>Ready</div>
                        )}
                        <Button type="submit" size="sm" className="w-full sm:w-auto bg-teal-700 hover:bg-teal-800" disabled={createEmployeeMutation.isPending}>
                            {createEmployeeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1"/> : null}
                            Register
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
});

export default OnboardingForm;