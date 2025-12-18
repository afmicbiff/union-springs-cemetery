import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, Trash2, Filter, AlertTriangle, ChevronRight, ChevronDown, History, Upload } from 'lucide-react';
import SecureFileLink from './SecureFileLink';
import { format, isPast, isBefore, addDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import DocumentUploader from './DocumentUploader';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function DocumentList({ documents, onDelete, onUpdate }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [expandedGroups, setExpandedGroups] = useState({});
    const [updateDialogOpen, setUpdateDialogOpen] = useState(null);

    // 1. Group documents
    const groupedDocs = React.useMemo(() => {
        const groups = {};
        (documents || []).forEach(doc => {
            // Use group_id if available, otherwise fallback to id or composite key (for legacy)
            const groupId = doc.group_id || doc.id || `${doc.name}-${doc.type}`;
            
            if (!groups[groupId]) {
                groups[groupId] = {
                    latest: doc,
                    history: []
                };
            } else {
                const currentIsNewer = (doc.version || 1) > (groups[groupId].latest.version || 1);
                if (currentIsNewer) {
                    groups[groupId].history.push(groups[groupId].latest);
                    groups[groupId].latest = doc;
                } else {
                    groups[groupId].history.push(doc);
                }
            }
        });
        
        // Sort history descending by version
        Object.values(groups).forEach(group => {
            group.history.sort((a, b) => (b.version || 1) - (a.version || 1));
        });
        
        return Object.values(groups).map(g => g.latest); // Return latest docs for filtering
    }, [documents]);

    const filteredDocs = groupedDocs.filter(doc => {
        const matchesSearch = (doc.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (doc.notes || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === "All" || (doc.category || "Other") === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const uniqueCategories = ["All", ...new Set((documents || []).map(d => d.category || "Other"))].sort();

    const toggleGroup = (groupId) => {
        setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    const getExpirationStatus = (dateStr) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        if (isPast(date)) return { label: "Expired", color: "text-red-600 bg-red-50 border-red-200" };
        if (isBefore(date, addDays(new Date(), 30))) return { label: "Expiring Soon", color: "text-amber-600 bg-amber-50 border-amber-200" };
        return { label: "Valid", color: "text-green-600 bg-green-50 border-green-200" };
    };

    const RenderDocRow = ({ doc, isHistory = false }) => {
        const expStatus = getExpirationStatus(doc.expiration_date);
        const groupId = doc.group_id || doc.id || `${doc.name}-${doc.type}`;
        // Find the group object to check if there is history
        const group = documents?.filter(d => (d.group_id || d.id || `${d.name}-${d.type}`) === groupId);
        const hasHistory = group?.length > 1;

        return (
            <div className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${isHistory ? 'bg-stone-50/50 pl-12 border-t' : 'hover:bg-stone-50'}`}>
                <div className="flex items-start gap-3 overflow-hidden min-w-0 flex-1">
                    {!isHistory && (
                        <button 
                            onClick={() => hasHistory && toggleGroup(groupId)}
                            className={`mt-2 p-0.5 rounded-sm text-stone-400 hover:text-stone-600 ${!hasHistory ? 'invisible' : ''}`}
                        >
                            {expandedGroups[groupId] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                    )}
                    
                    <div className={`p-2 rounded mt-1 flex-shrink-0 ${doc.file_uri ? 'bg-amber-50' : 'bg-teal-50'}`}>
                        <FileText className={`w-5 h-5 ${doc.file_uri ? 'text-amber-700' : 'text-teal-700'}`} />
                    </div>
                    
                    <div className="min-w-0 flex-grow">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="font-semibold text-stone-900 truncate" title={doc.name}>{doc.name}</h5>
                            <Badge variant="outline" className="text-[10px] h-5 px-1">{doc.category || "Other"}</Badge>
                            <Badge variant="outline" className="text-[10px] h-5 px-1 bg-stone-100">{doc.type}</Badge>
                            {doc.version > 1 && (
                                <Badge variant="secondary" className="text-[10px] h-5 px-1 bg-blue-50 text-blue-700">v{doc.version}</Badge>
                            )}
                            {expStatus && (
                                <Badge variant="outline" className={`text-[10px] h-5 px-1 ${expStatus.color}`}>
                                    {expStatus.label}: {format(new Date(doc.expiration_date), 'MMM d, yyyy')}
                                </Badge>
                            )}
                        </div>
                        {doc.notes && (
                            <p className="text-xs text-stone-600 mt-1 italic">"{doc.notes}"</p>
                        )}
                        <p className="text-xs text-stone-400 mt-1">
                            Uploaded: {doc.uploaded_at ? format(new Date(doc.uploaded_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                    <SecureFileLink doc={doc} />
                    
                    {!isHistory && onUpdate && (
                        <Dialog open={updateDialogOpen === groupId} onOpenChange={(open) => setUpdateDialogOpen(open ? groupId : null)}>
                            <DialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-stone-400 hover:text-teal-700" title="Upload New Version">
                                    <Upload className="w-4 h-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Update Document</DialogTitle>
                                </DialogHeader>
                                <DocumentUploader 
                                    onUploadComplete={(newDoc) => {
                                        onUpdate(newDoc);
                                        setUpdateDialogOpen(null);
                                    }}
                                    versionContext={doc}
                                />
                            </DialogContent>
                        </Dialog>
                    )}

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-stone-400 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Document?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will remove <strong>{doc.name}</strong> (v{doc.version || 1}) from the record. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => onDelete(doc)}>
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-grow">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-500" />
                    <Input 
                        placeholder="Search by name or notes..." 
                        className="pl-9 bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-[180px] bg-white">
                        <Filter className="w-4 h-4 mr-2 text-stone-500" />
                        <SelectValue placeholder="Filter Category" />
                    </SelectTrigger>
                    <SelectContent>
                        {uniqueCategories.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {/* List */}
            <div className="bg-white rounded-md border shadow-sm divide-y">
                {filteredDocs.length === 0 ? (
                    <div className="p-8 text-center text-stone-500 italic">
                        No documents found matching your filters.
                    </div>
                ) : (
                    filteredDocs.map((doc) => {
                        const groupId = doc.group_id || doc.id || `${doc.name}-${doc.type}`;
                        const groupHistory = (documents || []).filter(d => 
                            (d.group_id || d.id || `${d.name}-${d.type}`) === groupId && 
                            (d.version || 1) !== (doc.version || 1)
                        ).sort((a, b) => (b.version || 1) - (a.version || 1));

                        return (
                            <div key={groupId}>
                                <RenderDocRow doc={doc} />
                                {expandedGroups[groupId] && groupHistory.map((histDoc, idx) => (
                                    <RenderDocRow key={idx} doc={histDoc} isHistory={true} />
                                ))}
                            </div>
                        );
                    })
                )}
            </div>
            
            <div className="text-xs text-stone-400 text-right">
                {filteredDocs.length} active documents (total {documents?.length || 0})
            </div>
        </div>
    );
}