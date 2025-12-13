import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserPlus, Loader2 } from 'lucide-react';

export default function OnboardingForm() {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        email: "",
        secondary_email: "",
        address_street: "",
        address_state: "",
        address_zip: "",
        phone_primary: "",
        phone_secondary: "",
        date_of_birth: "",
        ssn: ""
    });

    const createEmployeeMutation = useMutation({
        mutationFn: async (data) => {
            // 1. Fetch latest employee to get the next number
            const employees = await base44.entities.Employee.list({
                sort: { created_date: -1 },
                limit: 1
            });

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
            setFormData({
                first_name: "",
                last_name: "",
                email: "",
                secondary_email: "",
                address_street: "",
                address_state: "",
                address_zip: "",
                phone_primary: "",
                phone_secondary: "",
                date_of_birth: "",
                ssn: ""
            });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
        onError: (error) => {
            toast.error("Failed to onboard employee: " + error.message);
        }
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        createEmployeeMutation.mutate(formData);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-teal-600"/> New Employee Onboarding
                </CardTitle>
                <CardDescription>
                    Enter mandatory employee details. Employee number will be auto-assigned.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Personal Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="first_name">First Name *</Label>
                            <Input id="first_name" name="first_name" required value={formData.first_name} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="last_name">Last Name *</Label>
                            <Input id="last_name" name="last_name" required value={formData.last_name} onChange={handleChange} />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="date_of_birth">Date of Birth *</Label>
                            <Input id="date_of_birth" name="date_of_birth" type="date" required value={formData.date_of_birth} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ssn">SSN *</Label>
                            <Input id="ssn" name="ssn" required placeholder="XXX-XX-XXXX" value={formData.ssn} onChange={handleChange} />
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label htmlFor="email">Email (Primary) *</Label>
                            <Input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="secondary_email">Email (Secondary)</Label>
                            <Input id="secondary_email" name="secondary_email" type="email" value={formData.secondary_email} onChange={handleChange} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone_primary">Phone (Primary) *</Label>
                            <Input id="phone_primary" name="phone_primary" type="tel" required value={formData.phone_primary} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone_secondary">Phone (Secondary)</Label>
                            <Input id="phone_secondary" name="phone_secondary" type="tel" value={formData.phone_secondary} onChange={handleChange} />
                        </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-4 border-t pt-4">
                        <h4 className="text-sm font-medium text-stone-900">Address</h4>
                        <div className="space-y-2">
                            <Label htmlFor="address_street">Street Address *</Label>
                            <Input id="address_street" name="address_street" required value={formData.address_street} onChange={handleChange} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="address_state">State *</Label>
                                <Input id="address_state" name="address_state" required value={formData.address_state} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address_zip">Zip Code *</Label>
                                <Input id="address_zip" name="address_zip" required value={formData.address_zip} onChange={handleChange} />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" className="bg-teal-700 hover:bg-teal-800 text-white min-w-[150px]" disabled={createEmployeeMutation.isPending}>
                            {createEmployeeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null}
                            Register Employee
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}