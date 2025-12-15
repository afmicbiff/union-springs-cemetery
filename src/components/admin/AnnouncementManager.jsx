import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Megaphone } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from "sonner";

export default function AnnouncementManager() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const queryClient = useQueryClient();

    const { data: announcements, isLoading } = useQuery({
        queryKey: ['announcements'],
        queryFn: () => base44.entities.Announcement.list({ limit: 100 }, '-date'),
        initialData: []
    });

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
            queryClient.invalidateQueries(['announcements']);
            toast.success("Announcement deleted");
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            title: formData.get('title'),
            content: formData.get('content'),
            date: formData.get('date'),
            is_active: true // default to active on create/edit from form
        };

        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const toggleActive = (item) => {
        updateMutation.mutate({ id: item.id, data: { is_active: !item.is_active } });
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-teal-600" />
                        Announcements
                    </CardTitle>
                    <CardDescription>Manage news and updates for employees.</CardDescription>
                </div>
                <Button onClick={() => { setEditingItem(null); setIsDialogOpen(true); }} className="bg-teal-700 hover:bg-teal-800">
                    <Plus className="w-4 h-4 mr-2" /> New Announcement
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Content</TableHead>
                            <TableHead>Active</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {announcements.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-stone-500">
                                    No announcements found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            announcements.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="whitespace-nowrap font-medium text-stone-600">
                                        {format(new Date(item.date), 'MMM d, yyyy')}
                                    </TableCell>
                                    <TableCell className="font-semibold">{item.title}</TableCell>
                                    <TableCell className="max-w-xs truncate text-stone-500">{item.content}</TableCell>
                                    <TableCell>
                                        <Switch 
                                            checked={item.is_active} 
                                            onCheckedChange={() => toggleActive(item)}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => { setEditingItem(item); setIsDialogOpen(true); }}>
                                            <Pencil className="w-4 h-4 text-stone-500" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => {
                                            if(confirm('Delete this announcement?')) deleteMutation.mutate(item.id);
                                        }}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit' : 'Create'} Announcement</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" name="title" required defaultValue={editingItem?.title} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input type="date" id="date" name="date" required defaultValue={editingItem?.date || new Date().toISOString().split('T')[0]} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="content">Content</Label>
                            <Textarea id="content" name="content" required rows={5} defaultValue={editingItem?.content} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" className="bg-teal-700 hover:bg-teal-800">Save</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
}