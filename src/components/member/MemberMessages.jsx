import React, { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format, isValid, parseISO } from 'date-fns';
import { Send, MessageSquare, Loader2, Plus, Mail, Trash2, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Safe date formatter
const safeFormat = (dateStr, formatStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return isValid(d) ? format(d, formatStr) : '';
  } catch { return ''; }
};

// Memoized message bubble
const MessageBubble = memo(function MessageBubble({ msg, isMe }) {
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-2.5 sm:p-3 shadow-sm ${isMe ? 'bg-teal-600 text-white' : 'bg-white text-stone-800 border'}`}>
        <div className="text-[10px] sm:text-xs opacity-80 mb-1 flex justify-between gap-3 sm:gap-4">
          <span>{isMe ? 'You' : 'Admin'}</span>
          <span>{safeFormat(msg.created_date, 'p')}</span>
        </div>
        <div className="whitespace-pre-wrap text-sm">{msg.body}</div>
      </div>
    </div>
  );
});

// Memoized thread item
const ThreadItem = memo(function ThreadItem({ thread, isSelected, onSelect, onDelete }) {
  return (
    <div 
      className={`p-3 sm:p-4 border-b cursor-pointer hover:bg-stone-100 transition-colors ${isSelected ? 'bg-white border-l-4 border-l-teal-600' : ''}`}
      onClick={onSelect}
    >
      <div className="flex justify-between mb-1 gap-2">
        <span className="font-semibold text-xs sm:text-sm text-stone-900 truncate flex-1">{thread.subject}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {thread.unread_count > 0 && <span className="bg-red-500 w-2 h-2 rounded-full" />}
          <button
            className="p-1 rounded hover:bg-red-50 text-stone-400 hover:text-red-600 touch-manipulation"
            onClick={(e) => { e.stopPropagation(); onDelete(thread.id); }}
            title="Delete thread"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
      <div className="text-[10px] sm:text-xs text-stone-500 mb-1">{safeFormat(thread.last_message, 'MMM d, h:mm a')}</div>
      <div className="text-xs sm:text-sm text-stone-600 truncate">{thread.messages[thread.messages.length-1]?.body}</div>
    </div>
  );
});

const MemberMessages = memo(function MemberMessages({ user }) {
    const queryClient = useQueryClient();
    const [selectedThread, setSelectedThread] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [isNewOpen, setIsNewOpen] = useState(false);
    const [mobileShowThread, setMobileShowThread] = useState(false);

    const { data: threadsData, isLoading: threadsLoading, isError, refetch } = useQuery({
        queryKey: ['member-conversations'],
        queryFn: async () => {
            const res = await base44.functions.invoke('communication', { action: 'getConversations' });
            return res.data;
        },
        enabled: !!user,
        staleTime: 60_000,
        retry: 2,
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
            toast.success("Message sent to administration");
        },
        onError: (err) => {
            toast.error("Failed to send message: " + (err.message || "Please try again"));
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
            toast.success("Inquiry sent to administration");
        },
        onError: (err) => {
            toast.error("Failed to send inquiry: " + (err.message || "Please try again"));
        }
    });

    const deleteThreadMutation = useMutation({
        mutationFn: async (threadId) => {
            return await base44.functions.invoke('communication', {
                action: 'manageThread',
                thread_id: threadId,
                operation: 'delete'
            });
        },
        onSuccess: () => {
            if (selectedThread?.id) setSelectedThread(null);
            setMobileShowThread(false);
            queryClient.invalidateQueries(['member-conversations']);
        }
    });

    const threads = useMemo(() => threadsData?.threads || [], [threadsData?.threads]);

    useEffect(() => {
        if (threads.length > 0 && !selectedThread) {
            setSelectedThread(threads[0]);
        }
    }, [threads, selectedThread]);

    const handleSelectThread = useCallback((thread) => {
        setSelectedThread(thread);
        setMobileShowThread(true);
    }, []);

    const handleDeleteThread = useCallback((threadId) => {
        deleteThreadMutation.mutate(threadId);
    }, [deleteThreadMutation]);

    const handleBackToList = useCallback(() => {
        setMobileShowThread(false);
    }, []);

    const handleReplyChange = useCallback((e) => {
        setReplyText(e.target.value);
    }, []);

    const handleSendReply = useCallback(() => {
        if (!replyText.trim() || !selectedThread) return;
        replyMutation.mutate({ threadId: selectedThread.id, body: replyText });
    }, [replyText, selectedThread, replyMutation]);

    return (
        <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-teal-900 flex items-center gap-2">
                        <Mail className="w-5 h-5 sm:w-6 sm:h-6" /> Messages
                    </h2>
                    <p className="text-stone-600 text-xs sm:text-sm">Direct line to cemetery administration</p>
                </div>
                <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-teal-700 hover:bg-teal-800 h-9 text-sm w-full sm:w-auto touch-manipulation">
                            <Plus className="w-4 h-4 mr-1.5" /> New Inquiry
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg mx-4 sm:mx-auto">
                        <DialogHeader>
                            <DialogTitle>Submit New Inquiry</DialogTitle>
                        </DialogHeader>
                        <NewInquiryForm onSubmit={(data) => createMutation.mutate(data)} isSubmitting={createMutation.isPending} />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Error state */}
            {isError && (
                <div className="text-center py-8 border-2 border-dashed border-red-200 rounded-lg bg-red-50">
                    <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <p className="text-sm text-red-600">Failed to load messages</p>
                    <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3 h-8 text-xs">
                        <RefreshCw className="w-3.5 h-3.5 mr-1" /> Try Again
                    </Button>
                </div>
            )}

            {/* Loading state */}
            {threadsLoading && (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                    <span className="text-sm text-stone-500">Loading messages...</span>
                </div>
            )}

            {/* Main content */}
            {!isError && !threadsLoading && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    {/* Mobile: Show either list or thread */}
                    <div className="md:hidden">
                        {!mobileShowThread ? (
                            // Thread List (Mobile)
                            <div className="max-h-[65vh] overflow-y-auto">
                                {threads.length === 0 ? (
                                    <div className="p-8 text-center text-stone-500">
                                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No messages yet.</p>
                                        <p className="text-xs mt-1">Start a new inquiry above.</p>
                                    </div>
                                ) : (
                                    threads.map(thread => (
                                        <ThreadItem 
                                            key={thread.id}
                                            thread={thread}
                                            isSelected={selectedThread?.id === thread.id}
                                            onSelect={() => handleSelectThread(thread)}
                                            onDelete={handleDeleteThread}
                                        />
                                    ))
                                )}
                            </div>
                        ) : selectedThread ? (
                            // Thread View (Mobile)
                            <div className="flex flex-col h-[65vh]">
                                <div className="p-3 border-b bg-white flex items-center gap-2 shrink-0">
                                    <Button variant="ghost" size="icon" onClick={handleBackToList} className="h-8 w-8 touch-manipulation">
                                        <ArrowLeft className="w-4 h-4" />
                                    </Button>
                                    <h3 className="font-semibold text-base text-teal-900 truncate flex-1">{selectedThread.subject}</h3>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-stone-50/50">
                                    {selectedThread.messages.map(msg => (
                                        <MessageBubble key={msg.id} msg={msg} isMe={msg.sender_email === user.email} />
                                    ))}
                                </div>
                                <div className="p-3 bg-white border-t shrink-0">
                                    <div className="flex gap-2">
                                        <Textarea 
                                            placeholder="Type your reply..." 
                                            className="min-h-[60px] text-base"
                                            value={replyText}
                                            onChange={handleReplyChange}
                                        />
                                        <Button 
                                            className="h-auto bg-teal-700 hover:bg-teal-800 touch-manipulation px-3"
                                            onClick={handleSendReply}
                                            disabled={!replyText.trim() || replyMutation.isPending}
                                        >
                                            {replyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {/* Desktop: Side-by-side layout */}
                    <div className="hidden md:grid md:grid-cols-3 h-[65vh]">
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
                                    <ThreadItem 
                                        key={thread.id}
                                        thread={thread}
                                        isSelected={selectedThread?.id === thread.id}
                                        onSelect={() => setSelectedThread(thread)}
                                        onDelete={handleDeleteThread}
                                    />
                                ))
                            )}
                        </div>

                        {/* Message View */}
                        <div className="md:col-span-2 flex flex-col">
                            {selectedThread ? (
                                <>
                                    <div className="p-4 border-b bg-white shadow-sm">
                                        <h3 className="font-semibold text-lg text-teal-900">{selectedThread.subject}</h3>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/50">
                                        {selectedThread.messages.map(msg => (
                                            <MessageBubble key={msg.id} msg={msg} isMe={msg.sender_email === user.email} />
                                        ))}
                                    </div>
                                    <div className="p-4 bg-white border-t">
                                        <div className="flex gap-2">
                                            <Textarea 
                                                placeholder="Type your reply..." 
                                                className="min-h-[80px]"
                                                value={replyText}
                                                onChange={handleReplyChange}
                                            />
                                            <Button 
                                                className="h-auto bg-teal-700 hover:bg-teal-800"
                                                onClick={handleSendReply}
                                                disabled={!replyText.trim() || replyMutation.isPending}
                                            >
                                                {replyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
            )}
        </div>
    );
});

const NewInquiryForm = memo(function NewInquiryForm({ onSubmit, isSubmitting }) {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        if (!subject.trim() || !body.trim()) {
            toast.error("Please fill in all fields");
            return;
        }
        onSubmit({ subject: subject.trim(), body: body.trim() });
    }, [subject, body, onSubmit]);

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-1.5">
                <label className="text-sm font-medium">Subject</label>
                <Input 
                    placeholder="e.g., Plot Maintenance Question" 
                    value={subject} 
                    onChange={e => setSubject(e.target.value)}
                    className="h-10 sm:h-9 text-base sm:text-sm"
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-sm font-medium">Message</label>
                <Textarea 
                    placeholder="How can we help you?" 
                    className="min-h-[120px] sm:min-h-[150px] text-base sm:text-sm"
                    value={body}
                    onChange={e => setBody(e.target.value)}
                />
            </div>
            <Button type="submit" className="w-full bg-teal-700 h-10 sm:h-9 touch-manipulation" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                {isSubmitting ? 'Sending...' : 'Send Inquiry'}
            </Button>
        </form>
    );
});

export default MemberMessages;