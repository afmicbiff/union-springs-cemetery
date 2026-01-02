import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, Trash2, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { format } from 'date-fns';
import SecureFileLink from "@/components/documents/SecureFileLink";

export default function MemberDocuments({ user }) {
    const queryClient = useQueryClient();
    const [uploading, setUploading] = useState(false);
    const [docType, setDocType] = useState('Identification');
    const [expirationDate, setExpirationDate] = useState('');
    const [category, setCategory] = useState('Other');
    const [notes, setNotes] = useState('');
    const [category, setCategory] = useState('Other');
    const [notes, setNotes] = useState('');

    // 1. Fetch Member Record to get documents list
    const { data: memberRecord } = useQuery({
        queryKey: ['member-profile', user.email],
        queryFn: async () => {
            const res = await base44.entities.Member.filter({ email_primary: user.email }, null, 1);
            return (res && res[0]) || null;
        },
        enabled: !!user.email
    });

    const documents = memberRecord?.documents || [];

    // 2. Upload File Mutation
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!memberRecord) {
            toast.error("Member profile not found. Please update your profile first.");
            return;
        }

        setUploading(true);
        try {
            // A. Upload to Private Storage
            const uploadRes = await base44.integrations.Core.UploadPrivateFile({ file });
            
            if (!uploadRes.file_uri) throw new Error("Upload failed");

            // Security scan
            const scanRes = await base44.functions.invoke('scanFileForVirus', { file_uri: uploadRes.file_uri, context: 'member_upload' });
            if (scanRes.data && scanRes.data.clean === false) {
                throw new Error('Upload blocked: file failed security scan');
            }

            // B. Update Member Entity with new document reference (versioned)
            const newDoc = {
                id: crypto.randomUUID(),
                group_id: crypto.randomUUID(),
                version: 1,
                name: file.name,
                file_uri: uploadRes.file_uri,
                type: docType,
                category: category,
                notes: notes || '',
                expiration_date: expirationDate || null,
                uploaded_at: new Date().toISOString()
            };

            const updatedDocs = [...documents, newDoc];
            await base44.entities.Member.update(memberRecord.id, { documents: updatedDocs });

            // C. Create Notification for Admin
            await base44.entities.Notification.create({
                message: `New document uploaded by ${memberRecord.first_name} ${memberRecord.last_name}: ${file.name} (${docType})`,
                type: "document",
                is_read: false,
                user_email: null,
                related_entity_id: memberRecord.id,
                related_entity_type: "member",
                link: `/admin?tab=members&memberId=${memberRecord.id}`, // Custom link logic
                created_at: new Date().toISOString()
            });

            queryClient.invalidateQueries(['member-profile']);
            toast.success("Document uploaded successfully");
            e.target.value = ''; // Reset input
            setExpirationDate('');
            setNotes('');
        } catch (err) {
            console.error(err);
            toast.error("Upload Error: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    // 3. Delete Document Mutation
    const deleteMutation = useMutation({
        mutationFn: async (docId) => {
            const updatedDocs = documents.filter(d => d.id !== docId);
            await base44.entities.Member.update(memberRecord.id, { documents: updatedDocs });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['member-profile']);
            toast.success("Document removed");
        }
    });

    // 4. Upload New Version
    const handleUploadNewVersion = async (e, baseDoc) => {
        const file = e.target.files[0];
        if (!file || !memberRecord) return;
        try {
            setUploading(true);
            const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
            const scanRes = await base44.functions.invoke('scanFileForVirus', { file_uri, context: 'member_version_upload' });
            if (scanRes.data && scanRes.data.clean === false) {
                toast.error('Upload blocked: file failed security scan');
                return;
            }
            const groupId = baseDoc.group_id || baseDoc.id;
            const groupDocs = documents.filter(d => (d.group_id || d.id) === groupId);
            const nextVersion = Math.max(...groupDocs.map(d => d.version || 1), 1) + 1;
            const newDoc = {
                id: crypto.randomUUID(),
                group_id: groupId,
                version: nextVersion,
                name: file.name,
                file_uri,
                type: baseDoc.type || docType,
                category: baseDoc.category || category,
                notes: 'Updated version',
                expiration_date: baseDoc.expiration_date || null,
                uploaded_at: new Date().toISOString()
            };
            const updatedDocs = [...documents, newDoc];
            await base44.entities.Member.update(memberRecord.id, { documents: updatedDocs });
            queryClient.invalidateQueries(['member-profile']);
            toast.success('New version uploaded');
        } catch (err) {
            toast.error('Failed to upload new version: ' + err.message);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };



    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" /> My Documents
                </CardTitle>
                <CardDescription>
                    Securely upload and manage documents related to your plots and reservations (e.g., ID, Deeds, Forms).
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                
                {/* Upload Section */}
                <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
                    <h3 className="font-semibold text-stone-900 mb-3 text-sm">Upload New Document</h3>
                    <div className="flex flex-col sm:flex-row gap-3 items-end">
                        <div className="w-full sm:w-1/3 space-y-1.5">
                            <Label htmlFor="doc-type" className="text-xs">Document Type</Label>
                            <Select value={docType} onValueChange={setDocType}>
                                <SelectTrigger id="doc-type" className="bg-white h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Will">Will</SelectItem>
                                    <SelectItem value="Deed/Certificate">Burial Deed / Certificate</SelectItem>
                                    <SelectItem value="Family Records">Family Records</SelectItem>
                                    <SelectItem value="Identification">Identification</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full sm:w-1/3 space-y-1.5">
                            <Label htmlFor="category" className="text-xs">Category</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger id="category" className="bg-white h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Legal">Legal</SelectItem>
                                    <SelectItem value="Deed/Certificate">Deed/Certificate</SelectItem>
                                    <SelectItem value="Identification">Identification</SelectItem>
                                    <SelectItem value="Family Records">Family Records</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full sm:w-1/3 space-y-1.5">
                            <Label htmlFor="expiration-date" className="text-xs">Expiration Date (Optional)</Label>
                            <Input 
                                id="expiration-date" 
                                type="date" 
                                className="bg-white h-9"
                                value={expirationDate}
                                onChange={(e) => setExpirationDate(e.target.value)}
                            />
                        </div>
                        <div className="w-full sm:w-1/3 space-y-1.5">
                            <Label htmlFor="file-upload" className="text-xs">Select File</Label>
                            <div className="flex gap-2">
                                <Input 
                                    id="file-upload" 
                                    type="file" 
                                    className="bg-white h-9 pt-1.5" 
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                />
                                {uploading && <Loader2 className="w-9 h-9 p-2 animate-spin text-teal-600 shrink-0" />}
                            </div>
                        </div>

                        <div className="w-full mt-3 space-y-1.5">
                            <Label htmlFor="notes" className="text-xs">Notes (Optional)</Label>
                            <Input id="notes" className="bg-white h-9" placeholder="Add context..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* Documents List */}
                <div className="space-y-1">
                    <h3 className="font-semibold text-stone-900 text-sm mb-2">Uploaded Documents</h3>
                    {documents.length === 0 ? (
                        <div className="text-center p-8 border-2 border-dashed rounded-lg text-stone-400">
                            No documents uploaded yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2">
                            {documents.map((doc, idx) => (
                                <div key={doc.id || idx} className="flex items-center justify-between p-3 bg-white border rounded-md shadow-sm hover:bg-stone-50 transition-colors">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="bg-teal-50 p-2 rounded text-teal-700">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-medium text-sm truncate flex items-center gap-2">
                                                <span className="truncate">{doc.name}</span>
                                                <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 text-[10px]">v{doc.version || 1}</span>
                                            </div>
                                            <div className="text-xs text-stone-500 flex gap-2 flex-wrap">
                                                <span>{doc.type}</span>
                                                <span>•</span>
                                                <span>{doc.category || 'Other'}</span>
                                                <span>•</span>
                                                <span>Uploaded: {doc.uploaded_at ? format(new Date(doc.uploaded_at), 'MMM d, yyyy') : 'Unknown'}</span>
                                                {doc.expiration_date && (
                                                    <span className={`ml-2 px-1.5 py-0.5 rounded ${new Date(doc.expiration_date) < new Date() ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-600'}`}>
                                                        Exp: {format(new Date(doc.expiration_date), 'MMM d, yyyy')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <input id={`newver-${doc.id || idx}`} type="file" className="hidden" onChange={(e) => handleUploadNewVersion(e, doc)} />
                                        <Button size="sm" variant="outline" className="h-8 text-teal-700 border-teal-200 hover:bg-teal-50" onClick={() => document.getElementById(`newver-${doc.id || idx}`).click()} title="Upload New Version">
                                            New Ver
                                        </Button>
                                        <SecureFileLink doc={doc} />
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => deleteMutation.mutate(doc.id)} title="Delete">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}