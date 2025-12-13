import React from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserPlus, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from "@/lib/utils";

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
    ssn: z.string().min(9, "SSN is required").regex(/^\d{3}-?\d{2}-?\d{4}$/, "Invalid SSN format (XXX-XX-XXXX)")
});

export default function OnboardingForm() {
    const queryClient = useQueryClient();
    
    const { 
        register, 
        handleSubmit, 
        reset, 
        formState: { errors, touchedFields, isValid } 
    } = useForm({
        resolver: zodResolver(employeeSchema),
        mode: "onChange"
    });

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

    // Helper to get input class based on state
    const getInputClass = (fieldName) => {
        const hasError = !!errors[fieldName];
        const isTouched = !!touchedFields[fieldName];
        const isSuccess = isTouched && !hasError;

        return cn(
            "transition-all duration-200",
            hasError && "border-red-500 focus-visible:ring-red-500 bg-red-50",
            isSuccess && "border-green-500 focus-visible:ring-green-500 bg-green-50"
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-teal-600"/> New Employee Onboarding
                </CardTitle>
                <CardDescription>
                    Enter mandatory employee details. Fields turn green when valid.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
                    {/* Personal Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="first_name" className={errors.first_name ? "text-red-500" : ""}>First Name *</Label>
                            <Input id="first_name" {...register("first_name")} className={getInputClass("first_name")} />
                            {errors.first_name && <p className="text-xs text-red-500">{errors.first_name.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="last_name" className={errors.last_name ? "text-red-500" : ""}>Last Name *</Label>
                            <Input id="last_name" {...register("last_name")} className={getInputClass("last_name")} />
                            {errors.last_name && <p className="text-xs text-red-500">{errors.last_name.message}</p>}
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="date_of_birth" className={errors.date_of_birth ? "text-red-500" : ""}>Date of Birth *</Label>
                            <Input id="date_of_birth" type="date" {...register("date_of_birth")} className={getInputClass("date_of_birth")} />
                            {errors.date_of_birth && <p className="text-xs text-red-500">{errors.date_of_birth.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ssn" className={errors.ssn ? "text-red-500" : ""}>SSN *</Label>
                            <Input id="ssn" placeholder="XXX-XX-XXXX" {...register("ssn")} className={getInputClass("ssn")} />
                            {errors.ssn && <p className="text-xs text-red-500">{errors.ssn.message}</p>}
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label htmlFor="email" className={errors.email ? "text-red-500" : ""}>Email (Primary) *</Label>
                            <Input id="email" type="email" {...register("email")} className={getInputClass("email")} />
                            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="secondary_email" className={errors.secondary_email ? "text-red-500" : ""}>Email (Secondary)</Label>
                            <Input id="secondary_email" type="email" {...register("secondary_email")} className={getInputClass("secondary_email")} />
                            {errors.secondary_email && <p className="text-xs text-red-500">{errors.secondary_email.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone_primary" className={errors.phone_primary ? "text-red-500" : ""}>Phone (Primary) *</Label>
                            <Input id="phone_primary" type="tel" {...register("phone_primary")} className={getInputClass("phone_primary")} />
                            {errors.phone_primary && <p className="text-xs text-red-500">{errors.phone_primary.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone_secondary" className={errors.phone_secondary ? "text-red-500" : ""}>Phone (Secondary)</Label>
                            <Input id="phone_secondary" type="tel" {...register("phone_secondary")} className={getInputClass("phone_secondary")} />
                        </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-4 border-t pt-4">
                        <h4 className="text-sm font-medium text-stone-900">Address</h4>
                        <div className="space-y-2">
                            <Label htmlFor="address_street" className={errors.address_street ? "text-red-500" : ""}>Street Address *</Label>
                            <Input id="address_street" {...register("address_street")} className={getInputClass("address_street")} />
                            {errors.address_street && <p className="text-xs text-red-500">{errors.address_street.message}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="address_state" className={errors.address_state ? "text-red-500" : ""}>State *</Label>
                                <Input id="address_state" {...register("address_state")} className={getInputClass("address_state")} />
                                {errors.address_state && <p className="text-xs text-red-500">{errors.address_state.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address_zip" className={errors.address_zip ? "text-red-500" : ""}>Zip Code *</Label>
                                <Input id="address_zip" {...register("address_zip")} className={getInputClass("address_zip")} />
                                {errors.address_zip && <p className="text-xs text-red-500">{errors.address_zip.message}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 items-center gap-4">
                        {!isValid && Object.keys(touchedFields).length > 0 && (
                            <div className="flex items-center text-red-500 text-sm animate-pulse">
                                <AlertCircle className="w-4 h-4 mr-1"/> Please fix invalid fields
                            </div>
                        )}
                        {isValid && (
                             <div className="flex items-center text-green-600 text-sm animate-in fade-in slide-in-from-left-4">
                                <CheckCircle2 className="w-4 h-4 mr-1"/> Ready to submit
                            </div>
                        )}
                        <Button 
                            type="submit" 
                            className="min-w-[150px] transition-all duration-300 bg-teal-700 hover:bg-teal-800"
                            disabled={createEmployeeMutation.isPending}
                        >
                            {createEmployeeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null}
                            Register Employee
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}