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
import { Send, Mail, MessageSquare, Loader2, User, RefreshCw, CheckCircle2, Sparkles, Lightbulb, Megaphone, X } from 'lucide-react';
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

function MassNotificationForm({ onSuccess }) {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [targetGroup, setTargetGroup] = useState('all_members');
    const [sendEmail, setSendEmail] = useState(true);
    const [sendInApp, setSendInApp] = useState(true);

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

    const { data, isLoading } = useQuery({
        queryKey: ['admin-conversations'],
        queryFn: async () => {
            const res = await base44.functions.invoke('communication', { action: 'getConversations' });
            return res.data;
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
            // Optimistically update UI logic if needed, but re-fetch is safer for messages
            toast.success("Reply sent");
        }
    });

    const handleReply = () => {
        if (!replyText.trim()) return;
        // Determine recipient (the participant that isn't ADMIN/Me)
        // Since this is Admin view, recipient is the participant email
        const recipient = selectedThread.participants[0]; 
        replyMutation.mutate({
            threadId: selectedThread.id,
            recipient: recipient,
            body: replyText
        });
    };

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    const threads = data?.threads || [];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
            {/* Thread List */}
            <div className="border rounded-md md:col-span-1 overflow-y-auto bg-stone-50">
                {threads.length === 0 ? (
                    <div className="p-4 text-center text-stone-500">No messages yet.</div>
                ) : (
                    threads.map(thread => (
                        <div 
                            key={thread.id}
                            className={`p-4 border-b cursor-pointer hover:bg-stone-100 transition-colors ${selectedThread?.id === thread.id ? 'bg-white border-l-4 border-l-teal-600 shadow-sm' : ''}`}
                            onClick={() => setSelectedThread(thread)}
                        >
                            <div className="flex justify-between mb-1">
                                <span className="font-semibold text-sm truncate">{thread.participants[0] || 'Unknown'}</span>
                                <span className="text-xs text-stone-400">{format(new Date(thread.last_message), 'MMM d')}</span>
                            </div>
                            <div className="text-sm font-medium truncate text-stone-800">{thread.subject}</div>
                            <div className="text-xs text-stone-500 truncate">{thread.messages[thread.messages.length-1]?.body}</div>
                        </div>
                    ))
                )}
            </div>

            {/* Message Detail */}
            <div className="border rounded-md md:col-span-2 flex flex-col bg-white">
                {selectedThread ? (
                    <>
                        <div className="p-4 border-b bg-stone-50">
                            <h3 className="font-semibold text-lg">{selectedThread.subject}</h3>
                            <div className="flex items-center gap-2 text-sm text-stone-500">
                                <User className="w-4 h-4" />
                                {selectedThread.participants.join(', ')}
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {selectedThread.messages.map(msg => {
                                const isAdmin = !selectedThread.participants.includes(msg.sender_email); // If sender is NOT in participants list (which filters out ADMIN), assume it's admin
                                // Wait, the logic above for participants filtered out 'ADMIN'. 
                                // So if sender_email is NOT in that list, it must be the admin user.
                                return (
                                    <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] rounded-lg p-3 ${isAdmin ? 'bg-teal-100 text-teal-900' : 'bg-stone-100 text-stone-900'}`}>
                                            <div className="text-xs opacity-70 mb-1 flex justify-between gap-4">
                                                <span>{isAdmin ? 'Admin' : msg.sender_email}</span>
                                                <span>{format(new Date(msg.created_date), 'p')}</span>
                                            </div>
                                            <div className="whitespace-pre-wrap text-sm">{msg.body}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-4 border-t bg-stone-50">
                            <div className="flex gap-2">
                                <Textarea 
                                    placeholder="Type your reply..." 
                                    className="min-h-[80px] bg-white"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                />
                                <Button 
                                    className="h-auto bg-teal-700 hover:bg-teal-800"
                                    onClick={handleReply}
                                    disabled={replyMutation.isPending}
                                >
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-stone-400">
                        <MessageSquare className="w-12 h-12 mb-2" />
                        <p>Select a conversation to view</p>
                    </div>
                )}
            </div>
        </div>
    );
}