import React, { memo, Suspense, useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Bell, Shield, BookOpen, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import UserSummaryWidget from "@/components/dashboard/UserSummaryWidget";
import EmployeeSchedule from "@/components/employee/EmployeeSchedule";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, isValid, parseISO } from 'date-fns';

// Lazy load heavier components
const TaskManager = React.lazy(() => import("@/components/tasks/TaskManager"));
const EmployeeDocuments = React.lazy(() => import("@/components/employee/EmployeeDocuments"));

// Memoized loading fallback
const TabLoader = memo(() => (
    <div className="py-10 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
        <span className="text-sm text-stone-500">Loading...</span>
    </div>
));

// Memoized error fallback
const TabError = memo(({ onRetry }) => (
    <div className="py-10 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-red-200 rounded-lg bg-red-50">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm text-red-600">Failed to load content</p>
        {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="h-8 text-xs">
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Try Again
            </Button>
        )}
    </div>
));

// Safe date formatter
const safeFormatDate = (dateStr, formatStr = 'MMM d, yyyy') => {
    if (!dateStr) return '';
    try {
        const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
        return isValid(date) ? format(date, formatStr) : '';
    } catch {
        return '';
    }
};

const EmployeesPage = memo(function EmployeesPage() {
    const [activeTab, setActiveTab] = useState('resources');
    
    // Fetch Current User & Employee Profile for Task Filtering
    const { data: user, isLoading: isAuthLoading, isError: isAuthError } = useQuery({
        queryKey: ['me'],
        queryFn: () => base44.auth.me().catch(() => null),
        staleTime: 5 * 60_000,
        gcTime: 10 * 60_000,
        retry: 2,
        refetchOnWindowFocus: false,
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

    const { data: employeeProfile, isLoading: isProfileLoading } = useQuery({
        queryKey: ['my-employee-profile-page', user?.email],
        queryFn: async () => {
            if (!user?.email) return null;
            const res = await base44.entities.Employee.filter({ email: user.email }, '-created_date', 1);
            return res[0] || null;
        },
        enabled: !!user?.email,
        staleTime: 5 * 60_000,
        gcTime: 10 * 60_000,
        retry: 2,
        refetchOnWindowFocus: false,
    });

    const { data: announcements = [], isLoading: isAnnouncementsLoading } = useQuery({
        queryKey: ['announcements-public'],
        queryFn: () => base44.entities.Announcement.list('-date', 10),
        staleTime: 10 * 60_000,
        gcTime: 30 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
    });

    const activeAnnouncements = React.useMemo(() => 
        announcements.filter(a => a.is_active !== false), 
        [announcements]
    );

    // Tab change handler
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

                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
                        <TabsList className="mb-4 bg-white border border-stone-200 p-1 w-max min-w-full sm:w-auto inline-flex h-auto gap-0.5">
                            <TabsTrigger value="resources" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white py-2 px-2.5 sm:px-3 text-xs sm:text-sm touch-manipulation">
                                <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5 shrink-0" />
                                <span className="hidden sm:inline">Resources & News</span>
                                <span className="sm:hidden">News</span>
                            </TabsTrigger>
                            <TabsTrigger value="schedule" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white py-2 px-2.5 sm:px-3 text-xs sm:text-sm touch-manipulation">
                                <span className="hidden sm:inline">My Schedule</span>
                                <span className="sm:hidden">Schedule</span>
                            </TabsTrigger>
                            <TabsTrigger value="tasks" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white py-2 px-2.5 sm:px-3 text-xs sm:text-sm touch-manipulation">
                                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5 shrink-0" />
                                <span>My Tasks</span>
                            </TabsTrigger>
                            <TabsTrigger value="documents" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white py-2 px-2.5 sm:px-3 text-xs sm:text-sm touch-manipulation">
                                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5 shrink-0" />
                                <span className="hidden sm:inline">Documents</span>
                                <span className="sm:hidden">Docs</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>
                    
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
                                                            {safeFormatDate(update.date, 'MMM d, yyyy')}
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
                
                <TabsContent value="schedule" className="focus-visible:outline-none">
                    <Suspense fallback={<TabLoader />}>
                        <EmployeeSchedule />
                    </Suspense>
                </TabsContent>

                <TabsContent value="tasks" className="focus-visible:outline-none">
                    <Suspense fallback={<TabLoader />}>
                        <TaskManager 
                            isAdmin={false} 
                            currentEmployeeId={employeeProfile?.id} 
                        />
                    </Suspense>
                </TabsContent>

                <TabsContent value="documents" className="focus-visible:outline-none">
                    <Suspense fallback={<TabLoader />}>
                        <EmployeeDocuments user={user} />
                    </Suspense>
                </TabsContent>
                </Tabs>
            </div>
        </div>
    );
});

export default EmployeesPage;