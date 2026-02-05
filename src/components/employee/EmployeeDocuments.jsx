import React, { useState, useCallback, useMemo, memo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
    FileText, Upload, Trash2, Download, Loader2, AlertCircle, 
    RefreshCw, Calendar, Eye, CheckCircle2, Clock
} from 'lucide-react';
import { toast } from "sonner";
import { format, parseISO, isValid, isPast } from 'date-fns';

// Safe date formatter
const safeFormatDate = (dateStr, formatStr = 'MMM d, yyyy') => {
    if (!dateStr) return null;
    try {
        const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
        return isValid(date) ? format(date, formatStr) : null;
    } catch {
        return null;
    }
};

// Document categories for employees
const DOCUMENT_CATEGORIES = [
    'Contracts',
    'Certifications',
    'HR Forms',
    'Legal',
    'Other'
];

// Memoized Document Item
const DocumentItem = memo(function DocumentItem({ doc, onView, onDelete, isDeleting }) {
    const formattedDate = safeFormatDate(doc.uploaded_at);
    const expirationDate = safeFormatDate(doc.expiration_date);
    const isExpired = doc.expiration_date && isPast(parseISO(doc.expiration_date));
    
    return (
        <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg border border-stone-200 bg-white hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="p-2 bg-teal-50 rounded-lg flex-shrink-0">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-sm sm:text-base text-stone-900 truncate max-w-[150px] sm:max-w-[200px]">
                            {doc.name}
                        </h4>
                        {doc.category && (
                            <Badge variant="secondary" className="text-[10px] sm:text-xs bg-stone-100">
                                {doc.category}
                            </Badge>
                        )}
                        {isExpired && (
                            <Badge variant="destructive" className="text-[10px] sm:text-xs">
                                Expired
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] sm:text-xs text-stone-500 flex-wrap">
                        {formattedDate && (
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formattedDate}
                            </span>
                        )}
                        {expirationDate && (
                            <span className={`flex items-center gap-1 ${isExpired ? 'text-red-500' : ''}`}>
                                <Calendar className="w-3 h-3" />
                                Exp: {expirationDate}
                            </span>
                        )}
                    </div>
                    {doc.notes && (
                        <p className="text-xs text-stone-400 line-clamp-1">{doc.notes}</p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onView(doc)}
                    className="h-8 w-8 sm:h-9 sm:w-9 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                    title="View/Download"
                >
                    <Eye className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(doc)}
                    disabled={isDeleting}
                    className="h-8 w-8 sm:h-9 sm:w-9 text-red-500 hover:text-red-600 hover:bg-red-50"
                    title="Delete"
                >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </Button>
            </div>
        </div>
    );
});

const EmployeeDocuments = memo(function EmployeeDocuments({ user }) {
    const queryClient = useQueryClient();
    const [isUploading, setIsUploading] = useState(false);
    const [deletingDocId, setDeletingDocId] = useState(null);
    const [docCategory, setDocCategory] = useState('Other');
    const [expirationDate, setExpirationDate] = useState('');
    const [notes, setNotes] = useState('');

    // Fetch employee record
    const { data: employeeRecord, isLoading, isError, refetch, isFetching } = useQuery({
        queryKey: ['employee-profile-docs', user?.email],
        queryFn: async () => {
            if (!user?.email) return null;
            const res = await base44.entities.Employee.filter({ email: user.email }, null, 1);
            return (res && res[0]) || null;
        },
        enabled: !!user?.email,
        staleTime: 2 * 60_000,
        gcTime: 5 * 60_000,
        retry: 2,
        refetchOnWindowFocus: false,
    });

    const documents = useMemo(() => employeeRecord?.documents || [], [employeeRecord?.documents]);

    // Upload mutation
    const uploadMutation = useMutation({
        mutationFn: async ({ file, category, expiration_date, notes }) => {
            if (!employeeRecord?.id) throw new Error('Employee record not found');
            
            // Upload to private storage
            const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
            
            const newDoc = {
                id: crypto.randomUUID(),
                name: file.name,
                file_uri,
                type: file.type || 'application/octet-stream',
                category: category || 'Other',
                expiration_date: expiration_date || null,
                notes: notes || '',
                uploaded_at: new Date().toISOString(),
                version: 1,
            };
            
            const currentDocs = employeeRecord.documents || [];
            await base44.entities.Employee.update(employeeRecord.id, {
                documents: [...currentDocs, newDoc]
            });
            
            return newDoc;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employee-profile-docs'] });
            toast.success("Document uploaded successfully");
            setDocCategory('Other');
            setExpirationDate('');
            setNotes('');
        },
        onError: (err) => {
            toast.error("Upload failed: " + (err.message || 'Unknown error'));
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (docToDelete) => {
            if (!employeeRecord?.id) throw new Error('Employee record not found');
            
            const currentDocs = employeeRecord.documents || [];
            const newDocs = currentDocs.filter(d => d.id !== docToDelete.id);
            
            await base44.entities.Employee.update(employeeRecord.id, {
                documents: newDocs
            });
            
            return docToDelete;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employee-profile-docs'] });
            toast.success("Document deleted");
            setDeletingDocId(null);
        },
        onError: (err) => {
            toast.error("Delete failed: " + (err.message || 'Unknown error'));
            setDeletingDocId(null);
        },
    });

    const handleFileUpload = useCallback(async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (file.size > 10 * 1024 * 1024) {
            toast.error("File size must be under 10MB");
            e.target.value = '';
            return;
        }
        
        setIsUploading(true);
        try {
            await uploadMutation.mutateAsync({
                file,
                category: docCategory,
                expiration_date: expirationDate,
                notes,
            });
            e.target.value = '';
        } finally {
            setIsUploading(false);
        }
    }, [uploadMutation, docCategory, expirationDate, notes]);

    const handleView = useCallback(async (doc) => {
        try {
            if (doc.file_uri) {
                const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ 
                    file_uri: doc.file_uri, 
                    expires_in: 300 
                });
                window.open(signed_url, '_blank');
            } else if (doc.url) {
                window.open(doc.url, '_blank');
            } else {
                toast.error("No file URL available");
            }
        } catch (err) {
            toast.error("Failed to open document");
        }
    }, []);

    const handleDelete = useCallback((doc) => {
        if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
        setDeletingDocId(doc.id);
        deleteMutation.mutate(doc);
    }, [deleteMutation]);

    // Loading state
    if (isLoading) {
        return (
            <Card className="border-stone-200 shadow-sm">
                <CardContent className="py-12 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                    <span className="text-sm text-stone-500">Loading documents...</span>
                </CardContent>
            </Card>
        );
    }

    // Error state
    if (isError) {
        return (
            <Card className="border-red-200 shadow-sm bg-red-50">
                <CardContent className="py-12 flex flex-col items-center justify-center gap-3">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                    <p className="text-sm text-red-600 font-medium">Failed to load documents</p>
                    <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8 text-xs">
                        <RefreshCw className="w-3.5 h-3.5 mr-1" /> Try Again
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // No employee record
    if (!employeeRecord) {
        return (
            <Card className="border-stone-200 shadow-sm">
                <CardContent className="py-12 flex flex-col items-center justify-center gap-3">
                    <FileText className="w-10 h-10 text-stone-300" />
                    <p className="text-sm text-stone-500">No employee profile found</p>
                    <p className="text-xs text-stone-400">Please contact an administrator</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-stone-200 shadow-sm">
            <CardHeader className="pb-3 px-3 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-base sm:text-xl font-serif">
                            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-teal-700" />
                            My Documents
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Upload and manage your work documents
                        </CardDescription>
                    </div>
                    {isFetching && !isLoading && (
                        <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                    )}
                </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 space-y-6">
                {/* Upload Section */}
                <div className="p-4 bg-stone-50 rounded-lg border border-stone-200 space-y-4">
                    <h3 className="font-medium text-sm text-stone-700 flex items-center gap-2">
                        <Upload className="w-4 h-4" /> Upload New Document
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-stone-600">Category</Label>
                            <Select value={docCategory} onValueChange={setDocCategory}>
                                <SelectTrigger className="h-9 text-sm bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DOCUMENT_CATEGORIES.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-stone-600">Expiration Date (Optional)</Label>
                            <Input
                                type="date"
                                value={expirationDate}
                                onChange={(e) => setExpirationDate(e.target.value)}
                                className="h-9 text-sm bg-white"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-stone-600">Notes (Optional)</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any notes about this document..."
                            className="text-sm bg-white resize-none h-16"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="flex-1">
                            <input
                                type="file"
                                className="hidden"
                                onChange={handleFileUpload}
                                disabled={isUploading}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                            />
                            <Button
                                type="button"
                                disabled={isUploading}
                                className="w-full bg-teal-700 hover:bg-teal-800 h-10 text-sm"
                                onClick={(e) => e.currentTarget.previousElementSibling?.click()}
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Choose File & Upload
                                    </>
                                )}
                            </Button>
                        </label>
                    </div>
                    <p className="text-[10px] sm:text-xs text-stone-400 text-center">
                        Accepted: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF (Max 10MB)
                    </p>
                </div>

                {/* Documents List */}
                <div className="space-y-3">
                    <h3 className="font-medium text-sm text-stone-700 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Your Documents ({documents.length})
                    </h3>
                    {documents.length === 0 ? (
                        <div className="py-8 text-center border-2 border-dashed border-stone-200 rounded-lg">
                            <FileText className="w-10 h-10 mx-auto text-stone-300 mb-2" />
                            <p className="text-sm text-stone-500">No documents uploaded yet</p>
                            <p className="text-xs text-stone-400 mt-1">Upload your first document above</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {documents.map(doc => (
                                <DocumentItem
                                    key={doc.id || doc.name + doc.uploaded_at}
                                    doc={doc}
                                    onView={handleView}
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