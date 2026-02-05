import React, { useState, useCallback, useMemo, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Trash2, Loader2, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from "sonner";
import { format, isValid } from 'date-fns';
import SecureFileLink from "@/components/documents/SecureFileLink";

// Safe date formatter
const safeFormat = (dateStr, formatStr) => {
  if (!dateStr) return 'Unknown';
  try {
    const d = new Date(dateStr);
    return isValid(d) ? format(d, formatStr) : 'Unknown';
  } catch { return 'Unknown'; }
};

// Memoized document item
const DocumentItem = memo(function DocumentItem({ doc, idx, onDelete, isDeleting }) {
  const expDate = doc.expiration_date ? new Date(doc.expiration_date) : null;
  const isExpired = expDate && expDate < new Date();
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white border rounded-md shadow-sm hover:bg-stone-50 transition-colors gap-3">
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        <div className="bg-teal-50 p-2 rounded text-teal-700 shrink-0">
          <FileText className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate flex items-center gap-2 flex-wrap">
            <span className="truncate">{doc.name}</span>
            <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 text-[10px] shrink-0">v{doc.version || 1}</span>
          </div>
          <div className="text-[10px] sm:text-xs text-stone-500 flex gap-1.5 sm:gap-2 flex-wrap mt-1">
            <span>{doc.type}</span>
            <span>•</span>
            <span>{doc.category || 'Other'}</span>
            <span>•</span>
            <span>Uploaded: {safeFormat(doc.uploaded_at, 'MMM d, yyyy')}</span>
            {expDate && (
              <span className={`ml-1 px-1.5 py-0.5 rounded ${isExpired ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-600'}`}>
                Exp: {safeFormat(doc.expiration_date, 'MMM d, yyyy')}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
        <SecureFileLink doc={doc} />
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 touch-manipulation" 
          onClick={() => onDelete(doc.id)} 
          disabled={isDeleting}
          title="Delete"
        >
          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
});

const EmployeeDocuments = memo(function EmployeeDocuments({ employeeId, employeeName }) {
    const queryClient = useQueryClient();
    const [uploading, setUploading] = useState(false);
    const [docType, setDocType] = useState('Certification');
    const [expirationDate, setExpirationDate] = useState('');
    const [category, setCategory] = useState('Other');
    const [notes, setNotes] = useState('');
    const [deletingDocId, setDeletingDocId] = useState(null);

    // Fetch Employee Record
    const { data: employeeRecord, isLoading, isError, refetch } = useQuery({
        queryKey: ['employee-profile-docs', employeeId],
        queryFn: async () => {
            if (!employeeId) return null;
            const res = await base44.entities.Employee.filter({ id: employeeId }, null, 1);
            return (res && res[0]) || null;
        },
        enabled: !!employeeId,
        staleTime: 2 * 60_000,
        gcTime: 5 * 60_000,
        retry: 2,
        refetchOnWindowFocus: false,
    });

    const documents = useMemo(() => employeeRecord?.documents || [], [employeeRecord?.documents]);

    // Upload File
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!employeeRecord) {
            toast.error("Employee profile not found.");
            return;
        }

        setUploading(true);
        try {
            // Upload to Private Storage
            const uploadRes = await base44.integrations.Core.UploadPrivateFile({ file });
            
            if (!uploadRes.file_uri) throw new Error("Upload failed");

            // Security scan
            try {
                const scanRes = await base44.functions.invoke('scanFileForVirus', { file_uri: uploadRes.file_uri, context: 'employee_upload' });
                if (scanRes.data && scanRes.data.clean === false) {
                    throw new Error('Upload blocked: file failed security scan');
                }
            } catch (scanErr) {
                // Continue if scan service unavailable
                if (scanErr.message.includes('blocked')) throw scanErr;
            }

            // Create new document entry
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
            await base44.entities.Employee.update(employeeRecord.id, { documents: updatedDocs });

            // Create Notification for Admin
            await base44.entities.Notification.create({
                message: `New document uploaded by employee ${employeeName || 'Unknown'}: ${file.name} (${docType})`,
                type: "document",
                is_read: false,
                user_email: null,
                related_entity_id: employeeRecord.id,
                related_entity_type: "document",
                link: `/Admin?tab=documents`,
                created_at: new Date().toISOString()
            });

            // Audit log
            try {
                await base44.entities.DocumentAuditLog.create({
                    action: 'upload',
                    document_id: newDoc.id,
                    member_id: employeeRecord.id,
                    member_name: employeeName || 'Employee',
                    performed_by: employeeName || 'Employee',
                    details: `Employee uploaded ${file.name} (${docType}, ${category})`,
                    timestamp: new Date().toISOString()
                });
            } catch {}

            // Invalidate queries to sync admin dashboard
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['employee-profile-docs'] }),
                queryClient.invalidateQueries({ queryKey: ['all-employee-documents'] }),
                queryClient.invalidateQueries({ queryKey: ['notifications'] }),
                queryClient.invalidateQueries({ queryKey: ['document-audit-log'] })
            ]);

            toast.success("Document uploaded successfully");
            e.target.value = '';
            setExpirationDate('');
            setNotes('');
        } catch (err) {
            console.error(err);
            toast.error("Upload Error: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    // Delete Document
    const deleteMutation = useMutation({
        mutationFn: async (docId) => {
            setDeletingDocId(docId);
            const docToDelete = documents.find(d => d.id === docId);
            const updatedDocs = documents.filter(d => d.id !== docId);
            await base44.entities.Employee.update(employeeRecord.id, { documents: updatedDocs });
            
            try {
                await base44.entities.DocumentAuditLog.create({
                    action: 'delete',
                    document_id: docId,
                    member_id: employeeRecord.id,
                    member_name: employeeName || 'Employee',
                    performed_by: employeeName || 'Employee',
                    details: `Employee deleted ${docToDelete?.name || 'document'}`,
                    timestamp: new Date().toISOString()
                });
            } catch {}
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employee-profile-docs'] });
            queryClient.invalidateQueries({ queryKey: ['all-employee-documents'] });
            queryClient.invalidateQueries({ queryKey: ['document-audit-log'] });
            toast.success("Document removed");
        },
        onError: (err) => {
            toast.error("Failed to delete: " + err.message);
        },
        onSettled: () => {
            setDeletingDocId(null);
        }
    });

    const handleDelete = useCallback((docId) => {
        deleteMutation.mutate(docId);
    }, [deleteMutation]);

    if (isLoading) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                        <span className="text-sm text-stone-500">Loading documents...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (isError) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="text-center">
                        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                        <p className="text-sm text-red-600">Failed to load documents</p>
                        <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3 h-8 text-xs">
                            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Try Again
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="px-4 sm:px-6 pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <FileText className="w-5 h-5" /> My Documents
                </CardTitle>
                <CardDescription className="text-sm">
                    Upload and manage your work-related documents, certifications, and forms.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
                
                {/* Upload Section */}
                <div className="bg-stone-50 p-3 sm:p-4 rounded-lg border border-stone-200">
                    <h3 className="font-semibold text-stone-900 mb-3 text-sm">Upload New Document</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="doc-type" className="text-xs">Document Type</Label>
                            <Select value={docType} onValueChange={setDocType}>
                                <SelectTrigger id="doc-type" className="bg-white h-10 sm:h-9 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Certification">Certification</SelectItem>
                                    <SelectItem value="License">License</SelectItem>
                                    <SelectItem value="Training">Training Record</SelectItem>
                                    <SelectItem value="HR Form">HR Form</SelectItem>
                                    <SelectItem value="Contract">Contract</SelectItem>
                                    <SelectItem value="Identification">Identification</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="category" className="text-xs">Category</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger id="category" className="bg-white h-10 sm:h-9 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Contracts">Contracts</SelectItem>
                                    <SelectItem value="Certifications">Certifications</SelectItem>
                                    <SelectItem value="HR Forms">HR Forms</SelectItem>
                                    <SelectItem value="Legal">Legal</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="expiration-date" className="text-xs">Expiration (Optional)</Label>
                            <Input 
                                id="expiration-date" 
                                type="date" 
                                className="bg-white h-10 sm:h-9 text-sm"
                                value={expirationDate}
                                onChange={(e) => setExpirationDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="file-upload" className="text-xs">Select File</Label>
                            <div className="flex gap-2">
                                <Input 
                                    id="file-upload" 
                                    type="file" 
                                    className="bg-white h-10 sm:h-9 pt-2 sm:pt-1.5 text-sm" 
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                />
                                {uploading && <Loader2 className="w-10 h-10 sm:w-9 sm:h-9 p-2 animate-spin text-teal-600 shrink-0" />}
                            </div>
                        </div>
                    </div>
                    <div className="mt-3 space-y-1.5">
                        <Label htmlFor="notes" className="text-xs">Notes (Optional)</Label>
                        <Input 
                            id="notes" 
                            className="bg-white h-10 sm:h-9 text-sm" 
                            placeholder="Add context..." 
                            value={notes} 
                            onChange={(e) => setNotes(e.target.value)} 
                        />
                    </div>
                </div>

                {/* Documents List */}
                <div className="space-y-2">
                    <h3 className="font-semibold text-stone-900 text-sm">Uploaded Documents</h3>
                    {documents.length === 0 ? (
                        <div className="text-center py-8 sm:py-10 border-2 border-dashed rounded-lg text-stone-400">
                            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No documents uploaded yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {documents.map((doc, idx) => (
                                <DocumentItem 
                                    key={doc.id || idx}
                                    doc={doc}
                                    idx={idx}
                                    onDelete={handleDelete}
                                    isDeleting={deletingDocId === doc.id}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
});

export default EmployeeDocuments;