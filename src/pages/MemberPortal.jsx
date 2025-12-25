import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, LayoutDashboard, UserCircle, MessageSquare, LogOut } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MemberDashboard from "@/components/member/MemberDashboard";
import MemberProfile from "@/components/member/MemberProfile";
import MemberMessages from "@/components/member/MemberMessages";
import MemberDocuments from "@/components/member/MemberDocuments";
import MemberInvoices from "@/components/member/MemberInvoices";
import { FileText, Receipt } from 'lucide-react';

export default function MemberPortal() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    React.useEffect(() => {
        base44.auth.me().then(u => {
            setUser(u);
            setAuthLoading(false);
        }).catch(() => setAuthLoading(false));
    }, []);

    if (authLoading) return <div className="min-h-[60vh] flex items-center justify-center text-teal-800"><Loader2 className="animate-spin w-8 h-8 mr-2" /> Loading portal...</div>;
    
    if (!user) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center p-8 bg-white rounded-lg shadow-lg border border-stone-100">
                    <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <UserCircle className="w-8 h-8 text-teal-700" />
                    </div>
                    <h2 className="text-2xl font-serif text-teal-900 mb-4">Member Portal</h2>
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
                    <p className="text-stone-600">Union Springs Cemetery Member Portal</p>
                </div>
                <Button variant="outline" onClick={() => base44.auth.logout()} className="text-stone-600 border-stone-300 hover:bg-stone-50">
                    <LogOut className="w-4 h-4 mr-2" /> Log Out
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-white border border-stone-200 p-1 w-full md:w-auto grid grid-cols-3 md:inline-flex h-auto">
                    <TabsTrigger value="dashboard" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white py-2">
                        <LayoutDashboard className="w-4 h-4 mr-2 md:inline hidden" /> Dashboard
                    </TabsTrigger>
                    <TabsTrigger value="profile" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white py-2">
                        <UserCircle className="w-4 h-4 mr-2 md:inline hidden" /> My Profile
                    </TabsTrigger>
                    <TabsTrigger value="messages" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white py-2">
                        <MessageSquare className="w-4 h-4 mr-2 md:inline hidden" /> Messages
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white py-2">
                        <FileText className="w-4 h-4 mr-2 md:inline hidden" /> Documents
                    </TabsTrigger>
                    <TabsTrigger value="invoices" className="data-[state=active]:bg-teal-700 data-[state=active]:text-white py-2">
                        <Receipt className="w-4 h-4 mr-2 md:inline hidden" /> Invoices
                    </TabsTrigger>
                </TabsList>
        <TabsContent value="reservations">
          {user ? <ReservationHistory /> : <div className="text-sm text-gray-500 p-4">Please log in to view your reservations.</div>}
        </TabsContent>

                <TabsContent value="dashboard" className="focus-visible:outline-none">
                    <MemberDashboard user={user} setActiveTab={setActiveTab} />
                </TabsContent>

                <TabsContent value="profile" className="focus-visible:outline-none">
                    <MemberProfile user={user} />
                </TabsContent>

                <TabsContent value="messages" className="focus-visible:outline-none">
                    <MemberMessages user={user} />
                </TabsContent>

                <TabsContent value="documents" className="focus-visible:outline-none">
                    <MemberDocuments user={user} />
                </TabsContent>

                <TabsContent value="invoices" className="focus-visible:outline-none">
                    <MemberInvoices user={user} />
                </TabsContent>
            </Tabs>
        </div>
    );
}