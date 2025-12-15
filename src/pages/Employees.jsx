import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Bell, Shield, BookOpen } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import UserSummaryWidget from "@/components/dashboard/UserSummaryWidget";
import EmployeeSchedule from "@/components/employee/EmployeeSchedule";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from 'date-fns';
import TaskManager from "@/components/tasks/TaskManager";

export default function EmployeesPage() {
    // Fetch Current User & Employee Profile for Task Filtering
    const { data: user } = useQuery({
        queryKey: ['me'],
        queryFn: () => base44.auth.me().catch(() => null),
    });

    const { data: employeeProfile } = useQuery({
        queryKey: ['my-employee-profile-page', user?.email],
        queryFn: async () => {
            if (!user?.email) return null;
            const res = await base44.entities.Employee.list({ limit: 1000 });
            return res.find(e => e.email === user.email);
        },
        enabled: !!user?.email
    });
    const { data: announcements } = useQuery({
        queryKey: ['announcements-public'],
        queryFn: () => base44.entities.Announcement.list('-date', 20),
        initialData: []
    });

    const activeAnnouncements = announcements.filter(a => a.is_active !== false);

    return (
        <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8 font-serif">
            <div className="max-w-6xl mx-auto space-y-8">
                <Breadcrumbs items={[{ label: 'Employees' }]} />
                
                <div className="text-center space-y-4 mb-12">
                    <h1 className="text-4xl font-serif text-stone-900">Employee Resources</h1>
                    <p className="text-stone-600 max-w-2xl mx-auto">
                        Stay updated with the latest policies, work laws, and announcements.
                    </p>
                </div>

                <UserSummaryWidget />

                <Tabs defaultValue="resources" className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="resources">Resources & News</TabsTrigger>
                        <TabsTrigger value="schedule">My Schedule</TabsTrigger>
                        <TabsTrigger value="tasks">My Tasks</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="resources">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Updates & Announcements */}
                    <div className="md:col-span-2">
                        <Card className="h-full border-stone-200 shadow-sm">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Bell className="w-5 h-5 text-teal-700" />
                                    <CardTitle>Latest Updates</CardTitle>
                                </div>
                                <CardDescription>Recent announcements and news for staff</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[400px] pr-4">
                                    <div className="space-y-6">
                                        {activeAnnouncements.length === 0 ? (
                                            <p className="text-center text-stone-500 py-8">No recent announcements.</p>
                                        ) : (
                                            activeAnnouncements.map((update) => (
                                                <div key={update.id} className="pb-6 border-b border-stone-100 last:border-0">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h3 className="font-semibold text-stone-900">{update.title}</h3>
                                                        <span className="text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded">
                                                            {format(new Date(update.date), 'MMM d, yyyy')}
                                                        </span>
                                                    </div>
                                                    <p className="text-stone-600 text-sm leading-relaxed">{update.content}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Quick Links & Policies */}
                    <div className="space-y-6">
                        <Card className="border-stone-200 shadow-sm">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-teal-700" />
                                    <CardTitle>Work Laws & Safety</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <a href="#" className="flex items-center gap-3 p-3 rounded-lg hover:bg-stone-50 transition-colors group">
                                    <div className="p-2 bg-stone-100 rounded group-hover:bg-teal-50 group-hover:text-teal-700 transition-colors">
                                        <BookOpen className="w-4 h-4" />
                                    </div>
                                    <div className="text-sm">
                                        <div className="font-medium text-stone-900">OSHA Safety Guidelines</div>
                                        <div className="text-stone-500 text-xs">Updated 2025</div>
                                    </div>
                                </a>
                                <a href="#" className="flex items-center gap-3 p-3 rounded-lg hover:bg-stone-50 transition-colors group">
                                    <div className="p-2 bg-stone-100 rounded group-hover:bg-teal-50 group-hover:text-teal-700 transition-colors">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="text-sm">
                                        <div className="font-medium text-stone-900">Employee Handbook</div>
                                        <div className="text-stone-500 text-xs">PDF Download</div>
                                    </div>
                                </a>
                                <a href="#" className="flex items-center gap-3 p-3 rounded-lg hover:bg-stone-50 transition-colors group">
                                    <div className="p-2 bg-stone-100 rounded group-hover:bg-teal-50 group-hover:text-teal-700 transition-colors">
                                        <Shield className="w-4 h-4" />
                                    </div>
                                    <div className="text-sm">
                                        <div className="font-medium text-stone-900">Labor Law Posters</div>
                                        <div className="text-stone-500 text-xs">Federal & State</div>
                                    </div>
                                </a>
                            </CardContent>
                        </Card>

                        <Card className="bg-teal-700 text-white border-none">
                            <CardContent className="p-6">
                                <h3 className="font-serif font-bold text-lg mb-2">Need HR Assistance?</h3>
                                <p className="text-teal-100 text-sm mb-4">
                                    For questions regarding benefits, payroll, or workplace concerns.
                                </p>
                                <div className="text-sm font-medium">
                                    Contact: hr@unionsprings.com
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                </TabsContent>
                
                <TabsContent value="schedule">
                    <EmployeeSchedule />
                </TabsContent>

                <TabsContent value="tasks">
                    <TaskManager 
                        isAdmin={false} 
                        currentEmployeeId={employeeProfile?.id} 
                    />
                </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}