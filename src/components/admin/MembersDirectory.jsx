import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Edit2, Trash2, MapPin, Mail, Phone } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function MembersDirectory() {
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const queryClient = useQueryClient();

    const { data: members } = useQuery({
        queryKey: ['members'],
        queryFn: () => base44.entities.Member.list({ limit: 1000 }),
        initialData: [],
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Member.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['members']);
            setIsDialogOpen(false);
            setEditingMember(null);
            toast.success("Member added successfully");
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Member.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['members']);
            setIsDialogOpen(false);
            setEditingMember(null);
            toast.success("Member updated successfully");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Member.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['members']);
            toast.success("Member removed");
        }
    });

    const filteredMembers = members.filter(member => {
        const search = searchTerm.toLowerCase();
        return (
            (member.last_name || "").toLowerCase().includes(search) ||
            (member.first_name || "").toLowerCase().includes(search) ||
            (member.city || "").toLowerCase().includes(search)
        );
    }).sort((a, b) => (a.last_name || "").localeCompare(b.last_name || ""));

    const handleSave = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name'),
            address: formData.get('address'),
            city: formData.get('city'),
            state: formData.get('state'),
            zip: formData.get('zip'),
        };

        if (editingMember) {
            updateMutation.mutate({ id: editingMember.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    return (
        <Card className="h-full border-stone-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                    <CardTitle className="text-xl font-serif">Member Directory</CardTitle>
                    <CardDescription>
                        Manage contact information for cemetery members and donors.
                    </CardDescription>
                </div>
                <Button 
                    onClick={() => { setEditingMember(null); setIsDialogOpen(true); }}
                    className="bg-teal-700 hover:bg-teal-800"
                >
                    <Plus className="w-4 h-4 mr-2" /> Add Member
                </Button>
            </CardHeader>
            <CardContent>
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                    <Input
                        placeholder="Search by name or city..."
                        className="pl-9 bg-stone-50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="rounded-md border border-stone-200 overflow-hidden">
                    <div className="overflow-x-auto max-h-[600px]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-stone-100 text-stone-700 font-serif sticky top-0 z-10">
                                <tr>
                                    <th className="p-4 font-semibold">Last Name</th>
                                    <th className="p-4 font-semibold">First Name</th>
                                    <th className="p-4 font-semibold">Address</th>
                                    <th className="p-4 font-semibold">City</th>
                                    <th className="p-4 font-semibold">State</th>
                                    <th className="p-4 font-semibold">Zip</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 bg-white">
                                {filteredMembers.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="p-8 text-center text-stone-500 italic">
                                            No members found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredMembers.map(member => (
                                        <tr key={member.id} className="hover:bg-stone-50 transition-colors">
                                            <td className="p-4 font-medium text-stone-900">{member.last_name}</td>
                                            <td className="p-4 text-stone-700">{member.first_name}</td>
                                            <td className="p-4 text-stone-600 truncate max-w-[200px]" title={member.address}>{member.address}</td>
                                            <td className="p-4 text-stone-600">{member.city}</td>
                                            <td className="p-4 text-stone-600">{member.state}</td>
                                            <td className="p-4 text-stone-600 font-mono text-xs">{member.zip}</td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-stone-400 hover:text-teal-600"
                                                        onClick={() => { setEditingMember(member); setIsDialogOpen(true); }}
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-stone-400 hover:text-red-600"
                                                        onClick={() => {
                                                            if (confirm('Are you sure you want to delete this member?')) {
                                                                deleteMutation.mutate(member.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingMember ? 'Edit Member' : 'Add New Member'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="first_name">First Name</Label>
                                <Input id="first_name" name="first_name" defaultValue={editingMember?.first_name} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last_name">Last Name</Label>
                                <Input id="last_name" name="last_name" defaultValue={editingMember?.last_name} required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Input id="address" name="address" defaultValue={editingMember?.address} />
                        </div>
                        <div className="grid grid-cols-6 gap-4">
                            <div className="col-span-3 space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Input id="city" name="city" defaultValue={editingMember?.city} />
                            </div>
                            <div className="col-span-1 space-y-2">
                                <Label htmlFor="state">State</Label>
                                <Input id="state" name="state" defaultValue={editingMember?.state} maxLength={2} />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="zip">Zip</Label>
                                <Input id="zip" name="zip" defaultValue={editingMember?.zip} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" className="bg-teal-700 hover:bg-teal-800">Save Member</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
}