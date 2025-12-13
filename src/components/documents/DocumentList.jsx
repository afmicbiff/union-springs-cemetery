import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, Trash2, Filter, AlertTriangle } from 'lucide-react';
import SecureFileLink from './SecureFileLink';
import { format } from 'date-fns';

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

export default function DocumentList({ documents, onDelete }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("All");

    const filteredDocs = (documents || []).filter(doc => {
        const matchesSearch = (doc.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (doc.notes || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === "All" || doc.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const uniqueTypes = ["All", ...new Set((documents || []).map(d => d.type).filter(Boolean))].sort();

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
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-[180px] bg-white">
                        <Filter className="w-4 h-4 mr-2 text-stone-500" />
                        <SelectValue placeholder="Filter Type" />
                    </SelectTrigger>
                    <SelectContent>
                        {uniqueTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
                    filteredDocs.map((doc, idx) => (
                        <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50 transition-colors">
                            <div className="flex items-start gap-3 overflow-hidden">
                                <div className={`p-2 rounded mt-1 flex-shrink-0 ${doc.file_uri ? 'bg-amber-50' : 'bg-teal-50'}`}>
                                    <FileText className={`w-5 h-5 ${doc.file_uri ? 'text-amber-700' : 'text-teal-700'}`} />
                                </div>
                                <div className="min-w-0 flex-grow">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h5 className="font-semibold text-stone-900 truncate" title={doc.name}>{doc.name}</h5>
                                        <Badge variant="outline" className="text-[10px] h-5 px-1">{doc.type}</Badge>
                                        {doc.file_uri && (
                                            <Badge variant="secondary" className="text-[10px] h-5 px-1 bg-amber-100 text-amber-800 border-amber-200">
                                                Secure
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
                            
                            <div className="flex items-center gap-2 self-end sm:self-center">
                                <SecureFileLink doc={doc} />
                                
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
                                                This will remove <strong>{doc.name}</strong> from the record. This action cannot be undone.
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
                    ))
                )}
            </div>
            
            <div className="text-xs text-stone-400 text-right">
                {filteredDocs.length} of {documents?.length || 0} documents
            </div>
        </div>
    );
}