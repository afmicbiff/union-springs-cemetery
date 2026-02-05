import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, LayoutDashboard, UserCircle, MessageSquare, LogOut, FileText, Receipt, CheckCircle2, AlertCircle, RefreshCw, BookOpen, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// Eager load critical path components
const MemberDashboard = React.lazy(() => import("@/components/member/MemberDashboard"));
const MemberProfile = React.lazy(() => import("@/components/member/MemberProfile"));

// Lazy-load heavy tabs to avoid eager data fetching
const MemberMessages = React.lazy(() => import("@/components/member/MemberMessages"));
const MemberDocuments = React.lazy(() => import("@/components/member/MemberDocuments"));
const MemberInvoices = React.lazy(() => import("@/components/member/MemberInvoices"));
const MemberTasks = React.lazy(() => import("@/components/member/MemberTasks"));
const ReservationHistory = React.lazy(() => import("@/components/member/ReservationHistory"));
const ReservationWizard = React.lazy(() => import("@/components/member/ReservationWizard"));
const MemberPortalManual = React.lazy(() => import("@/components/member/MemberPortalManual"));

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

const MemberPortal = memo(function MemberPortal() {
    const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
    const initialActiveTab = urlParams.get('tab') || 'dashboard';
    const [activeTab, setActiveTab] = useState(initialActiveTab);
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    useEffect(() => {
        let mounted = true;
        base44.auth.me()
            .then(u => {
                if (mounted) {
                    setUser(u);
                    setAuthLoading(false);
                }
            })
            .catch((err) => {
                if (mounted) {
                    setAuthError(err?.message || 'Authentication failed');
                    setAuthLoading(false);
                }
            });
        return () => { mounted = false; };
    }, []);

    // Fetch conversations to detect unread messages
    const { data: convData, refetch: refetchConversations } = useQuery({
        queryKey: ['member-conversations'],
        queryFn: async () => {
            const res = await base44.functions.invoke('communication', { action: 'getConversations' });
            return res.data;
        },
        enabled: !!user,
        refetchInterval: 120000,
        refetchOnWindowFocus: false,
        staleTime: 60_000,
        retry: 2,
    });
    
    const unreadCount = useMemo(() => 
        (convData?.threads || []).reduce((sum, t) => sum + (t.unread_count || 0), 0), 
        [convData?.threads]
    );

    // Resolve memberId once after login to avoid repeated queries
    const [memberId, setMemberId] = useState(null);
    useEffect(() => {
        let mounted = true;
        if (!user?.email) { setMemberId(null); return; }
        (async () => {
            try {
                const res = await base44.entities.Member.filter({ email_primary: user.email }, null, 1);
                if (mounted) setMemberId((res && res[0]?.id) || null);
            } catch {
                if (mounted) setMemberId(null);
            }
        })();
        return () => { mounted = false; };
    }, [user?.email]);

    const { data: memberTasksForIndicator = [] } = useQuery({
        queryKey: ['member-tasks-indicator', memberId],
        queryFn: async () => {
            if (!memberId) return [];
            return base44.entities.Task.filter({ member_id: memberId, is_archived: false }, '-created_date', 50);
        },
        enabled: !!memberId,
        refetchInterval: 120000,
        refetchOnWindowFocus: false,
        staleTime: 60_000,
        initialData: [],
        retry: 2,
    });

    const tasksDueCount = useMemo(() => 
        memberTasksForIndicator.filter(t => t.status !== 'Completed' && t.due_date && new Date(t.due_date) <= new Date()).length,
        [memberTasksForIndicator]
    );

    // Memoized tab change handler
    const handleTabChange = useCallback((tab) => setActiveTab(tab), []);

    // Memoized logout handler
    const handleLogout = useCallback(() => base44.auth.logout(), []);

    // Manual dialog state - show on first visit unless dismissed
    const [showManual, setShowManual] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('member_portal_manual_dismissed') !== 'true';
    });
    const handleOpenManual = useCallback(() => setShowManual(true), []);
    const handleCloseManual = useCallback((neverShowAgain = false) => {
        if (neverShowAgain) {
            localStorage.setItem('member_portal_manual_dismissed', 'true');
        }
        setShowManual(false);
    }, []);

    if (authLoading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-teal-800">
                <Loader2 className="animate-spin w-8 h-8" />
                <span className="text-sm">Loading your portal...</span>
            </div>
        );
    }
    
    if (!user) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-3 sm:p-4">
                <div className="max-w-md w-full text-center p-6 sm:p-8 bg-white rounded-lg shadow-lg border border-stone-100">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                        <UserCircle className="w-7 h-7 sm:w-8 sm:h-8 text-teal-700" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-serif text-teal-900 mb-3 sm:mb-4">Member Portal</h2>
                    <p className="text-stone-600 mb-6 sm:mb-8 text-sm sm:text-base">
                        Please log in to manage your profile, view your plots, and communicate with administration.
                    </p>
                    {authError && (
                        <p className="text-red-600 text-sm mb-4 p-2 bg-red-50 rounded">{authError}</p>
                    )}
                    <Button 
                        onClick={() => base44.auth.redirectToLogin()} 
                        className="bg-teal-700 hover:bg-teal-800 w-full text-base sm:text-lg h-11 sm:h-12 touch-manipulation"
                    >
                        Log In
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 sm:mb-6 md:mb-8 gap-3 sm:gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-serif text-teal-900">
                        Welcome, {user.full_name?.split(' ')[0] || 'Member'}
                    </h1>
                    <p className="text-stone-600 text-sm sm:text-base">Member Portal</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {unreadCount > 0 && (
                        <Button 
                            onClick={() => handleTabChange('messages')} 
                            className="bg-green-600 hover:bg-green-700 text-white h-9 text-sm touch-manipulation flex-1 sm:flex-none"
                        >
                            <MessageSquare className="w-4 h-4 mr-1.5" /> 
                            <span className="hidden sm:inline">Messages</span>
                            <span className="sm:hidden">Msgs</span>
                            <span className="ml-1.5 bg-white/20 px-1.5 py-0.5 rounded text-xs">{unreadCount}</span>
                        </Button>
                    )}
                    {tasksDueCount > 0 && (
                        <Button 
                            onClick={() => handleTabChange('tasks')} 
                            className="bg-amber-600 hover:bg-amber-700 text-white h-9 text-sm touch-manipulation flex-1 sm:flex-none"
                        >
                            <CheckCircle2 className="w-4 h-4 mr-1.5" /> 
                            <span className="hidden sm:inline">Tasks Due</span>
                            <span className="sm:hidden">Tasks</span>
                            <span className="ml-1.5 bg-white/20 px-1.5 py-0.5 rounded text-xs">{tasksDueCount}</span>
                        </Button>
                    )}
                    <Button 
                        variant="outline" 
                        onClick={handleOpenManual} 
                        className="text-teal-700 border-teal-300 hover:bg-teal-50 h-9 text-sm touch-manipulation"
                        title="How to Use This Portal"
                    >
                        <BookOpen className="w-4 h-4 sm:mr-1.5" /> 
                        <span className="hidden sm:inline">Help Guide</span>
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={handleLogout} 
                        className="text-stone-600 border-stone-300 hover:bg-stone-50 h-9 text-sm touch-manipulation"
                    >
                        <LogOut className="w-4 h-4 sm:mr-1.5" /> 
                        <span className="hidden sm:inline">Log Out</span>
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 sm:space-y-6">
                <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 pb-1">
                    <TabsList className="bg-white border border-stone-200 p-1 w-max min-w-full sm:w-auto inline-flex h-auto gap-0.5">
                        <TabsTrigger value="dashboard" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white py-2 px-2.5 sm:px-3 text-xs sm:text-sm touch-manipulation">
                            <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5 shrink-0" /> 
                            <span className="hidden sm:inline">Dashboard</span>
                            <span className="sm:hidden">Home</span>
                        </TabsTrigger>
                        <TabsTrigger value="profile" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white py-2 px-2.5 sm:px-3 text-xs sm:text-sm touch-manipulation">
                            <UserCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5 shrink-0" /> 
                            <span className="hidden sm:inline">My Profile</span>
                            <span className="sm:hidden">Profile</span>
                        </TabsTrigger>
                        <TabsTrigger 
                            value="messages" 
                            className={`data-[state=active]:bg-teal-700 data-[state=active]:text-white py-2 px-2.5 sm:px-3 text-xs sm:text-sm touch-manipulation relative ${unreadCount > 0 ? 'ring-2 ring-green-500' : ''}`}
                        >
                            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5 shrink-0" /> 
                            <span className="hidden sm:inline">Messages</span>
                            <span className="sm:hidden">Msgs</span>
                            {unreadCount > 0 && (
                                <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-green-600 text-white text-[10px] font-medium px-1">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="documents" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white py-2 px-2.5 sm:px-3 text-xs sm:text-sm touch-manipulation">
                            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5 shrink-0" /> 
                            <span className="hidden sm:inline">Documents</span>
                            <span className="sm:hidden">Docs</span>
                        </TabsTrigger>
                        <TabsTrigger 
                            value="tasks" 
                            className={`data-[state=active]:bg-teal-700 data-[state=active]:text-white py-2 px-2.5 sm:px-3 text-xs sm:text-sm touch-manipulation relative ${tasksDueCount > 0 ? 'ring-2 ring-amber-500' : ''}`}
                        >
                            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5 shrink-0" /> 
                            <span>Tasks</span>
                            {tasksDueCount > 0 && (
                                <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-amber-600 text-white text-[10px] font-medium px-1">
                                    {tasksDueCount > 9 ? '9+' : tasksDueCount}
                                </span>
                            )}
                        </TabsTrigger>
{user?.role === 'admin' && (
                        <TabsTrigger value="invoices" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white py-2 px-2.5 sm:px-3 text-xs sm:text-sm touch-manipulation">
                            <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5 shrink-0" /> 
                            <span>Invoices</span>
                        </TabsTrigger>
                        )}
{user?.role === 'admin' && (
                        <TabsTrigger value="reservations" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white py-2 px-2.5 sm:px-3 text-xs sm:text-sm touch-manipulation">
                            <span className="hidden sm:inline">Reservations</span>
                            <span className="sm:hidden">Reserve</span>
                        </TabsTrigger>
                        )}
                    </TabsList>
                </div>


                <TabsContent value="dashboard" className="focus-visible:outline-none">
                    <React.Suspense fallback={<TabLoader />}>
                        <MemberDashboard user={user} setActiveTab={handleTabChange} />
                    </React.Suspense>
                </TabsContent>

                <TabsContent value="profile" className="focus-visible:outline-none">
                    <React.Suspense fallback={<TabLoader />}>
                        <MemberProfile user={user} />
                    </React.Suspense>
                </TabsContent>

                <TabsContent value="messages" className="focus-visible:outline-none">
                    <React.Suspense fallback={<TabLoader />}>
                        <MemberMessages user={user} />
                    </React.Suspense>
                </TabsContent>

                <TabsContent value="documents" className="focus-visible:outline-none">
                    <React.Suspense fallback={<TabLoader />}>
                        <MemberDocuments user={user} />
                    </React.Suspense>
                </TabsContent>

                <TabsContent value="tasks" className="focus-visible:outline-none">
                    <React.Suspense fallback={<TabLoader />}>
                        <MemberTasks user={user} />
                    </React.Suspense>
                </TabsContent>

                <TabsContent value="invoices" className="focus-visible:outline-none">
                    <React.Suspense fallback={<TabLoader />}>
                        <MemberInvoices user={user} />
                    </React.Suspense>
                </TabsContent>

                <TabsContent value="reservations" className="focus-visible:outline-none">
                    <React.Suspense fallback={<TabLoader />}>
                        <div className="space-y-4 sm:space-y-6">
                            <ReservationWizard />
                            <ReservationHistory />
                        </div>
                    </React.Suspense>
                </TabsContent>
            </Tabs>

            {/* Help Manual Dialog */}
            <Dialog open={showManual} onOpenChange={setShowManual}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-0 shadow-2xl" hideCloseButton>
                    <React.Suspense fallback={<TabLoader />}>
                        <MemberPortalManual onClose={handleCloseManual} />
                    </React.Suspense>
                </DialogContent>
            </Dialog>
        </div>
    );
});

export default MemberPortal;