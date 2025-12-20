import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight } from 'lucide-react';
import { toast } from "sonner";

export default function MoveDocumentDialog({ isOpen, onClose, document, member, onMoveSuccess }) {
    const [targetType, setTargetType] = useState('Deceased');
    const [targetId, setTargetId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const queryClient = useQueryClient();

    // Fetch potential targets based on type and search
    const { data: targets, isLoading: targetsLoading } = useQuery({
        queryKey: ['move-targets', targetType, searchTerm],
        queryFn: async () => {
            if (!searchTerm) return [];
            let res = [];
            if (targetType === 'Deceased') {
                // Ideally backend search, but simple filter here for now or use searchDeceased function
                 const { data } = await base44.functions.invoke('searchDeceased', { query: searchTerm, limit: 10 });
                 return data.results || [];
            }
            // Add other types if needed (e.g. Reservation)
            return [];
        },
        enabled: !!searchTerm && isOpen
    });

    const moveMutation = useMutation({
        mutationFn: async () => {
            if (!targetId) throw new Error("Please select a target record");

            // 1. Fetch Target Record to get current documents
            let targetRecord;
            let updateFn;
            
            if (targetType === 'Deceased') {
                targetRecord = await base44.entities.Deceased.get(targetId);
                updateFn = base44.entities.Deceased.update;
            }

            if (!targetRecord) throw new Error("Target record not found");

            const targetDocs = targetRecord.documents || [];
            
            // 2. Add to Target
            const newDoc = { ...document, id: crypto.randomUUID(), moved_from_member: member.id };
            await updateFn(targetId, { documents: [...targetDocs, newDoc] });

            // 3. Remove from Member
            const memberDocs = member.documents.filter(d => d.id !== document.id);
            await base44.entities.Member.update(member.id, { documents: memberDocs });

            return true;
        },
        onSuccess: () => {
            toast.success("Document moved successfully");
            onMoveSuccess();
            onClose();
        },
        onError: (err) => toast.error("Failed to move: " + err.message)
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Move Document</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Document</Label>
                        <div className="p-2 bg-stone-50 border rounded text-sm font-medium">{document?.name}</div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Move To (Entity Type)</Label>
                        <Select value={targetType} onValueChange={setTargetType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Deceased">Deceased Record</SelectItem>
                                {/* Future: Plot, Reservation */}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Search Target Record</Label>
                        <input 
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Type name to search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {targetsLoading && <div className="text-xs text-stone-500"><Loader2 className="w-3 h-3 inline animate-spin"/> Searching...</div>}
                        
                        {targets && targets.length > 0 && (
                            <div className="border rounded-md max-h-[150px] overflow-y-auto mt-2 divide-y">
                                {targets.map(t => (
                                    <div 
                                        key={t.id} 
                                        className={`p-2 text-sm cursor-pointer hover:bg-stone-100 ${targetId === t.id ? 'bg-teal-50 text-teal-900 font-medium' : ''}`}
                                        onClick={() => setTargetId(t.id)}
                                    >
                                        {t.first_name} {t.last_name} 
                                        {t.date_of_death && <span className="text-xs text-stone-500 ml-1">({t.date_of_death})</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                        {searchTerm && targets && targets.length === 0 && !targetsLoading && (
                            <div className="text-xs text-stone-500 italic">No records found.</div>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => moveMutation.mutate()} disabled={moveMutation.isPending || !targetId}>
                        {moveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                        Move Document
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}