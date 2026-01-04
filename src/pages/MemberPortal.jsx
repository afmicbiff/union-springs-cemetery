import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, LayoutDashboard, UserCircle, MessageSquare, LogOut } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MemberDashboard from "@/components/member/MemberDashboard";
import MemberProfile from "@/components/member/MemberProfile";
import { FileText, Receipt, CheckCircle2 } from 'lucide-react';

// Lazy-load heavy tabs to avoid eager data fetching
const MemberMessages = React.lazy(() => import("@/components/member/MemberMessages"));
const MemberDocuments = React.lazy(() => import("@/components/member/MemberDocuments"));
const MemberInvoices = React.lazy(() => import("@/components/member/MemberInvoices"));
const MemberTasks = React.lazy(() => import("@/components/member/MemberTasks"));
const ReservationHistory = React.lazy(() => import("@/components/member/ReservationHistory"));
const ReservationWizard = React.lazy(() => import("@/components/member/ReservationWizard"));

export default function MemberPortal() {
    const urlParams = new URLSearchParams(window.location.search);
    const initialActiveTab = urlParams.get('tab') || 'dashboard';
    const [activeTab, setActiveTab] = useState(initialActiveTab);
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    React.useEffect(() => {
        base44.auth.me().then(u => {
            setUser(u);
            setAuthLoading(false);
        }).catch(() => setAuthLoading(false));
    }, []);

    // Fetch conversations to detect unread messages
    const { data: convData } = useQuery({
        queryKey: ['member-conversations'],
        queryFn: async () => {
            const res = await base44.functions.invoke('communication', { action: 'getConversations' });
            return res.data;
        },
        enabled: !!user,
        refetchInterval: 120000,
        refetchOnWindowFocus: false,
    });
    const unreadCount = (convData?.threads || []).reduce((sum, t) => sum + (t.unread_count || 0), 0);

    // Resolve memberId once after login to avoid repeated queries
      const [memberId, setMemberId] = useState(null);
      React.useEffect(() => {
          let mounted = true;
          if (!user?.email) { setMemberId(null); return; }
          (async () => {
              const res = await base44.entities.Member.filter({ email_primary: user.email }, null, 1);
              if (mounted) setMemberId((res && res[0]?.id) || null);
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
        initialData: []
    });

    const tasksDueCount = memberTasksForIndicator.filter(t => t.status !== 'Completed' && t.due_date && new Date(t.due_date) <= new Date()).length;

    if (authLoading) return <div className="min-h-[60vh] flex items-center justify-center text-teal-800"><Loader2 className="animate-spin w-8 h-8 mr-2" /> Loading portal...</div>;
    
    if (!user) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center p-8 bg-white rounded-lg shadow-lg border border-stone-100">
                    <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <UserCircle className="w-8 h-8 text-teal-700" />
                    </div>
                    <h2 className="text-2xl font-serif text-teal-900 mb-4">Member Portal/Account</h2>
                    <p className="text-stone-600 mb-8">Please log in to manage your profile, view your plots, and communicate with administration.</p>
                    <Button onClick={() => base44.auth.redirectToLogin()} className="bg-teal-700 hover:bg-teal-800 w-full text-lg h-12">Log In</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-serif text-teal-900">Welcome, {user.full_name?.split(' ')[0]}</h1>
                    <p className="text-stone-600">Union Springs Cemetery Member Portal/Account</p>
                </div>
                <div className="flex gap-2">
                    {unreadCount > 0 && (
                        <Button onClick={() => setActiveTab('messages')} className="bg-green-600 hover:bg-green-700 text-white animate-pulse">
                            <MessageSquare className="w-4 h-4 mr-2" /> See Messages
                        </Button>
                    )}
                    {tasksDueCount > 0 && (
                        <Button onClick={() => setActiveTab('tasks')} className="bg-green-600 hover:bg-green-700 text-white animate-pulse">
                            <CheckCircle2 className="w-4 h-4 mr-2" /> See Tasks
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => base44.auth.logout()} className="text-stone-600 border-stone-300 hover:bg-stone-50">
                        <LogOut className="w-4 h-4 mr-2" /> Log Out
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-white border border-stone-200 p-1 w-full md:w-auto grid grid-cols-3 md:inline-flex h-auto">
                    <TabsTrigger value="dashboard" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white py-2">
                        <LayoutDashboard className="w-4 h-4 mr-2 md:inline hidden" /> Dashboard
                    </TabsTrigger>
                    <TabsTrigger value="profile" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white py-2">
                        <UserCircle className="w-4 h-4 mr-2 md:inline hidden" /> My Profile
                    </TabsTrigger>
                    <TabsTrigger value="messages" className={`data-[state=active]:bg-teal-700 data-[state=active]:text-white py-2 ${unreadCount > 0 ? 'ring-2 ring-green-500 text-green-700 animate-pulse' : ''}`}>
                        <MessageSquare className="w-4 h-4 mr-2 md:inline hidden" /> Messages {unreadCount > 0 && <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-600 text-white text-[10px]">{unreadCount}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white py-2">
                        <FileText className="w-4 h-4 mr-2 md:inline hidden" /> Documents
                    </TabsTrigger>
                    <TabsTrigger value="tasks" className={`data-[state=active]:bg-teal-700 data-[state=active]:text-white py-2 ${tasksDueCount > 0 ? 'ring-2 ring-green-500 text-green-700 animate-pulse' : ''}`}>
                        <CheckCircle2 className="w-4 h-4 mr-2 md:inline hidden" /> Tasks {tasksDueCount > 0 && <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-600 text-white text-[10px]">{tasksDueCount}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="invoices" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white py-2">
                        <Receipt className="w-4 h-4 mr-2 md:inline hidden" /> Invoices
                    </TabsTrigger>
                    <TabsTrigger value="reservations" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white py-2">Reservations</TabsTrigger>
                </TabsList>


                <TabsContent value="dashboard" className="focus-visible:outline-none">
                    <MemberDashboard user={user} setActiveTab={setActiveTab} />
                </TabsContent>

                <TabsContent value="profile" className="focus-visible:outline-none">
                    <MemberProfile user={user} />
                </TabsContent>

                {activeTab === 'messages' && (
                    <TabsContent value="messages" className="focus-visible:outline-none">
                        <React.Suspense fallback={<div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>}>
                            <MemberMessages user={user} />
                        </React.Suspense>
                    </TabsContent>
                )}

                {activeTab === 'documents' && (
                    <TabsContent value="documents" className="focus-visible:outline-none">
                        <React.Suspense fallback={<div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>}>
                            <MemberDocuments user={user} />
                        </React.Suspense>
                    </TabsContent>
                )}

                {activeTab === 'tasks' && (
                    <TabsContent value="tasks" className="focus-visible:outline-none">
                        <React.Suspense fallback={<div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>}>
                            <MemberTasks user={user} />
                        </React.Suspense>
                    </TabsContent>
                )}

                {activeTab === 'invoices' && (
                    <TabsContent value="invoices" className="focus-visible:outline-none">
                        <React.Suspense fallback={<div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>}>
                            <MemberInvoices user={user} />
                        </React.Suspense>
                    </TabsContent>
                )}
                {activeTab === 'reservations' && (
                    <TabsContent value="reservations">
                        <React.Suspense fallback={<div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>}>
                            <div className="space-y-6">
                                <ReservationWizard />
                                <ReservationHistory />
                            </div>
                        </React.Suspense>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}