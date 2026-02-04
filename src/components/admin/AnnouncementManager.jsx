import React, { useState, memo, useCallback, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Megaphone, Loader2, Search } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from "sonner";

// Memoized table row for performance
const AnnouncementRow = memo(({ item, onEdit, onToggle, onDelete }) => (
    <TableRow>
        <TableCell className="whitespace-nowrap font-medium text-stone-600 text-xs sm:text-sm">
            {format(new Date(item.date), 'MMM d, yyyy')}
        </TableCell>
        <TableCell className="font-semibold text-xs sm:text-sm max-w-[120px] sm:max-w-none truncate">{item.title}</TableCell>
        <TableCell className="max-w-[100px] sm:max-w-xs truncate text-stone-500 text-xs sm:text-sm hidden sm:table-cell">{item.content}</TableCell>
        <TableCell>
            <Switch 
                checked={item.is_active} 
                onCheckedChange={() => onToggle(item)}
            />
        </TableCell>
        <TableCell className="text-right space-x-1 sm:space-x-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item)}>
                <Pencil className="w-3.5 h-3.5 text-stone-500" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(item.id)}>
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
            </Button>
        </TableCell>
    </TableRow>
));

const AnnouncementManager = memo(function AnnouncementManager() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const queryClient = useQueryClient();

    const { data: announcements = [], isLoading } = useQuery({
        queryKey: ['announcements'],
        queryFn: () => base44.entities.Announcement.list('-date', 100),
        initialData: [],
        staleTime: 3 * 60_000,
        gcTime: 5 * 60_000,
    });

    // Filtered announcements for search
    const filteredAnnouncements = useMemo(() => {
        if (!searchTerm.trim()) return announcements;
        const term = searchTerm.toLowerCase();
        return announcements.filter(a => 
            a.title?.toLowerCase().includes(term) || 
            a.content?.toLowerCase().includes(term)
        );
    }, [announcements, searchTerm]);

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Announcement.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['announcements']);
            setIsDialogOpen(false);
            setEditingItem(null);
            toast.success("Announcement posted");
        },
        onError: (err) => toast.error("Failed to create: " + err.message)
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Announcement.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['announcements']);
            setIsDialogOpen(false);
            setEditingItem(null);
            toast.success("Announcement updated");
        },
        onError: (err) => toast.error("Failed to update: " + err.message)
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Announcement.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['announcements'] });
            toast.success("Announcement deleted");
        }
    });

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            title: formData.get('title')?.trim(),
            content: formData.get('content')?.trim(),
            date: formData.get('date'),
            is_active: true
        };

        // Validation
        if (!data.title || data.title.length < 3) {
            toast.error("Title must be at least 3 characters");
            return;
        }
        if (!data.content || data.content.length < 10) {
            toast.error("Content must be at least 10 characters");
            return;
        }
        if (!data.date) {
            toast.error("Date is required");
            return;
        }

        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data });
        } else {
            createMutation.mutate(data);
        }
    }, [editingItem, updateMutation, createMutation]);

    const toggleActive = useCallback((item) => {
        updateMutation.mutate({ id: item.id, data: { is_active: !item.is_active } });
    }, [updateMutation]);

    const handleEdit = useCallback((item) => {
        setEditingItem(item);
        setIsDialogOpen(true);
    }, []);

    const handleDelete = useCallback((id) => {
        if (confirm('Delete this announcement?')) {
            deleteMutation.mutate(id);
        }
    }, [deleteMutation]);

    const handleNewAnnouncement = useCallback(() => {
        setEditingItem(null);
        setIsDialogOpen(true);
    }, []);

    return (
        <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3">
                <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Megaphone className="w-4 h-4 text-teal-600" />
                        Announcements
                    </CardTitle>
                    <CardDescription className="text-xs">Manage news and updates</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative w-full sm:w-40">
                        <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-stone-500" />
                        <Input 
                            placeholder="Search..." 
                            className="pl-7 h-8 text-sm" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleNewAnnouncement} size="sm" className="bg-teal-700 hover:bg-teal-800 h-8">
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="px-4">
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-stone-50">
                                <TableHead className="text-xs">Date</TableHead>
                                <TableHead className="text-xs">Title</TableHead>
                                <TableHead className="text-xs hidden sm:table-cell">Content</TableHead>
                                <TableHead className="text-xs">Active</TableHead>
                                <TableHead className="text-right text-xs">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-6">
                                        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading...
                                    </TableCell>
                                </TableRow>
                            ) : filteredAnnouncements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-stone-500 text-sm">
                                        {searchTerm ? 'No matching announcements.' : 'No announcements found.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredAnnouncements.map((item) => (
                                    <AnnouncementRow 
                                        key={item.id} 
                                        item={item} 
                                        onEdit={handleEdit}
                                        onToggle={toggleActive}
                                        onDelete={handleDelete}
                                    />
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base">{editingItem ? 'Edit' : 'Create'} Announcement</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="space-y-1">
                            <Label htmlFor="title" className="text-xs">Title *</Label>
                            <Input 
                                id="title" 
                                name="title" 
                                required 
                                minLength={3}
                                maxLength={200}
                                defaultValue={editingItem?.title} 
                                className="h-9 text-sm"
                                placeholder="Announcement title..."
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="date" className="text-xs">Date *</Label>
                            <Input 
                                type="date" 
                                id="date" 
                                name="date" 
                                required 
                                defaultValue={editingItem?.date || new Date().toISOString().split('T')[0]} 
                                className="h-9 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="content" className="text-xs">Content *</Label>
                            <Textarea 
                                id="content" 
                                name="content" 
                                required 
                                minLength={10}
                                maxLength={2000}
                                rows={4} 
                                defaultValue={editingItem?.content} 
                                className="text-sm"
                                placeholder="Write your announcement content..."
                            />
                            <p className="text-[10px] text-stone-400">Min 10 characters, max 2000</p>
                        </div>
                        <DialogFooter className="gap-2 pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button 
                                type="submit" 
                                size="sm"
                                className="bg-teal-700 hover:bg-teal-800"
                                disabled={createMutation.isPending || updateMutation.isPending}
                            >
                                {(createMutation.isPending || updateMutation.isPending) ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    editingItem ? 'Update' : 'Create'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
});

export default AnnouncementManager;