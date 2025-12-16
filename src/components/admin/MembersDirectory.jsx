import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Edit2, Trash2, MapPin, Mail, Phone, ArrowUpDown, Download } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function MembersDirectory() {
    const [searchTerm, setSearchTerm] = useState("");
    const [stateFilter, setStateFilter] = useState("all");
    const [donationFilter, setDonationFilter] = useState("all"); // 'all', 'donated', 'none'
    const [sortConfig, setSortConfig] = useState({ key: 'last_name', direction: 'asc' });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const queryClient = useQueryClient();

    const { data: members, isLoading } = useQuery({
        queryKey: ['members'],
        queryFn: () => base44.entities.Member.list(null, 1000),
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

    const uniqueStates = [...new Set((members || []).map(m => m.state).filter(Boolean))].sort();

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const exportToCSV = () => {
        if (!members || members.length === 0) return;
        
        const headers = ["Last Name", "First Name", "Address", "City", "State", "Zip", "Phone", "Sec. Phone", "Email", "Sec. Email", "Donation", "Comments"];
        const csvContent = [
            headers.join(","),
            ...filteredMembers.map(m => [
                `"${m.last_name || ''}"`,
                `"${m.first_name || ''}"`,
                `"${m.address || ''}"`,
                `"${m.city || ''}"`,
                `"${m.state || ''}"`,
                `"${m.zip || ''}"`,
                `"${m.phone_primary || ''}"`,
                `"${m.phone_secondary || ''}"`,
                `"${m.email_primary || ''}"`,
                `"${m.email_secondary || ''}"`,
                `"${m.donation || ''}"`,
                `"${m.comments || ''}"`
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "members_directory.csv";
        link.click();
    };

    const filteredMembers = (members || []).filter(member => {
        const search = searchTerm.toLowerCase();
        const matchesSearch = (
            (member.last_name || "").toLowerCase().includes(search) ||
            (member.first_name || "").toLowerCase().includes(search) ||
            (member.city || "").toLowerCase().includes(search) ||
            (member.email_primary || "").toLowerCase().includes(search) ||
            (member.phone_primary || "").toLowerCase().includes(search)
        );

        const matchesState = stateFilter === 'all' || member.state === stateFilter;
        
        const matchesDonation = donationFilter === 'all' 
            ? true 
            : donationFilter === 'donated' 
                ? !!member.donation 
                : !member.donation;

        return matchesSearch && matchesState && matchesDonation;
    }).sort((a, b) => {
        const aValue = (a[sortConfig.key] || "").toString().toLowerCase();
        const bValue = (b[sortConfig.key] || "").toString().toLowerCase();
        
        if (sortConfig.key === 'donation') {
             // Try to sort donation numerically if possible
             const aNum = parseFloat(aValue.replace(/[^0-9.-]+/g,""));
             const bNum = parseFloat(bValue.replace(/[^0-9.-]+/g,""));
             if (!isNaN(aNum) && !isNaN(bNum)) {
                 return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
             }
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

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
            phone_primary: formData.get('phone_primary'),
            phone_secondary: formData.get('phone_secondary'),
            email_primary: formData.get('email_primary'),
            email_secondary: formData.get('email_secondary'),
            donation: formData.get('donation'),
            comments: formData.get('comments'),
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
                <div className="flex gap-2">
                    <Button variant="outline" onClick={exportToCSV}>
                        <Download className="w-4 h-4 mr-2" /> Export CSV
                    </Button>
                    <Button 
                        onClick={() => { setEditingMember(null); setIsDialogOpen(true); }}
                        className="bg-teal-700 hover:bg-teal-800"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add Member
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                        <Input
                            placeholder="Search by name or city..."
                            className="pl-9 bg-stone-50"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={stateFilter} onValueChange={setStateFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by State" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All States</SelectItem>
                            {uniqueStates.map(state => (
                                <SelectItem key={state} value={state}>{state}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={donationFilter} onValueChange={setDonationFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Donation Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Members</SelectItem>
                            <SelectItem value="donated">Donors Only</SelectItem>
                            <SelectItem value="none">Non-Donors</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="rounded-md border border-stone-200 overflow-hidden">
                    <div className="overflow-x-auto max-h-[600px]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-stone-100 text-stone-700 font-serif sticky top-0 z-10">
                                <tr>
                                    <th className="p-4 font-semibold cursor-pointer hover:bg-stone-200" onClick={() => handleSort('last_name')}>
                                        <div className="flex items-center gap-1">Last Name <ArrowUpDown className="w-3 h-3" /></div>
                                    </th>
                                    <th className="p-4 font-semibold cursor-pointer hover:bg-stone-200" onClick={() => handleSort('first_name')}>
                                        <div className="flex items-center gap-1">First Name <ArrowUpDown className="w-3 h-3" /></div>
                                    </th>
                                    <th className="p-4 font-semibold">Address</th>
                                    <th className="p-4 font-semibold">Contact</th>
                                    <th className="p-4 font-semibold cursor-pointer hover:bg-stone-200" onClick={() => handleSort('city')}>
                                        <div className="flex items-center gap-1">City <ArrowUpDown className="w-3 h-3" /></div>
                                    </th>
                                    <th className="p-4 font-semibold cursor-pointer hover:bg-stone-200" onClick={() => handleSort('state')}>
                                        <div className="flex items-center gap-1">State <ArrowUpDown className="w-3 h-3" /></div>
                                    </th>
                                    <th className="p-4 font-semibold">Zip</th>
                                    <th className="p-4 font-semibold cursor-pointer hover:bg-stone-200" onClick={() => handleSort('donation')}>
                                        <div className="flex items-center gap-1">Donation <ArrowUpDown className="w-3 h-3" /></div>
                                    </th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 bg-white">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="7" className="p-8 text-center text-stone-500 italic">
                                            Loading members...
                                        </td>
                                    </tr>
                                ) : filteredMembers.length === 0 ? (
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
                                            <td className="p-4 text-stone-600 text-xs">
                                                {member.phone_primary && <div className="flex items-center gap-1 mb-0.5"><Phone className="w-3 h-3" /> {member.phone_primary}</div>}
                                                {member.email_primary && <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> {member.email_primary}</div>}
                                            </td>
                                            <td className="p-4 text-stone-600">{member.city}</td>
                                            <td className="p-4 text-stone-600">{member.state}</td>
                                            <td className="p-4 text-stone-600 font-mono text-xs">{member.zip}</td>
                                            <td className="p-4 text-stone-600">{member.donation}</td>
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
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone_primary">Primary Phone</Label>
                                <Input id="phone_primary" name="phone_primary" defaultValue={editingMember?.phone_primary} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone_secondary">Secondary Phone</Label>
                                <Input id="phone_secondary" name="phone_secondary" defaultValue={editingMember?.phone_secondary} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="email_primary">Primary Email</Label>
                                <Input id="email_primary" name="email_primary" type="email" defaultValue={editingMember?.email_primary} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email_secondary">Secondary Email</Label>
                                <Input id="email_secondary" name="email_secondary" type="email" defaultValue={editingMember?.email_secondary} />
                            </div>
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
                        <div className="space-y-2">
                            <Label htmlFor="donation">Donation</Label>
                            <Input id="donation" name="donation" defaultValue={editingMember?.donation} placeholder="Amount or Type" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="comments">Comments</Label>
                            <Input id="comments" name="comments" defaultValue={editingMember?.comments} placeholder="Additional notes..." />
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