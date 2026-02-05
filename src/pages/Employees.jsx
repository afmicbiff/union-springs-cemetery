import React, { memo, useMemo, useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Bell, Shield, BookOpen, Loader2 } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import UserSummaryWidget from "@/components/dashboard/UserSummaryWidget";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from 'date-fns';

// Lazy load heavy components
const TaskManager = React.lazy(() => import("@/components/tasks/TaskManager"));
const EmployeeDocuments = React.lazy(() => import("@/components/employee/EmployeeDocuments"));
const EmployeeSchedule = React.lazy(() => import("@/components/employee/EmployeeSchedule"));

// Loading fallback
const TabLoader = memo(() => (
    <div className="py-10 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
        <span className="text-sm text-stone-500">Loading...</span>
    </div>
));

function EmployeesPage() {
    const [activeTab, setActiveTab] = useState("resources");
    
    // Fetch Current User & Employee Profile for Task Filtering
    const { data: user, isLoading: isAuthLoading } = useQuery({
        queryKey: ['me'],
        queryFn: () => base44.auth.me().catch(() => null),
        staleTime: 5 * 60_000,
        gcTime: 10 * 60_000,
    });

    React.useEffect(() => {
        if (!isAuthLoading) {
            if (!user) {
                base44.auth.redirectToLogin(window.location.pathname);
            } else if (user.role !== 'admin') {
                window.location.href = '/';
            }
        }
    }, [user, isAuthLoading]);

    const { data: employeeProfile } = useQuery({
        queryKey: ['my-employee-profile-page', user?.email],
        queryFn: async () => {
            if (!user?.email) return null;
            const res = await base44.entities.Employee.filter({ email: user.email }, '-created_date', 1);
            return res[0] || null;
        },
        enabled: !!user?.email,
        staleTime: 5 * 60_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
    });
    
    const { data: announcements = [] } = useQuery({
        queryKey: ['announcements-public'],
        queryFn: () => base44.entities.Announcement.list('-date', 10),
        staleTime: 10 * 60_000,
        gcTime: 30 * 60_000,
        refetchOnWindowFocus: false,
    });

    const activeAnnouncements = useMemo(() => announcements.filter(a => a.is_active !== false), [announcements]);
    
    const employeeName = useMemo(() => 
        `${employeeProfile?.first_name || ''} ${employeeProfile?.last_name || ''}`.trim(),
        [employeeProfile?.first_name, employeeProfile?.last_name]
    );
    
    const handleTabChange = useCallback((tab) => setActiveTab(tab), []);

    if (isAuthLoading || !user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>;

    if (employeeProfile && employeeProfile.status === 'inactive') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 p-4">
                <Shield className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-stone-900 mb-2">Access Suspended</h1>
                <p className="text-stone-600 text-center max-w-md">
                    Your employee account is currently inactive. Please contact the administrator for assistance.
                </p>
                <a href="/" className="mt-6 text-teal-700 hover:underline">Return Home</a>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-50 py-6 sm:py-8 md:py-12 px-3 sm:px-4 md:px-6 lg:px-8 font-serif">
            <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
                <Breadcrumbs items={[{ label: 'Employees' }]} />
                
                <div className="text-center space-y-2 sm:space-y-4 mb-6 sm:mb-8 md:mb-12">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif text-stone-900">Employee Resources</h1>
                    <p className="text-stone-600 max-w-2xl mx-auto text-sm sm:text-base">
                        Stay updated with the latest policies, work laws, and announcements.
                    </p>
                </div>

                <UserSummaryWidget />

                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 pb-1">
                        <TabsList className="mb-4 w-max min-w-full sm:w-auto inline-flex gap-0.5">
                            <TabsTrigger value="resources" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white px-2.5 sm:px-3 py-2 text-xs sm:text-sm touch-manipulation min-h-[44px] sm:min-h-0">
                                <span className="hidden sm:inline">Resources & News</span>
                                <span className="sm:hidden">Resources</span>
                            </TabsTrigger>
                            <TabsTrigger value="schedule" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white px-2.5 sm:px-3 py-2 text-xs sm:text-sm touch-manipulation min-h-[44px] sm:min-h-0">
                                <span className="hidden sm:inline">My Schedule</span>
                                <span className="sm:hidden">Schedule</span>
                            </TabsTrigger>
                            <TabsTrigger value="tasks" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white px-2.5 sm:px-3 py-2 text-xs sm:text-sm touch-manipulation min-h-[44px] sm:min-h-0">
                                <span className="hidden sm:inline">My Tasks</span>
                                <span className="sm:hidden">Tasks</span>
                            </TabsTrigger>
                            <TabsTrigger value="documents" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white px-2.5 sm:px-3 py-2 text-xs sm:text-sm touch-manipulation min-h-[44px] sm:min-h-0">
                                <span className="hidden sm:inline">Documents</span>
                                <span className="sm:hidden">Docs</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>
                    
                    <TabsContent value="resources" className="focus-visible:outline-none">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    {/* Updates & Announcements */}
                    <div className="lg:col-span-2">
                        <Card className="h-full border-stone-200 shadow-sm">
                            <CardHeader className="p-4 sm:p-6">
                                <div className="flex items-center gap-2">
                                    <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-teal-700" />
                                    <CardTitle className="text-base sm:text-lg">Latest Updates</CardTitle>
                                </div>
                                <CardDescription className="text-xs sm:text-sm">Recent announcements and news for staff</CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6 pt-0">
                                <ScrollArea className="h-[300px] sm:h-[400px] pr-2 sm:pr-4">
                                    <div className="space-y-4 sm:space-y-6">
                                        {activeAnnouncements.length === 0 ? (
                                            <p className="text-center text-stone-500 py-8 text-sm">No recent announcements.</p>
                                        ) : (
                                            activeAnnouncements.map((update) => (
                                                <div key={update.id} className="pb-4 sm:pb-6 border-b border-stone-100 last:border-0">
                                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-2 mb-2">
                                                        <h3 className="font-semibold text-stone-900 text-sm sm:text-base">{update.title}</h3>
                                                        <span className="text-[10px] sm:text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded self-start shrink-0">
                                                            {format(new Date(update.date), 'MMM d, yyyy')}
                                                        </span>
                                                    </div>
                                                    <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">{update.content}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Quick Links & Policies */}
                    <div className="space-y-4 sm:space-y-6">
                        <Card className="border-stone-200 shadow-sm">
                            <CardHeader className="p-4 sm:p-6">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-teal-700" />
                                    <CardTitle className="text-base sm:text-lg">Work Laws & Safety</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2 sm:space-y-4 p-4 sm:p-6 pt-0">
                                <a href="#" className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-stone-50 transition-colors group touch-manipulation">
                                    <div className="p-1.5 sm:p-2 bg-stone-100 rounded group-hover:bg-teal-50 group-hover:text-teal-700 transition-colors">
                                        <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </div>
                                    <div className="text-xs sm:text-sm">
                                        <div className="font-medium text-stone-900">OSHA Safety Guidelines</div>
                                        <div className="text-stone-500 text-[10px] sm:text-xs">Updated 2025</div>
                                    </div>
                                </a>
                                <a href="#" className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-stone-50 transition-colors group touch-manipulation">
                                    <div className="p-1.5 sm:p-2 bg-stone-100 rounded group-hover:bg-teal-50 group-hover:text-teal-700 transition-colors">
                                        <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </div>
                                    <div className="text-xs sm:text-sm">
                                        <div className="font-medium text-stone-900">Employee Handbook</div>
                                        <div className="text-stone-500 text-[10px] sm:text-xs">PDF Download</div>
                                    </div>
                                </a>
                                <a href="#" className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-stone-50 transition-colors group touch-manipulation">
                                    <div className="p-1.5 sm:p-2 bg-stone-100 rounded group-hover:bg-teal-50 group-hover:text-teal-700 transition-colors">
                                        <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </div>
                                    <div className="text-xs sm:text-sm">
                                        <div className="font-medium text-stone-900">Labor Law Posters</div>
                                        <div className="text-stone-500 text-[10px] sm:text-xs">Federal & State</div>
                                    </div>
                                </a>
                            </CardContent>
                        </Card>

                        <Card className="bg-teal-700 text-white border-none">
                            <CardContent className="p-4 sm:p-6">
                                <h3 className="font-serif font-bold text-base sm:text-lg mb-2">Need HR Assistance?</h3>
                                <p className="text-teal-100 text-xs sm:text-sm mb-3 sm:mb-4">
                                    For questions regarding benefits, payroll, or workplace concerns.
                                </p>
                                <div className="text-xs sm:text-sm font-medium">
                                    Contact: hr@unionsprings.com
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                </TabsContent>
                
                <TabsContent value="schedule" className="focus-visible:outline-none">
                    <React.Suspense fallback={<TabLoader />}>
                        <EmployeeSchedule />
                    </React.Suspense>
                </TabsContent>

                <TabsContent value="tasks" className="focus-visible:outline-none">
                    <React.Suspense fallback={<TabLoader />}>
                        <TaskManager 
                            isAdmin={false} 
                            currentEmployeeId={employeeProfile?.id} 
                        />
                    </React.Suspense>
                </TabsContent>

                <TabsContent value="documents" className="focus-visible:outline-none">
                    <React.Suspense fallback={<TabLoader />}>
                        <EmployeeDocuments 
                            employeeId={employeeProfile?.id}
                            employeeName={employeeName}
                        />
                    </React.Suspense>
                </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

export default memo(EmployeesPage);