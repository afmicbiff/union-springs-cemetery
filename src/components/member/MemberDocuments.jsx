import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, Trash2, Eye, Loader2, Download } from 'lucide-react';
import { toast } from "sonner";
import { format } from 'date-fns';

export default function MemberDocuments({ user }) {
    const queryClient = useQueryClient();
    const [uploading, setUploading] = useState(false);
    const [docType, setDocType] = useState('Identification');

    // 1. Fetch Member Record to get documents list
    const { data: memberRecord } = useQuery({
        queryKey: ['member-profile', user.email],
        queryFn: async () => {
            const res = await base44.entities.Member.list({ email_primary: user.email }, 1);
            return res[0] || null;
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

            // B. Update Member Entity with new document reference
            const newDoc = {
                id: crypto.randomUUID(),
                name: file.name,
                file_uri: uploadRes.file_uri,
                type: docType,
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

    // 4. View/Download Document
    const handleView = async (doc) => {
        const toastId = toast.loading("Generating secure link...");
        try {
            const res = await base44.integrations.Core.CreateFileSignedUrl({ 
                file_uri: doc.file_uri,
                expires_in: 60 // 1 minute
            });
            
            if (res.signed_url) {
                window.open(res.signed_url, '_blank');
                toast.dismiss(toastId);
            } else {
                throw new Error("Could not generate link");
            }
        } catch (err) {
            toast.error("Error: " + err.message, { id: toastId });
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
                                    <SelectItem value="Identification">Identification (ID/Passport)</SelectItem>
                                    <SelectItem value="Deed/Certificate">Deed / Certificate</SelectItem>
                                    <SelectItem value="Form/Application">Form / Application</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full sm:w-2/3 space-y-1.5">
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
                                            <div className="font-medium text-sm truncate">{doc.name}</div>
                                            <div className="text-xs text-stone-500 flex gap-2">
                                                <span>{doc.type}</span>
                                                <span>•</span>
                                                <span>{doc.uploaded_at ? format(new Date(doc.uploaded_at), 'MMM d, yyyy') : 'Unknown Date'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-teal-600 hover:text-teal-700 hover:bg-teal-50" onClick={() => handleView(doc)} title="View/Download">
                                            <Eye className="w-4 h-4" />
                                        </Button>
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