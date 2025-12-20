import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, Save, Trash2, Clock, Bookmark, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function SavedSearchManager({ type, onApplySearch, currentFilters }) {
    const [name, setName] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: savedSearches } = useQuery({
        queryKey: ['saved-searches', type],
        queryFn: async () => {
            const user = await base44.auth.me();
            if (!user) return [];
            return base44.entities.SavedQuery.filter({ 
                type: type,
                user_email: user.email 
            });
        }
    });

    const saveSearchMutation = useMutation({
        mutationFn: async () => {
            const user = await base44.auth.me();
            if (!user) throw new Error("Not logged in");
            if (!name) throw new Error("Please enter a name");
            
            return base44.entities.SavedQuery.create({
                name,
                type,
                filters: currentFilters,
                user_email: user.email
            });
        },
        onSuccess: () => {
            toast.success("Search saved");
            setName("");
            setIsOpen(false);
            queryClient.invalidateQueries(['saved-searches']);
        },
        onError: (err) => toast.error(err.message)
    });

    const deleteSearchMutation = useMutation({
        mutationFn: (id) => base44.entities.SavedQuery.delete(id),
        onSuccess: () => {
            toast.success("Saved search deleted");
            queryClient.invalidateQueries(['saved-searches']);
        }
    });

    return (
        <div className="flex items-center gap-2">
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Bookmark className="w-4 h-4" />
                        Saved Searches
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                    <div className="p-4 border-b">
                        <h4 className="font-medium mb-2">Save Current Search</h4>
                        <div className="flex gap-2">
                            <Input 
                                placeholder="Name this search..." 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-8"
                            />
                            <Button size="sm" onClick={() => saveSearchMutation.mutate()}>
                                <Save className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                        <div className="p-2">
                            {savedSearches?.length === 0 ? (
                                <p className="text-sm text-stone-500 text-center py-4">No saved searches yet</p>
                            ) : (
                                <div className="space-y-1">
                                    {savedSearches?.map(search => (
                                        <div key={search.id} className="flex items-center justify-between p-2 hover:bg-stone-100 rounded-md group">
                                            <button 
                                                className="flex-1 text-left text-sm font-medium text-stone-700 truncate"
                                                onClick={() => onApplySearch(search.filters)}
                                            >
                                                {search.name}
                                            </button>
                                            <button 
                                                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteSearchMutation.mutate(search.id);
                                                }}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}