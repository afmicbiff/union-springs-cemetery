import React, { useState, useCallback, memo, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Mail, MessageSquare, Loader2, User, RefreshCw, Sparkles, Lightbulb, Megaphone, Archive, Trash2, Star, Search, MoreVertical, MailOpen, Mail as MailIcon, Tag, AlertTriangle, Smile, Meh, Frown, Wand2, AlertCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { format, parseISO, isValid } from 'date-fns';
import AIEmailAssistant from './AIEmailAssistant';

// Safe date formatting helper
function safeFormatDate(dateStr, formatStr = 'MMM d') {
  if (!dateStr) return '';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    return isValid(d) ? format(d, formatStr) : '';
  } catch { return ''; }
}

function CommunicationCenter() {
  const [activeTab, setActiveTab] = useState('inbox');
  
  const handleTabChange = useCallback((value) => {
    setActiveTab(value);
  }, []);

  return (
    <Card className="min-h-[600px]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          <Mail className="w-5 h-5" /> Communication Center
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">Manage mass notifications and direct messages with members.</CardDescription>
      </CardHeader>
      <CardContent className="px-3 md:px-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-4 flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="inbox" className="flex items-center gap-1.5 text-xs md:text-sm px-2 md:px-3 h-9"><MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden xs:inline">Inbox</span><span className="xs:hidden">Inbox</span></TabsTrigger>
            <TabsTrigger value="compose" className="flex items-center gap-1.5 text-xs md:text-sm px-2 md:px-3 h-9"><Send className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden sm:inline">Mass Notification</span><span className="sm:hidden">Mass</span></TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-1.5 text-xs md:text-sm px-2 md:px-3 h-9"><Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden sm:inline">AI Campaigns</span><span className="sm:hidden">AI</span></TabsTrigger>
            <TabsTrigger value="home-alert" className="flex items-center gap-1.5 text-xs md:text-sm px-2 md:px-3 h-9"><Megaphone className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden sm:inline">Home Page</span><span className="sm:hidden">Home</span></TabsTrigger>
          </TabsList>
          <TabsContent value="inbox"><InboxView /></TabsContent>
          <TabsContent value="compose"><MassNotificationForm onSuccess={() => handleTabChange('inbox')} /></TabsContent>
          <TabsContent value="campaigns"><CampaignSuggestions /></TabsContent>
          <TabsContent value="home-alert"><HomeNotificationManager /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default memo(CommunicationCenter);

const CampaignSuggestions = memo(function CampaignSuggestions() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['ai-campaigns'],
    queryFn: async () => {
      const res = await base44.functions.invoke('aiCommunicationAssistant', { action: 'suggest_campaigns', data: {} });
      return res.data;
    },
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 120,
    retry: 2,
  });
  
  const campaigns = useMemo(() => data?.campaigns || [], [data]);
  
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-stone-600 mb-3">Failed to load AI campaigns</p>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
          {isFetching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-base md:text-lg font-medium">AI Campaign Suggestions</h3>
          <p className="text-xs md:text-sm text-stone-500">Engage members with timely, relevant communications.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading || isFetching} className="h-9 shrink-0">
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
      ) : campaigns.length === 0 ? (
        <div className="text-center p-8 text-stone-500 italic">No campaign suggestions available.</div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((c, idx) => (
            <Card key={idx} className="bg-stone-50">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm md:text-base flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500 shrink-0" /><span className="truncate">{c.title}</span></CardTitle>
                <CardDescription className="text-xs md:text-sm">{c.description}</CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-xs md:text-sm space-y-2">
                  <div><span className="font-semibold">Target:</span> {c.target_audience}</div>
                  <div><span className="font-semibold">Subject Idea:</span> {c.suggested_subject}</div>
                  <Button size="sm" variant="secondary" className="mt-2 w-full sm:w-auto h-9">Draft this Campaign</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
});

const HomeNotificationManager = memo(function HomeNotificationManager() {
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();
  
  const { data: activeNotifications, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['home-notifications'],
    queryFn: () => base44.entities.HomeNotification.list('-created_at', 5),
    staleTime: 2 * 60_000,
    retry: 2,
  });
  
  const createMutation = useMutation({
    mutationFn: (msg) => base44.entities.HomeNotification.create({ message: msg, is_active: true, created_at: new Date().toISOString() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['home-notifications'] }); setMessage(''); toast.success('Notification posted to home page'); },
    onError: (err) => toast.error('Failed to post: ' + err.message),
  });
  
  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.HomeNotification.update(id, { is_active }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['home-notifications'] }); toast.success('Notification updated'); },
    onError: (err) => toast.error('Failed to update: ' + err.message),
  });

  const handleMessageChange = useCallback((e) => setMessage(e.target.value), []);
  const handlePost = useCallback(() => createMutation.mutate(message), [createMutation, message]);
  const handleToggle = useCallback((id, is_active) => toggleMutation.mutate({ id, is_active }), [toggleMutation]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-stone-600 mb-3">Failed to load notifications</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-stone-50">
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-sm md:text-base">Publish Home Page Notification</CardTitle>
          <CardDescription className="text-xs md:text-sm">This message will appear at the top of the home page for all visitors until dismissed or deactivated.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4">
          <div className="space-y-2">
            <label className="text-xs md:text-sm font-medium">Notification Message</label>
            <textarea 
              className="w-full min-h-[100px] p-3 rounded-md border border-stone-300 focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm" 
              placeholder="e.g. The cemetery office will be closed on July 4th..." 
              value={message} 
              onChange={handleMessageChange} 
            />
          </div>
          <Button onClick={handlePost} disabled={!message.trim() || createMutation.isPending} className="bg-teal-700 hover:bg-teal-800 h-10 w-full sm:w-auto">
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Megaphone className="w-4 h-4 mr-2" />} Post to Home Page
          </Button>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <h3 className="font-medium text-stone-900 text-sm md:text-base">Recent Notifications</h3>
        {isLoading ? (
          <div className="p-4 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-600" /></div>
        ) : activeNotifications?.length === 0 ? (
          <p className="text-stone-500 italic text-sm">No notifications found.</p>
        ) : (
          activeNotifications?.map(note => (
            <Card key={note.id} className="bg-white">
              <CardContent className="p-3 md:p-4 flex flex-col sm:flex-row justify-between items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-stone-800 font-medium text-sm md:text-base break-words">{note.message}</p>
                  <p className="text-xs text-stone-400 mt-1">Posted: {safeFormatDate(note.created_at, 'MMM d, yyyy')}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${note.is_active ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>{note.is_active ? 'Active' : 'Inactive'}</span>
                  {note.is_active && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleToggle(note.id, false)} 
                      disabled={toggleMutation.isPending}
                      className="text-red-600 border-red-200 hover:bg-red-50 h-8 text-xs"
                    >
                      {toggleMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Deactivate'}
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
});

const MassNotificationForm = memo(function MassNotificationForm({ onSuccess }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [targetGroup, setTargetGroup] = useState('all_members');
  const [sendEmail, setSendEmail] = useState(true);
  const [sendInApp, setSendInApp] = useState(true);
  const [isAIOpen, setIsAIOpen] = useState(false);

  const handleApplyAI = useCallback((content) => {
    if (content.subject) setSubject(content.subject);
    if (content.body) setMessage(content.body);
    setIsAIOpen(false);
    toast.success('AI content applied');
  }, []);

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      const res = await base44.functions.invoke('communication', { action: 'sendMass', ...data });
      return res.data;
    },
    onSuccess: (data) => {
      if (data.error) {
        toast.error('Failed to send: ' + data.error);
      } else {
        toast.success(`Sent to ${data.emailCount} emails and ${data.notifCount} app users.`);
        setSubject('');
        setMessage('');
        if (onSuccess) onSuccess();
      }
    },
    onError: (err) => toast.error('Error: ' + err.message),
  });

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!subject || !message) return toast.error('Please fill in all fields');
    if (!sendEmail && !sendInApp) return toast.error('Select at least one delivery method');
    if (confirm('Are you sure you want to send this mass notification? This cannot be undone.')) {
      sendMutation.mutate({ subject, message, targetGroup, sendEmail, sendInApp });
    }
  }, [subject, message, sendEmail, sendInApp, targetGroup, sendMutation]);

  const handleSubjectChange = useCallback((e) => setSubject(e.target.value), []);
  const handleMessageChange = useCallback((e) => setMessage(e.target.value), []);
  const handleEmailToggle = useCallback((e) => setSendEmail(e.target.checked), []);
  const handleInAppToggle = useCallback((e) => setSendInApp(e.target.checked), []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs md:text-sm font-medium">Target Group</label>
            <Select value={targetGroup} onValueChange={setTargetGroup}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all_members">All Members</SelectItem>
                <SelectItem value="plot_owners">Plot Owners</SelectItem>
                <SelectItem value="employees">Employees</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs md:text-sm font-medium">Delivery Methods</label>
            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={sendEmail} onChange={handleEmailToggle} className="w-4 h-4" />
                <span className="text-xs md:text-sm">Email</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={sendInApp} onChange={handleInAppToggle} className="w-4 h-4" />
                <span className="text-xs md:text-sm whitespace-nowrap">In-App</span>
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Sheet open={isAIOpen} onOpenChange={setIsAIOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 h-9">
                <Sparkles className="w-4 h-4 mr-2" /> AI Assistant
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-md overflow-y-auto">
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-indigo-600" /> AI Writing Assistant</SheetTitle>
                <SheetDescription>Generate drafts, refine content, or analyze your message tone.</SheetDescription>
              </SheetHeader>
              <AIEmailAssistant onApply={handleApplyAI} currentSubject={subject} currentBody={message} recipientContext={{ targetGroup }} />
            </SheetContent>
          </Sheet>
        </div>
        <div className="space-y-2">
          <label className="text-xs md:text-sm font-medium">Subject</label>
          <Input placeholder="e.g., Annual Meeting Reminder" value={subject} onChange={handleSubjectChange} className="h-10" />
        </div>
        <div className="space-y-2">
          <label className="text-xs md:text-sm font-medium">Message Content</label>
          <Textarea placeholder="Type your message here..." className="min-h-[150px] md:min-h-[200px]" value={message} onChange={handleMessageChange} />
        </div>
        <Button className="w-full bg-teal-700 hover:bg-teal-800 h-10" onClick={handleSubmit} disabled={sendMutation.isPending}>
          {sendMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Send Notification
        </Button>
      </div>
    </div>
  );
});

const InboxView = memo(function InboxView() {
  const queryClient = useQueryClient();
  const [selectedThread, setSelectedThread] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('inbox');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-conversations'],
    queryFn: async () => {
      const res = await base44.functions.invoke('communication', { action: 'getConversations' });
      return res.data;
    },
    staleTime: 2 * 60_000,
    retry: 2,
  });

  // Call dependent hooks before any early return to keep hook order stable
  const allThreads = useMemo(() => data?.threads || [], [data]);

  const { data: aiClass } = useQuery({
    queryKey: ['ai-classify-threads', allThreads.map(t => t.id).join(',')],
    queryFn: async () => {
      const threads = allThreads.slice(0, 100).map(t => ({ id: t.id, subject: t.subject || '', body: t.messages?.[t.messages.length-1]?.body || '' }));
      const res = await base44.functions.invoke('aiCommunicationAssistant', { action: 'classify_threads', data: { threads } });
      return res.data;
    },
    enabled: allThreads.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const manageThreadMutation = useMutation({
    mutationFn: async ({ threadId, operation, value }) => base44.functions.invoke('communication', { action: 'manageThread', thread_id: threadId, operation, value }),
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ['admin-conversations'] });
      if (v.operation === 'delete' || (v.operation === 'archive' && viewMode === 'inbox')) {
        if (selectedThread?.id === v.threadId) setSelectedThread(null);
      }
      toast.success('Conversation updated');
    },
    onError: (err) => toast.error('Failed: ' + err.message),
  });

  const replyMutation = useMutation({
    mutationFn: async ({ threadId, recipient, body }) => base44.functions.invoke('communication', { action: 'sendMessage', recipient_email: recipient, body, thread_id: threadId, subject: selectedThread?.subject }),
    onSuccess: () => {
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['admin-conversations'] });
      toast.success('Reply sent');
    },
    onError: (err) => toast.error('Failed to send: ' + err.message),
  });

  const suggestReplyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedThread) return { data: {} };
      const lastFromMember = [...selectedThread.messages].slice().reverse().find(m => selectedThread.participants.includes(m.sender_email));
      return base44.functions.invoke('aiCommunicationAssistant', { action: 'suggest_reply', data: { message: lastFromMember?.body || selectedThread.messages[selectedThread.messages.length-1]?.body || '', subject: selectedThread.subject } });
    },
    onSuccess: (res) => {
      const reply = res?.data?.reply;
      if (reply) setReplyText(reply); else toast.error('AI could not generate a reply');
    },
    onError: () => toast.error('AI suggestion failed'),
  });

  const handleSearchChange = useCallback((e) => setSearchTerm(e.target.value), []);
  const handleSelectThread = useCallback((thread) => setSelectedThread(thread), []);
  const handleReplyChange = useCallback((e) => setReplyText(e.target.value), []);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-stone-600 mb-3">Failed to load conversations</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} Try Again
        </Button>
      </div>
    );
  }

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>;

  const getClass = useCallback((id) => aiClass?.classifications?.[id], [aiClass]);
  const urgencyColor = useMemo(() => ({ low: 'bg-green-100 text-green-700', medium: 'bg-amber-100 text-amber-700', high: 'bg-orange-100 text-orange-700', urgent: 'bg-red-100 text-red-700' }), []);
  const sentimentIcon = useCallback((s) => (s === 'positive' ? <Smile className="w-3 h-3" /> : s === 'negative' ? <Frown className="w-3 h-3" /> : <Meh className="w-3 h-3" />), []);

  const filteredThreads = useMemo(() => allThreads.filter(thread => {
    if (viewMode === 'inbox' && thread.is_archived) return false;
    if (viewMode === 'archived' && !thread.is_archived) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesSubject = (thread.subject || '').toLowerCase().includes(term);
      const matchesParticipant = thread.participants.some(p => p.toLowerCase().includes(term));
      const matchesBody = thread.messages.some(m => (m.body || '').toLowerCase().includes(term));
      return matchesSubject || matchesParticipant || matchesBody;
    }
    return true;
  }), [allThreads, viewMode, searchTerm]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 h-auto md:h-[70vh] min-h-0">
      <div className="md:col-span-1 flex flex-col h-[50vh] md:h-full min-h-0 bg-stone-50 border rounded-md">
        <div className="p-2 md:p-3 border-b bg-white space-y-2 md:space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
            <Input placeholder="Search messages..." className="pl-9 bg-stone-50 h-9 text-sm" value={searchTerm} onChange={handleSearchChange} />
          </div>
          <div className="flex gap-2">
            <Button variant={viewMode === 'inbox' ? 'secondary' : 'ghost'} size="sm" className="flex-1 text-xs h-8" onClick={() => setViewMode('inbox')}><Mail className="w-3 h-3 mr-1" /> Inbox</Button>
            <Button variant={viewMode === 'archived' ? 'secondary' : 'ghost'} size="sm" className="flex-1 text-xs h-8" onClick={() => setViewMode('archived')}><Archive className="w-3 h-3 mr-1" /> Archived</Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredThreads.length === 0 ? (
            <div className="p-6 md:p-8 text-center text-stone-500 text-sm"><MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" /><p>No {viewMode} messages.</p></div>
          ) : (
            filteredThreads.map(thread => (
              <div key={thread.id} className={`p-3 md:p-4 border-b cursor-pointer transition-colors group relative ${selectedThread?.id === thread.id ? 'bg-white border-l-4 border-l-teal-600 shadow-sm' : 'hover:bg-stone-100'} ${thread.unread_count > 0 ? 'bg-blue-50' : ''}`} onClick={() => handleSelectThread(thread)}>
                <div className="flex justify-between mb-1 items-start">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    {thread.is_starred && <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />}
                    <span className={`text-xs md:text-sm truncate ${thread.unread_count > 0 ? 'font-bold text-stone-900' : 'font-semibold text-stone-700'}`}>{thread.participants[0] || 'Unknown'}</span>
                  </div>
                  <span className="text-[10px] md:text-xs text-stone-400 shrink-0 ml-2">{safeFormatDate(thread.last_message)}</span>
                </div>
                <div className={`text-xs md:text-sm truncate mb-0.5 ${thread.unread_count > 0 ? 'font-medium text-stone-900' : 'text-stone-600'}`}>{thread.subject}</div>
                <div className="text-[10px] md:text-xs text-stone-500 truncate pr-4">{thread.messages[thread.messages.length-1]?.body}</div>
                {getClass?.(thread.id) && (
                  <div className="mt-1 flex items-center gap-1 flex-wrap text-[9px] md:text-[10px]">
                    <span className="px-1 py-0.5 rounded bg-stone-100 text-stone-600 inline-flex items-center gap-0.5"><Tag className="w-2.5 h-2.5" /> {getClass(thread.id)?.topic}</span>
                    <span className={`px-1 py-0.5 rounded inline-flex items-center gap-0.5 ${urgencyColor[getClass(thread.id)?.urgency] || 'bg-stone-100 text-stone-600'}`}><AlertTriangle className="w-2.5 h-2.5" /> {getClass(thread.id)?.urgency}</span>
                    <span className="px-1 py-0.5 rounded bg-stone-100 text-stone-600 inline-flex items-center gap-0.5">{sentimentIcon(getClass(thread.id)?.sentiment)} {getClass(thread.id)?.sentiment}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      <div className="md:col-span-2 flex flex-col h-[50vh] md:h-full min-h-0 bg-white border rounded-md shadow-sm">
        {selectedThread ? (
          <div className="flex flex-col h-full">
            <div className="p-3 md:p-4 border-b bg-stone-50 flex flex-col sm:flex-row justify-between items-start gap-3">
              <div className="overflow-hidden flex-1 min-w-0">
                <h3 className="font-semibold text-sm md:text-lg truncate flex items-center gap-2">{selectedThread.is_starred && <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />}<span className="truncate">{selectedThread.subject}</span></h3>
                <div className="flex items-center gap-2 text-xs md:text-sm text-stone-500 mt-1"><User className="w-3 h-3 md:w-4 md:h-4 shrink-0" /><span className="truncate">{selectedThread.participants.join(', ')}</span></div>
                {getClass?.(selectedThread.id) && (
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap text-[10px] md:text-[11px]">
                    <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 inline-flex items-center gap-1"><Tag className="w-2.5 h-2.5" /> {getClass(selectedThread.id)?.topic}</span>
                    <span className={`px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${urgencyColor[getClass(selectedThread.id)?.urgency] || 'bg-stone-100 text-stone-700'}`}><AlertTriangle className="w-2.5 h-2.5" /> {getClass(selectedThread.id)?.urgency}</span>
                    <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 inline-flex items-center gap-1">{sentimentIcon(getClass(selectedThread.id)?.sentiment)} {getClass(selectedThread.id)?.sentiment}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => suggestReplyMutation.mutate()} disabled={!selectedThread || suggestReplyMutation.isPending}>
                  {suggestReplyMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} 
                  <span className="hidden sm:inline">AI Suggest</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-stone-500 hover:text-stone-900"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => manageThreadMutation.mutate({ threadId: selectedThread.id, operation: 'star', value: !selectedThread.is_starred })}><Star className={`w-4 h-4 mr-2 ${selectedThread.is_starred ? 'fill-amber-400 text-amber-400' : ''}`} /> {selectedThread.is_starred ? 'Unstar' : 'Star'}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => manageThreadMutation.mutate({ threadId: selectedThread.id, operation: 'read', value: selectedThread.unread_count > 0 })}>{selectedThread.unread_count > 0 ? (<span className="flex items-center"><MailOpen className="w-4 h-4 mr-2" /> <span>Mark as Read</span></span>) : (<span className="flex items-center"><MailIcon className="w-4 h-4 mr-2" /> <span>Mark as Unread</span></span>)}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => manageThreadMutation.mutate({ threadId: selectedThread.id, operation: 'archive', value: !selectedThread.is_archived })}><Archive className="w-4 h-4 mr-2" /> {selectedThread.is_archived ? 'Move to Inbox' : 'Archive'}</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => { if (confirm('Delete this conversation permanently?')) { manageThreadMutation.mutate({ threadId: selectedThread.id, operation: 'delete' }); } }}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 bg-stone-50">
              {selectedThread.messages.map(msg => {
                const isAdmin = !selectedThread.participants.includes(msg.sender_email);
                return (
                  <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] md:max-w-[85%] rounded-2xl px-3 md:px-4 py-2 md:py-3 shadow-sm ${isAdmin ? 'bg-teal-700 text-white rounded-br-none' : 'bg-white text-stone-800 border border-stone-100 rounded-bl-none'}`}>
                      <div className={`text-[9px] md:text-[10px] mb-1 flex justify-between gap-3 ${isAdmin ? 'text-teal-200' : 'text-stone-400'}`}>
                        <span className="truncate">{isAdmin ? 'You' : msg.sender_email}</span>
                        <span className="shrink-0">{safeFormatDate(msg.created_date, 'p')}</span>
                      </div>
                      <div className="whitespace-pre-wrap text-xs md:text-sm leading-relaxed">{msg.body}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-3 md:p-4 border-t bg-white">
              <div className="flex gap-2 md:gap-3 items-end">
                <Textarea 
                  placeholder="Type your reply..." 
                  className="min-h-[60px] md:min-h-[80px] bg-stone-50 resize-none focus:bg-white transition-colors text-sm" 
                  value={replyText} 
                  onChange={handleReplyChange} 
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!replyText.trim()) return; const recipient = selectedThread.participants[0]; replyMutation.mutate({ threadId: selectedThread.id, recipient, body: replyText }); } }} 
                />
                <Button 
                  className="h-[60px] md:h-[80px] w-12 md:w-14 bg-teal-700 hover:bg-teal-800 flex flex-col gap-1" 
                  onClick={() => { if (!replyText.trim()) return; const recipient = selectedThread.participants[0]; replyMutation.mutate({ threadId: selectedThread.id, recipient, body: replyText }); }} 
                  disabled={replyMutation.isPending || !replyText.trim()} 
                  title="Send Reply (Enter)"
                >
                  {replyMutation.isPending ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Send className="w-4 h-4 md:w-5 md:h-5" />}
                  <span className="text-[9px] md:text-[10px]">Send</span>
                </Button>
              </div>
              <div className="text-[9px] md:text-[10px] text-stone-400 mt-2 text-right">Press Enter to send, Shift+Enter for new line</div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-stone-300 p-6">
            <MessageSquare className="w-12 h-12 md:w-16 md:h-16 mb-4 opacity-50" />
            <p className="font-medium text-base md:text-lg text-stone-400">Select a conversation</p>
            <p className="text-xs md:text-sm text-center">Choose a thread from the list to view details</p>
          </div>
        )}
      </div>
    </div>
  );
});