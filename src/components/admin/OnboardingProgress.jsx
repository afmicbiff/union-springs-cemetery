import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Send, CheckCircle2, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { format } from 'date-fns';

export default function OnboardingProgress() {
    const [isRunning, setIsRunning] = useState(false);

    const { data: employees, refetch } = useQuery({
        queryKey: ['employees-progress'],
        queryFn: () => base44.entities.Employee.list({ limit: 100 }),
        initialData: [],
    });

    const checklistMandatory = [
        "Form I-9", 
        "Form W-4", 
        "Form L-4", 
        "Offer Letter", 
        "New Hire Reporting"
    ];

    const getProgress = (emp) => {
        const checklist = emp.checklist || {};
        const completed = checklistMandatory.filter(item => checklist[item]).length;
        return Math.round((completed / checklistMandatory.length) * 100);
    };

    const getMissingItems = (emp) => {
        const checklist = emp.checklist || {};
        return checklistMandatory.filter(item => !checklist[item]);
    };

    const handleRunReminders = async () => {
        setIsRunning(true);
        try {
            const { data } = await base44.functions.invoke('runAutoReminders');
            if (data.error) throw new Error(data.error);
            
            toast.success(`Sent ${data.reminders_sent} reminders successfully.`);
            refetch(); // Refresh list to show updated 'Last Reminder' times
        } catch (err) {
            toast.error("Failed to run reminders: " + err.message);
        } finally {
            setIsRunning(false);
        }
    };

    // Filter only active employees with incomplete items or recently completed
    const incompleteEmployees = employees.filter(emp => getProgress(emp) < 100);

    return (
        <Card>
            <CardHeader className="px-4 sm:px-6 py-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600"/> Progress
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Monitor completion status</CardDescription>
                    </div>
                    <Button 
                        size="sm"
                        onClick={handleRunReminders} 
                        disabled={isRunning || incompleteEmployees.length === 0}
                        className="bg-teal-700 hover:bg-teal-800 w-full sm:w-auto h-8"
                    >
                        {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1"/> : <Send className="w-3.5 h-3.5 mr-1"/>}
                        <span className="text-xs">Send Reminders</span>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
                {incompleteEmployees.length === 0 ? (
                    <div className="text-center py-6 bg-green-50 rounded-lg border border-green-100">
                        <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 mx-auto mb-2"/>
                        <h3 className="font-semibold text-sm text-green-800">All Clear!</h3>
                        <p className="text-green-700 text-xs">Onboarding complete.</p>
                    </div>
                ) : (
                    <div className="space-y-2 sm:space-y-3 max-h-[300px] overflow-y-auto">
                        {incompleteEmployees.map(emp => (
                            <EmployeeProgressCard
                                key={emp.id}
                                emp={emp}
                                progress={getProgress(emp)}
                                missing={getMissingItems(emp)}
                            />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
});

export default OnboardingProgress;