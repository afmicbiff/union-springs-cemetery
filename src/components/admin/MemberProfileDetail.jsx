import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { 
    Phone, Mail, MapPin, DollarSign, Edit, MessageSquare, 
    User, CheckSquare, X, ExternalLink, Sparkles, Send, Copy,
    UserCircle
} from 'lucide-react';
import { toast } from "sonner";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import AIEmailAssistant from './AIEmailAssistant';
import { Textarea } from "@/components/ui/textarea";
import { FileText, ArrowRight, Trash2 } from 'lucide-react';
import MoveDocumentDialog from './MoveDocumentDialog';
import MemberInvoicesAdmin from './MemberInvoicesAdmin';
import SecureFileLink from "@/components/documents/SecureFileLink";

export default function MemberProfileDetail({ member, onEdit, onClose, isDialog = false }) {
    const [noteType, setNoteType] = useState("note");
    const [moveDoc, setMoveDoc] = useState(null);

    const handleViewDoc = async (doc) => {
        const toastId = toast.loading("Opening document...");
        try {
            const res = await base44.integrations.Core.CreateFileSignedUrl({ 
                file_uri: doc.file_uri,
                expires_in: 60 
            });
            if (res.signed_url) {
                window.open(res.signed_url, '_blank');
                toast.dismiss(toastId);
            }
        } catch (err) {
            toast.error("Error: " + err.message, { id: toastId });
        }
    };
    const [noteContent, setNoteContent] = useState("");
  const [interactionDate, setInteractionDate] = useState("");
    
    const { data: employees } = useQuery({
        queryKey: ['employees-profile-detail'],
        queryFn: async () => {
            if (!(await base44.auth.isAuthenticated())) return [];
            return base44.entities.Employee.list();
        },
        initialData: []
    });

    const getAssigneeName = (id) => {
        if (!id || !employees) return null;
        const emp = employees.find(e => e.id === id);
        return emp ? `${emp.first_name} ${emp.last_name}` : null;
    };
    const [isEmailDraftOpen, setIsEmailDraftOpen] = useState(false);
    const [draftEmail, setDraftEmail] = useState({ subject: "", body: "" });
    const queryClient = useQueryClient();

    const addLogMutation = useMutation({
        mutationFn: async () => {
            const res = await base44.functions.invoke('manageMember', { 
                action: 'log_contact', 
                id: member.id, 
                data: {
                    type: noteType,
                    note: noteContent,
                    timestamp: interactionDate ? new Date(interactionDate).toISOString() : undefined
                }
            });
            if (res.data.error) throw new Error(res.data.error);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['members']);
            queryClient.invalidateQueries(['member', member.id]);
            setNoteContent("");
            setInteractionDate("");
            toast.success("Log added");
        },
        onError: (err) => toast.error("Failed to add log: " + err.message)
    });

    if (!member) return <div className="p-8 text-center text-stone-500">Member not found</div>;

    const fullName = `${member.first_name || ''} ${member.last_name || ''}`;

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="bg-stone-50 p-6 border-b border-stone-200 flex justify-between items-start shrink-0">
                <div className="flex gap-4">
                    <div className="h-16 w-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 text-2xl font-serif">
                        {member.first_name?.[0]}{member.last_name?.[0]}
                    </div>
                    <div>
                        <h2 className="text-2xl font-serif font-bold text-stone-900 flex items-center gap-2">
                            {fullName}
                        </h2>
                        <div className="flex items-center gap-2 text-stone-500 text-sm mt-1">
                            <MapPin className="w-4 h-4" />
                            {member.city}, {member.state}
                        </div>
                        <div className="flex gap-2 mt-3">
                            {member.phone_primary && (
                                <Button size="sm" variant="outline" className="h-8 gap-2" asChild>
                                    <a href={`tel:${member.phone_primary}`}>
                                        <Phone className="w-3.5 h-3.5" /> Call
                                    </a>
                                </Button>
                            )}
                            {member.email_primary && (
                                <>
                                    <Button size="sm" variant="outline" className="h-8 gap-2" asChild>
                                        <a href={`mailto:${member.email_primary}`}>
                                            <Mail className="w-3.5 h-3.5" /> Email
                                        </a>
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-8 gap-2 text-teal-700 bg-teal-50 border-teal-200 hover:bg-teal-100" onClick={() => setIsEmailDraftOpen(true)}>
                                        <Sparkles className="w-3.5 h-3.5" /> Draft with AI
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
                {/* Left Column: Details */}
                <ScrollArea className="flex-1 p-6 border-r border-stone-200">
                    <div className="space-y-6">
                        
                        {/* Contact Info */}
                        <section>
                            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">Contact Details</h3>
                            <div className="grid grid-cols-2 gap-y-4 text-sm">
                                <div>
                                    <span className="block text-stone-400 text-xs">Primary Phone</span>
                                    <span className="font-medium text-stone-800">{member.phone_primary || '—'}</span>
                                </div>
                                <div>
                                    <span className="block text-stone-400 text-xs">Secondary Phone</span>
                                    <span className="font-medium text-stone-800">{member.phone_secondary || '—'}</span>
                                </div>
                                <div>
                                    <span className="block text-stone-400 text-xs">Primary Email</span>
                                    <span className="font-medium text-stone-800">{member.email_primary || '—'}</span>
                                </div>
                                <div>
                                    <span className="block text-stone-400 text-xs">Secondary Email</span>
                                    <span className="font-medium text-stone-800">{member.email_secondary || '—'}</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="block text-stone-400 text-xs">Address</span>
                                    <span className="font-medium text-stone-800">
                                        {member.address}<br/>
                                        {member.city}, {member.state} {member.zip}
                                    </span>
                                </div>
                            </div>
                        </section>

                        <Separator />

                        {/* Donation & Status */}
                        <section>
                            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">Donation & Activity</h3>
                            <div className="grid grid-cols-2 gap-y-4 text-sm">
                                <div>
                                    <span className="block text-stone-400 text-xs">Donation History</span>
                                    <span className="font-medium text-stone-800 flex items-center gap-1">
                                        <DollarSign className="w-3 h-3 text-teal-600" />
                                        {member.donation || 'None'}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-stone-400 text-xs">Last Donation</span>
                                    <span className="font-medium text-stone-800">
                                        {member.last_donation_date ? format(new Date(member.last_donation_date), 'PPP') : '—'}
                                    </span>
                                </div>
                                <div className="col-span-2">
                                    <span className="block text-stone-400 text-xs mb-1">General Comments</span>
                                    <div className="bg-stone-50 p-3 rounded-md text-stone-700 italic border border-stone-100">
                                        {member.comments || 'No comments'}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <Separator />

                        {/* Follow Up */}
                        <section>
                            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">Follow-Up Task</h3>
                            {member.follow_up_date && member.follow_up_status !== 'completed' && member.follow_up_status !== 'cancelled' ? (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <CheckSquare className="w-5 h-5 text-amber-600 mt-0.5" />
                                        <div>
                                            <h4 className="font-medium text-amber-900">Follow-up Due: {format(new Date(member.follow_up_date), 'PPP')}</h4>
                                            <p className="text-sm text-amber-800 mt-1">{member.follow_up_notes || 'No specific notes'}</p>
                                            <div className="flex gap-2 items-center mt-2">
                                                <Badge className="bg-amber-200 text-amber-900 hover:bg-amber-300 border-none">Pending</Badge>
                                                {getAssigneeName(member.follow_up_assignee_id) && (
                                                    <span className="text-xs text-amber-800 flex items-center gap-1">
                                                        <UserCircle className="w-3 h-3" /> Assigned to: {getAssigneeName(member.follow_up_assignee_id)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-stone-500 text-sm flex items-center gap-2">
                                    <CheckSquare className="w-4 h-4" /> No pending follow-ups
                                </div>
                            )}
                        </section>

                        <Separator />

                        {/* Documents Section */}
                        <section>
                            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">Documents</h3>
                            {!member.documents || member.documents.length === 0 ? (
                                <p className="text-sm text-stone-400 italic">No documents uploaded.</p>
                            ) : (
                                <div className="space-y-2">
                                    {member.documents.map((doc, idx) => (
                                        <div key={doc.id || idx} className="flex items-center justify-between p-2 bg-stone-50 border rounded-md text-sm">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <FileText className="w-4 h-4 text-stone-500 shrink-0" />
                                                <div className="truncate flex flex-col">
                                                    <div>
                                                        <span className="font-medium text-stone-800">{doc.name}</span>
                                                        <span className="text-stone-500 text-xs ml-2">({doc.type}{doc.category ? ` • ${doc.category}` : ''})</span>
                                                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">v{doc.version || 1}</span>
                                                    </div>
                                                    {doc.expiration_date && (
                                                        <div className={`text-xs mt-0.5 ${new Date(doc.expiration_date) < new Date() ? 'text-red-600 font-medium' : 'text-stone-400'}`}>
                                                            Exp: {format(new Date(doc.expiration_date), 'MMM d, yyyy')}
                                                            {new Date(doc.expiration_date) < new Date() && " (Expired)"}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <SecureFileLink doc={doc} />
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-stone-500 hover:text-red-700" title="Delete"
                                                   onClick={async () => {
                                                       try {
                                                           const docs = Array.isArray(member.documents) ? member.documents : [];
                                                           const updated = docs.filter(d => (d.id || '') !== (doc.id || ''));
                                                           await base44.entities.Member.update(member.id, { documents: updated });
                                                           toast.success('Document removed');
                                                           queryClient.invalidateQueries(['members']);
                                                           queryClient.invalidateQueries(['member', member.id]);
                                                       } catch (e) {
                                                           toast.error('Failed to delete');
                                                       }
                                                   }}
                                                >
                                                   <Trash2 className="w-3.5 h-3.5" />
                                                </Button
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-stone-500 hover:text-stone-700" onClick={() => setMoveDoc(doc)} title="Move to Record">
                                                    <ArrowRight className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <Separator />
                        
                        {/* Invoices Section */}
                        <MemberInvoicesAdmin member={member} />
                    </div>
                </ScrollArea>

                {/* Right Column: Activity Log */}
                <div className="w-full md:w-[400px] bg-stone-50/50 flex flex-col border-l border-stone-200 shrink-0 h-1/2 md:h-auto">
                    <div className="p-4 border-b border-stone-200 bg-white">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-teal-600" /> Activity & Notes
                            </h3>
                            <Button onClick={() => onEdit(member)} size="sm" className="bg-teal-700 hover:bg-teal-800 h-8">
                                <Edit className="w-3.5 h-3.5 mr-2" /> Edit Profile
                            </Button>
                        </div>
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <Select value={noteType} onValueChange={setNoteType}>
                                    <SelectTrigger className="w-[130px]">
                                        <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="call">Call</SelectItem>
                                        <SelectItem value="email">Email</SelectItem>
                                        <SelectItem value="meeting">Meeting</SelectItem>
                                        <SelectItem value="note">Note</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    type="datetime-local"
                                    className="w-[190px]"
                                    value={interactionDate}
                                    onChange={(e) => setInteractionDate(e.target.value)}
                                    placeholder="Date/time"
                                />
                                <Input 
                                    placeholder="Add notes..." 
                                    value={noteContent}
                                    onChange={(e) => setNoteContent(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && noteContent && addLogMutation.mutate()}
                                />
                            </div>
                            <div className="flex justify-between items-center">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                    disabled={!noteContent}
                                    onClick={async () => {
                                        const res = await base44.functions.invoke('aiCommunicationAssistant', {
                                            action: 'suggest_followup',
                                            data: { content: noteContent }
                                        });
                                        if (res.data?.suggested_log_type) setNoteType(res.data.suggested_log_type);
                                        if (res.data?.suggested_task) {
                                            toast.info(`Suggestion: Create task "${res.data.suggested_task.title}"`);
                                            // Future: Open task creation dialog with pre-filled data
                                        } else {
                                            toast.success("Log type updated based on content.");
                                        }
                                    }}
                                >
                                    <Sparkles className="w-3 h-3 mr-1" /> AI Analyze
                                </Button>

                                <Button 
                                    size="sm" 
                                    disabled={!noteContent || addLogMutation.isPending}
                                    onClick={() => addLogMutation.mutate()}
                                    className="bg-stone-800 text-white"
                                >
                                    {addLogMutation.isPending ? 'Saving...' : 'Log Activity'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                            {member.contact_logs && member.contact_logs.length > 0 ? (
                                [...member.contact_logs].reverse().map((log, i) => (
                                    <div key={i} className="flex gap-3 text-sm group">
                                        <div className="flex-shrink-0 mt-1">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                log.type === 'call' ? 'bg-blue-100 text-blue-600' :
                                                log.type === 'email' ? 'bg-purple-100 text-purple-600' :
                                                'bg-stone-200 text-stone-500'
                                            }`}>
                                                {log.type === 'call' ? <Phone className="w-4 h-4" /> :
                                                 log.type === 'email' ? <Mail className="w-4 h-4" /> :
                                                 <MessageSquare className="w-4 h-4" />}
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex justify-between items-start">
                                                <span className="font-medium text-stone-900 capitalize">{log.type}</span>
                                                <span className="text-xs text-stone-400 whitespace-nowrap">
                                                    {format(new Date(log.timestamp), 'MMM d, h:mm a')}
                                                </span>
                                            </div>
                                            <p className="text-stone-600 leading-relaxed">{log.note}</p>
                                            <div className="text-xs text-stone-400 flex items-center gap-1">
                                                <User className="w-3 h-3" /> {log.logged_by || 'System'}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-stone-400 italic">
                                    No activity recorded yet.
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>

            <MoveDocumentDialog 
                isOpen={!!moveDoc} 
                onClose={() => setMoveDoc(null)} 
                document={moveDoc} 
                member={member}
                onMoveSuccess={() => {
                    queryClient.invalidateQueries(['members']);
                    queryClient.invalidateQueries(['member', member.id]);
                }}
            />

            {/* Email Draft Dialog */}
            <Dialog open={isEmailDraftOpen} onOpenChange={setIsEmailDraftOpen}>
                <DialogContent className="sm:max-w-[800px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-teal-600" /> Draft Email to {member.first_name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-stone-500 uppercase tracking-wider">AI Assistant</h4>
                            <AIEmailAssistant 
                                currentSubject={draftEmail.subject}
                                currentBody={draftEmail.body}
                                recipientContext={{ 
                                    first_name: member.first_name, 
                                    last_name: member.last_name, 
                                    donation: member.donation,
                                    city: member.city
                                }}
                                onApply={(result) => setDraftEmail({ subject: result.subject, body: result.body })}
                            />
                        </div>
                        <div className="space-y-4 border-l pl-6 border-stone-100">
                            <h4 className="text-sm font-medium text-stone-500 uppercase tracking-wider">Preview & Action</h4>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-stone-600">Subject</label>
                                    <Input 
                                        value={draftEmail.subject} 
                                        onChange={(e) => setDraftEmail({...draftEmail, subject: e.target.value})}
                                        placeholder="Email subject..."
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-stone-600">Body</label>
                                    <Textarea 
                                        value={draftEmail.body} 
                                        onChange={(e) => setDraftEmail({...draftEmail, body: e.target.value})}
                                        placeholder="Email content..."
                                        rows={12}
                                    />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <Button 
                                        variant="outline" 
                                        className="flex-1"
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${draftEmail.subject}\n\n${draftEmail.body}`);
                                            toast.success("Copied to clipboard");
                                        }}
                                    >
                                        <Copy className="w-4 h-4 mr-2" /> Copy
                                    </Button>
                                    <Button 
                                        className="flex-1 bg-teal-700 hover:bg-teal-800"
                                        onClick={() => {
                                            window.open(`mailto:${member.email_primary}?subject=${encodeURIComponent(draftEmail.subject)}&body=${encodeURIComponent(draftEmail.body)}`);
                                        }}
                                        disabled={!member.email_primary}
                                    >
                                        <Send className="w-4 h-4 mr-2" /> Open Mail App
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}