import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Mail, MessageSquare, Loader2, User, RefreshCw, CheckCircle2, Sparkles, Lightbulb, Megaphone, X, Archive, Trash2, Star, Search, MoreVertical, MailOpen, Mail as MailIcon, Tag, AlertTriangle, Smile, Meh, Frown, Wand2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from 'date-fns';

export default function CommunicationCenter() {
    const [activeTab, setActiveTab] = useState('inbox');
    
    return (
        <Card className="min-h-[600px]">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" /> Communication Center
                </CardTitle>
                <CardDescription>Manage mass notifications and direct messages with members.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="inbox" className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" /> Inbox
                        </TabsTrigger>
                        <TabsTrigger value="compose" className="flex items-center gap-2">
                            <Send className="w-4 h-4" /> Mass Notification
                        </TabsTrigger>
                        <TabsTrigger value="campaigns" className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4" /> AI Campaigns
                        </TabsTrigger>
                        <TabsTrigger value="home-alert" className="flex items-center gap-2">
                            <Megaphone className="w-4 h-4" /> Home Page
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="inbox">
                        <InboxView />
                    </TabsContent>

                    <TabsContent value="compose">
                        <MassNotificationForm onSuccess={() => setActiveTab('inbox')} />
                    </TabsContent>

                    <TabsContent value="campaigns">
                        <CampaignSuggestions />
                    </TabsContent>

                    <TabsContent value="home-alert">
                        <HomeNotificationManager />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

function CampaignSuggestions() {
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['ai-campaigns'],
        queryFn: async () => {
            const res = await base44.functions.invoke('aiCommunicationAssistant', { action: 'suggest_campaigns', data: {} });
            return res.data;
        },
        staleTime: 1000 * 60 * 60 // 1 hour
    });

    const campaigns = data?.campaigns || [];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">AI Campaign Suggestions</h3>
                    <p className="text-sm text-stone-500">Engage members with timely, relevant communications.</p>
                </div>
                <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
            ) : (
                <div className="grid gap-4">
                    {campaigns.map((campaign, idx) => (
                        <Card key={idx} className="bg-stone-50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4 text-amber-500" />
                                    {campaign.title}
                                </CardTitle>
                                <CardDescription>{campaign.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm space-y-2">
                                    <div><span className="font-semibold">Target:</span> {campaign.target_audience}</div>
                                    <div><span className="font-semibold">Subject Idea:</span> {campaign.suggested_subject}</div>
                                    <Button size="sm" variant="secondary" className="mt-2 w-full sm:w-auto">Draft this Campaign</Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

function HomeNotificationManager() {
    const [message, setMessage] = React.useState('');
    const queryClient = useQueryClient();

    const { data: activeNotifications, isLoading } = useQuery({
        queryKey: ['home-notifications'],
        queryFn: () => base44.entities.HomeNotification.list('-created_at', 5),
    });

    const createMutation = useMutation({
        mutationFn: (msg) => base44.entities.HomeNotification.create({ 
            message: msg, 
            is_active: true,
            created_at: new Date().toISOString()
        }),
        onSuccess: () => {
            queryClient.invalidateQueries(['home-notifications']);
            setMessage('');
            toast.success("Notification posted to home page");
        }
    });

    const toggleMutation = useMutation({
        mutationFn: ({ id, is_active }) => base44.entities.HomeNotification.update(id, { is_active }),
        onSuccess: () => {
            queryClient.invalidateQueries(['home-notifications']);
            toast.success("Notification updated");
        }
    });

    const activeNotification = activeNotifications?.find(n => n.is_active);

    return (
        <div className="space-y-6">
            <Card className="bg-stone-50">
                <CardHeader>
                    <CardTitle className="text-base">Publish Home Page Notification</CardTitle>
                    <CardDescription>
                        This message will appear at the top of the home page for all visitors until dismissed or deactivated.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Notification Message</label>
                        <textarea 
                            className="w-full min-h-[100px] p-3 rounded-md border border-stone-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            placeholder="e.g. The cemetery office will be closed on July 4th..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </div>
                    <Button 
                        onClick={() => createMutation.mutate(message)}
                        disabled={!message.trim() || createMutation.isPending}
                        className="bg-teal-700 hover:bg-teal-800"
                    >
                        {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Megaphone className="w-4 h-4 mr-2" />}
                        Post to Home Page
                    </Button>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h3 className="font-medium text-stone-900">Recent Notifications</h3>
                {isLoading ? (
                    <div className="p-4 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
                ) : activeNotifications?.length === 0 ? (
                    <p className="text-stone-500 italic">No notifications found.</p>
                ) : (
                    activeNotifications?.map(note => (
                        <Card key={note.id} className="bg-white">
                            <CardContent className="p-4 flex justify-between items-start gap-4">
                                <div>
                                    <p className="text-stone-800 font-medium">{note.message}</p>
                                    <p className="text-xs text-stone-400 mt-1">Posted: {new Date(note.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-xs px-2 py-1 rounded-full ${note.is_active ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                                        {note.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                    {note.is_active && (
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => toggleMutation.mutate({ id: note.id, is_active: false })}
                                            className="text-red-600 border-red-200 hover:bg-red-50 h-8"
                                        >
                                            Deactivate
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}

import AIEmailAssistant from './AIEmailAssistant';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

function MassNotificationForm({ onSuccess }) {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [targetGroup, setTargetGroup] = useState('all_members');
    const [sendEmail, setSendEmail] = useState(true);
    const [sendInApp, setSendInApp] = useState(true);
    const [isAIOpen, setIsAIOpen] = useState(false);

    const handleApplyAI = (content) => {
        if (content.subject) setSubject(content.subject);
        if (content.body) setMessage(content.body);
        setIsAIOpen(false);
        toast.success("AI content applied");
    };

    const sendMutation = useMutation({
        mutationFn: async (data) => {
            const res = await base44.functions.invoke('communication', {
                action: 'sendMass',
                ...data
            });
            return res.data;
        },
        onSuccess: (data) => {
            if (data.error) {
                toast.error("Failed to send: " + data.error);
            } else {
                toast.success(`Sent to ${data.emailCount} emails and ${data.notifCount} app users.`);
                setSubject('');
                setMessage('');
                if (onSuccess) onSuccess();
            }
        },
        onError: (err) => toast.error("Error: " + err.message)
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!subject || !message) {
            toast.error("Please fill in all fields");
            return;
        }
        if (!sendEmail && !sendInApp) {
            toast.error("Select at least one delivery method");
            return;
        }
        if (confirm("Are you sure you want to send this mass notification? This cannot be undone.")) {
            sendMutation.mutate({ subject, message, targetGroup, sendEmail, sendInApp });
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Target Group</label>
                        <Select value={targetGroup} onValueChange={setTargetGroup}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all_members">All Members</SelectItem>
                                <SelectItem value="plot_owners">Plot Owners</SelectItem>
                                <SelectItem value="employees">Employees</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Delivery Methods</label>
                        <div className="flex gap-4 pt-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="email" checked={sendEmail} onCheckedChange={setSendEmail} />
                                <label htmlFor="email" className="text-sm">Email</label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="push" checked={sendInApp} onCheckedChange={setSendInApp} />
                                <label htmlFor="push" className="text-sm">In-App Notification</label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Assistant Trigger */}
                <div className="flex justify-end">
                    <Sheet open={isAIOpen} onOpenChange={setIsAIOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="sm" className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100">
                                <Sparkles className="w-4 h-4 mr-2" /> AI Assistant
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="sm:max-w-md overflow-y-auto">
                            <SheetHeader className="mb-4">
                                <SheetTitle className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-indigo-600" /> AI Writing Assistant
                                </SheetTitle>
                                <SheetDescription>
                                    Generate drafts, refine content, or analyze your message tone.
                                </SheetDescription>
                            </SheetHeader>
                            <AIEmailAssistant 
                                onApply={handleApplyAI} 
                                currentSubject={subject} 
                                currentBody={message}
                                recipientContext={{ targetGroup }} 
                            />
                        </SheetContent>
                    </Sheet>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Subject</label>
                    <Input 
                        placeholder="e.g., Annual Meeting Reminder" 
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Message Content</label>
                    <Textarea 
                        placeholder="Type your message here..." 
                        className="min-h-[200px]"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                </div>

                <Button 
                    className="w-full bg-teal-700 hover:bg-teal-800"
                    onClick={handleSubmit}
                    disabled={sendMutation.isPending}
                >
                    {sendMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Send Notification
                </Button>
            </div>
        </div>
    );
}

function InboxView() {
    const queryClient = useQueryClient();
    const [selectedThread, setSelectedThread] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('inbox'); // 'inbox' or 'archived'

    const { data, isLoading } = useQuery({
        queryKey: ['admin-conversations'],
        queryFn: async () => {
            const res = await base44.functions.invoke('communication', { action: 'getConversations' });
            return res.data;
        }
    });

    const manageThreadMutation = useMutation({
        mutationFn: async ({ threadId, operation, value }) => {
            return await base44.functions.invoke('communication', {
                action: 'manageThread',
                thread_id: threadId,
                operation,
                value
            });
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries(['admin-conversations']);
            if (variables.operation === 'delete' || (variables.operation === 'archive' && viewMode === 'inbox')) {
                if (selectedThread?.id === variables.threadId) {
                    setSelectedThread(null);
                }
            }
            toast.success("Conversation updated");
        }
    });

    const replyMutation = useMutation({
        mutationFn: async ({ threadId, recipient, body }) => {
            return await base44.functions.invoke('communication', {
                action: 'sendMessage',
                recipient_email: recipient,
                body,
                thread_id: threadId,
                subject: selectedThread?.subject
            });
        },
        onSuccess: () => {
            setReplyText('');
            queryClient.invalidateQueries(['admin-conversations']);
            toast.success("Reply sent");
        }
    });

    const suggestReplyMutation = useMutation({
        mutationFn: async () => {
            if (!selectedThread) return { data: {} };
            const lastFromMember = [...selectedThread.messages].slice().reverse().find(m => selectedThread.participants.includes(m.sender_email));
            const res = await base44.functions.invoke('aiCommunicationAssistant', {
                action: 'suggest_reply',
                data: {
                    message: lastFromMember?.body || selectedThread.messages[selectedThread.messages.length-1]?.body || '',
                    subject: selectedThread.subject
                }
            });
            return res;
        },
        onSuccess: (res) => {
            const reply = res?.data?.reply;
            if (reply) setReplyText(reply);
            else toast.error('AI could not generate a reply');
        }
    });

    const handleReply = () => {
        if (!replyText.trim()) return;
        const recipient = selectedThread.participants[0]; 
        replyMutation.mutate({
            threadId: selectedThread.id,
            recipient: recipient,
            body: replyText
        });
    };

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    const allThreads = data?.threads || [];

    // AI classification for threads (topic, urgency, sentiment)
    const { data: aiClass } = useQuery({
        queryKey: ['ai-classify-threads', allThreads.map(t => t.id).join(',')],
        queryFn: async () => {
            const threads = allThreads.slice(0, 100).map(t => ({ id: t.id, subject: t.subject || '', body: t.messages?.[t.messages.length-1]?.body || '' }));
            const res = await base44.functions.invoke('aiCommunicationAssistant', { action: 'classify_threads', data: { threads } });
            return res.data;
        },
        enabled: allThreads.length > 0,
        staleTime: 5 * 60 * 1000
    });

    const getClass = (id) => aiClass?.classifications?.[id];
    const urgencyColor = {
        low: 'bg-green-100 text-green-700',
        medium: 'bg-amber-100 text-amber-700',
        high: 'bg-orange-100 text-orange-700',
        urgent: 'bg-red-100 text-red-700'
    };
    const sentimentIcon = (s) => s === 'positive' ? <Smile className="w-3 h-3" /> : s === 'negative' ? <Frown className="w-3 h-3" /> : <Meh className="w-3 h-3" />;
    
    // Filter Threads
    const filteredThreads = allThreads.filter(thread => {
        // 1. View Mode
        if (viewMode === 'inbox' && thread.is_archived) return false;
        if (viewMode === 'archived' && !thread.is_archived) return false;

        // 2. Search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchesSubject = (thread.subject || '').toLowerCase().includes(term);
            const matchesParticipant = thread.participants.some(p => p.toLowerCase().includes(term));
            const matchesBody = thread.messages.some(m => (m.body || '').toLowerCase().includes(term));
            return matchesSubject || matchesParticipant || matchesBody;
        }
        return true;
    });

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[70vh]">
            {/* Thread List Column */}
            <div className="md:col-span-1 flex flex-col h-full bg-stone-50 border rounded-md">
                {/* Search & Filters */}
                <div className="p-3 border-b bg-white space-y-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
                        <Input 
                            placeholder="Search messages..." 
                            className="pl-9 bg-stone-50"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant={viewMode === 'inbox' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            className="flex-1 text-xs"
                            onClick={() => setViewMode('inbox')}
                        >
                            <Mail className="w-3 h-3 mr-1.5" /> Inbox
                        </Button>
                        <Button 
                            variant={viewMode === 'archived' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            className="flex-1 text-xs"
                            onClick={() => setViewMode('archived')}
                        >
                            <Archive className="w-3 h-3 mr-1.5" /> Archived
                        </Button>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {filteredThreads.length === 0 ? (
                        <div className="p-8 text-center text-stone-500 text-sm">
                            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p>No {viewMode} messages.</p>
                        </div>
                    ) : (
                        filteredThreads.map(thread => (
                            <div 
                                key={thread.id}
                                className={`p-4 border-b cursor-pointer transition-colors group relative
                                    ${selectedThread?.id === thread.id ? 'bg-white border-l-4 border-l-teal-600 shadow-sm' : 'hover:bg-stone-100'}
                                    ${thread.unread_count > 0 ? 'bg-blue-50/50' : ''}
                                `}
                                onClick={() => setSelectedThread(thread)}
                            >
                                <div className="flex justify-between mb-1 items-start">
                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                        {thread.is_starred && <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />}
                                        <span className={`text-sm truncate ${thread.unread_count > 0 ? 'font-bold text-stone-900' : 'font-semibold text-stone-700'}`}>
                                            {thread.participants[0] || 'Unknown'}
                                        </span>
                                    </div>
                                    <span className="text-xs text-stone-400 shrink-0 ml-2">{format(new Date(thread.last_message), 'MMM d')}</span>
                                </div>
                                <div className={`text-sm truncate mb-0.5 ${thread.unread_count > 0 ? 'font-medium text-stone-900' : 'text-stone-600'}`}>
                                    {thread.subject}
                                </div>
                                <div className="text-xs text-stone-500 truncate pr-4">
                                    {thread.messages[thread.messages.length-1]?.body}
                                </div>
                                {getClass(thread.id) && (
                                    <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[10px]">
                                        <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 inline-flex items-center gap-1"><Tag className="w-3 h-3" /> {getClass(thread.id)?.topic}</span>
                                        <span className={`px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${urgencyColor[getClass(thread.id)?.urgency] || 'bg-stone-100 text-stone-600'}`}>
                                            <AlertTriangle className="w-3 h-3" /> {getClass(thread.id)?.urgency}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 inline-flex items-center gap-1">
                                            {sentimentIcon(getClass(thread.id)?.sentiment)} {getClass(thread.id)?.sentiment}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Message Detail Column */}
            <div className="md:col-span-2 flex flex-col h-full bg-white border rounded-md shadow-sm">
                {selectedThread ? (
                    <div>
                        {/* Header */}
                        <div className="p-4 border-b bg-stone-50 flex justify-between items-start">
                            <div className="overflow-hidden mr-4">
                                <h3 className="font-semibold text-lg truncate flex items-center gap-2">
                                    {selectedThread.is_starred && <Star className="w-4 h-4 fill-amber-400 text-amber-400" />}
                                    {selectedThread.subject}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-stone-500 mt-1">
                                    <User className="w-4 h-4" />
                                    {selectedThread.participants.join(', ')}
                                </div>
                                {getClass(selectedThread.id) && (
                                    <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px]">
                                        <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 inline-flex items-center gap-1"><Tag className="w-3 h-3" /> {getClass(selectedThread.id)?.topic}</span>
                                        <span className={`px-2 py-0.5 rounded inline-flex items-center gap-1 ${urgencyColor[getClass(selectedThread.id)?.urgency] || 'bg-stone-100 text-stone-700'}`}>
                                            <AlertTriangle className="w-3 h-3" /> {getClass(selectedThread.id)?.urgency}
                                        </span>
                                        <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 inline-flex items-center gap-1">
                                            {sentimentIcon(getClass(selectedThread.id)?.sentiment)} {getClass(selectedThread.id)?.sentiment}
                                        </span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => suggestReplyMutation.mutate()} disabled={!selectedThread || suggestReplyMutation.isPending}>
                                    {suggestReplyMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                    AI Suggest Reply
                                </Button>
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-500 hover:text-stone-900">
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => manageThreadMutation.mutate({ 
                                        threadId: selectedThread.id, 
                                        operation: 'star', 
                                        value: !selectedThread.is_starred 
                                    })}>
                                        <Star className={`w-4 h-4 mr-2 ${selectedThread.is_starred ? 'fill-amber-400 text-amber-400' : ''}`} /> 
                                        {selectedThread.is_starred ? 'Unstar' : 'Star'}
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuItem onClick={() => manageThreadMutation.mutate({
                                        threadId: selectedThread.id,
                                        operation: 'read',
                                        value: selectedThread.unread_count > 0
                                    })}>
                                        {selectedThread.unread_count > 0 ? (
                                            <><MailOpen className="w-4 h-4 mr-2" /> Mark as Read</>
                                        ) : (
                                            <><MailIcon className="w-4 h-4 mr-2" /> Mark as Unread</>
                                        )}
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuItem onClick={() => manageThreadMutation.mutate({ 
                                        threadId: selectedThread.id, 
                                        operation: 'archive', 
                                        value: !selectedThread.is_archived 
                                    })}>
                                        <Archive className="w-4 h-4 mr-2" /> 
                                        {selectedThread.is_archived ? 'Move to Inbox' : 'Archive'}
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => {
                                        if(confirm('Delete this conversation permanently?')) {
                                            manageThreadMutation.mutate({ threadId: selectedThread.id, operation: 'delete' });
                                        }
                                    }}>
                                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/30">
                            {selectedThread.messages.map(msg => {
                                const isAdmin = !selectedThread.participants.includes(msg.sender_email);
                                return (
                                    <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                                            isAdmin 
                                            ? 'bg-teal-700 text-white rounded-br-none' 
                                            : 'bg-white text-stone-800 border border-stone-100 rounded-bl-none'
                                        }`}>
                                            <div className={`text-[10px] mb-1 flex justify-between gap-4 ${isAdmin ? 'text-teal-200' : 'text-stone-400'}`}>
                                                <span>{isAdmin ? 'You' : msg.sender_email}</span>
                                                <span>{format(new Date(msg.created_date), 'p')}</span>
                                            </div>
                                            <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.body}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Reply Box */}
                        <div className="p-4 border-t bg-white">
                            <div className="flex gap-3 items-end">
                                <Textarea 
                                    placeholder="Type your reply..." 
                                    className="min-h-[80px] bg-stone-50 resize-none focus:bg-white transition-colors"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleReply();
                                        }
                                    }}
                                />
                                <Button 
                                    className="h-[80px] w-14 bg-teal-700 hover:bg-teal-800 flex flex-col gap-1"
                                    onClick={handleReply}
                                    disabled={replyMutation.isPending || !replyText.trim()}
                                    title="Send Reply (Ctrl+Enter)"
                                >
                                    {replyMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    <span className="text-[10px]">Send</span>
                                </Button>
                            </div>
                            <div className="text-[10px] text-stone-400 mt-2 text-right">
                                Press Enter to send, Shift+Enter for new line
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-stone-300">
                        <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
                        <p className="font-medium text-lg text-stone-400">Select a conversation</p>
                        <p className="text-sm">Choose a thread from the list to view details</p>
                    </div>
                )}
            </div>
        </div>
    );
}