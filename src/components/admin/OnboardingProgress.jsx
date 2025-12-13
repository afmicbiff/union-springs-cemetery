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
        <Card className="h-full">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-teal-600"/> Onboarding Tracker
                        </CardTitle>
                        <CardDescription>
                            Monitor completion status and automate follow-ups.
                        </CardDescription>
                    </div>
                    <Button 
                        onClick={handleRunReminders} 
                        disabled={isRunning || incompleteEmployees.length === 0}
                        className="bg-teal-700 hover:bg-teal-800"
                    >
                        {isRunning ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Send className="w-4 h-4 mr-2"/>}
                        Send Reminders
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {incompleteEmployees.length === 0 ? (
                        <div className="text-center py-8 bg-green-50 rounded-lg border border-green-100">
                            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2"/>
                            <h3 className="font-semibold text-green-800">All Clear!</h3>
                            <p className="text-green-700 text-sm">All active employees have completed their onboarding.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {incompleteEmployees.map(emp => {
                                const progress = getProgress(emp);
                                const missing = getMissingItems(emp);
                                
                                return (
                                    <div key={emp.id} className="border rounded-lg p-4 bg-white hover:bg-stone-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-semibold text-stone-900">{emp.first_name} {emp.last_name}</h4>
                                                <p className="text-xs text-stone-500">{emp.email}</p>
                                            </div>
                                            <div className="text-right">
                                                <Badge variant={progress < 50 ? "destructive" : "secondary"} className="mb-1">
                                                    {progress}% Complete
                                                </Badge>
                                                {emp.last_reminder_sent && (
                                                    <p className="text-[10px] text-stone-400">
                                                        Last reminded: {format(new Date(emp.last_reminder_sent), 'MMM d, HH:mm')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <Progress value={progress} className="h-2 mb-3" />
                                        
                                        <div className="flex flex-wrap gap-2">
                                            {missing.map(item => (
                                                <Badge key={item} variant="outline" className="text-xs border-red-200 bg-red-50 text-red-700">
                                                    Missing: {item}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}