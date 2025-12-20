import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from 'date-fns';
import { Send, MessageSquare, Loader2, Plus } from 'lucide-react';
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function MemberPortal() {
    const queryClient = useQueryClient();
    const [selectedThread, setSelectedThread] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [isNewOpen, setIsNewOpen] = useState(false);

    // Authentication Check
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    React.useEffect(() => {
        base44.auth.me().then(u => {
            setUser(u);
            setAuthLoading(false);
        }).catch(() => setAuthLoading(false));
    }, []);

    const { data: threadsData, isLoading: threadsLoading } = useQuery({
        queryKey: ['member-conversations'],
        queryFn: async () => {
            const res = await base44.functions.invoke('communication', { action: 'getConversations' });
            return res.data;
        },
        enabled: !!user
    });

    const replyMutation = useMutation({
        mutationFn: async ({ threadId, body }) => {
            return await base44.functions.invoke('communication', {
                action: 'sendMessage',
                recipient_email: 'ADMIN',
                body,
                thread_id: threadId,
                subject: selectedThread?.subject
            });
        },
        onSuccess: () => {
            setReplyText('');
            queryClient.invalidateQueries(['member-conversations']);
        }
    });

    const createMutation = useMutation({
        mutationFn: async (data) => {
            return await base44.functions.invoke('communication', {
                action: 'sendMessage',
                recipient_email: 'ADMIN',
                thread_id: crypto.randomUUID(),
                ...data
            });
        },
        onSuccess: () => {
            setIsNewOpen(false);
            queryClient.invalidateQueries(['member-conversations']);
            toast.success("Inquiry sent successfully");
        }
    });

    if (authLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline mr-2" /> Loading portal...</div>;
    
    if (!user) {
        return (
            <div className="max-w-md mx-auto mt-12 text-center p-8 bg-white rounded-lg shadow-lg">
                <h2 className="text-2xl font-serif text-teal-800 mb-4">Member Portal</h2>
                <p className="text-stone-600 mb-6">Please log in to access your messages and submit inquiries.</p>
                <Button onClick={() => base44.auth.redirectToLogin()} className="bg-teal-700 w-full">Log In</Button>
            </div>
        );
    }

    const threads = threadsData?.threads || [];

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-serif text-teal-900">Member Portal</h1>
                    <p className="text-stone-600">Communicate directly with cemetery administrators</p>
                </div>
                <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-teal-700 hover:bg-teal-800">
                            <Plus className="w-4 h-4 mr-2" /> New Inquiry
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Submit New Inquiry</DialogTitle>
                        </DialogHeader>
                        <NewInquiryForm onSubmit={(data) => createMutation.mutate(data)} isSubmitting={createMutation.isPending} />
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px] bg-white rounded-xl shadow-sm border overflow-hidden">
                {/* Thread List */}
                <div className="border-r bg-stone-50 overflow-y-auto">
                    {threads.length === 0 ? (
                        <div className="p-8 text-center text-stone-500">
                            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No messages yet.</p>
                            <p className="text-xs">Start a new inquiry above.</p>
                        </div>
                    ) : (
                        threads.map(thread => (
                            <div 
                                key={thread.id}
                                className={`p-4 border-b cursor-pointer hover:bg-stone-100 transition-colors ${selectedThread?.id === thread.id ? 'bg-white border-l-4 border-l-teal-600' : ''}`}
                                onClick={() => setSelectedThread(thread)}
                            >
                                <div className="flex justify-between mb-1">
                                    <span className="font-semibold text-sm text-stone-900 truncate">{thread.subject}</span>
                                    {thread.unread_count > 0 && <span className="bg-red-500 w-2 h-2 rounded-full"></span>}
                                </div>
                                <div className="text-xs text-stone-500 mb-1">{format(new Date(thread.last_message), 'MMM d, h:mm a')}</div>
                                <div className="text-sm text-stone-600 truncate">{thread.messages[thread.messages.length-1]?.body}</div>
                            </div>
                        ))
                    )}
                </div>

                {/* Message View */}
                <div className="md:col-span-2 flex flex-col h-full">
                    {selectedThread ? (
                        <>
                            <div className="p-4 border-b bg-white shadow-sm z-10">
                                <h3 className="font-semibold text-lg text-teal-900">{selectedThread.subject}</h3>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/50">
                                {selectedThread.messages.map(msg => {
                                    const isMe = msg.sender_email === user.email;
                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] rounded-lg p-3 shadow-sm ${isMe ? 'bg-teal-600 text-white' : 'bg-white text-stone-800 border'}`}>
                                                <div className="text-xs opacity-80 mb-1 flex justify-between gap-4">
                                                    <span>{isMe ? 'You' : 'Admin'}</span>
                                                    <span>{format(new Date(msg.created_date), 'p')}</span>
                                                </div>
                                                <div className="whitespace-pre-wrap text-sm">{msg.body}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="p-4 bg-white border-t">
                                <div className="flex gap-2">
                                    <Textarea 
                                        placeholder="Type your reply..." 
                                        className="min-h-[80px]"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                    />
                                    <Button 
                                        className="h-auto bg-teal-700 hover:bg-teal-800"
                                        onClick={() => replyMutation.mutate({ threadId: selectedThread.id, body: replyText })}
                                        disabled={!replyText.trim() || replyMutation.isPending}
                                    >
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-stone-400">
                            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                            <p>Select a conversation to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function NewInquiryForm({ onSubmit, isSubmitting }) {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!subject || !body) {
            toast.error("Please fill in all fields");
            return;
        }
        onSubmit({ subject, body });
    };

    return (
        <div className="space-y-4 pt-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <Input 
                    placeholder="e.g., Plot Maintenance Question" 
                    value={subject} 
                    onChange={e => setSubject(e.target.value)} 
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <Textarea 
                    placeholder="How can we help you?" 
                    className="min-h-[150px]"
                    value={body}
                    onChange={e => setBody(e.target.value)}
                />
            </div>
            <Button onClick={handleSubmit} className="w-full bg-teal-700" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : 'Send Inquiry'}
            </Button>
        </div>
    );
}