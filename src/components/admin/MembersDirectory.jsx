import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Edit2, Trash2, MapPin, Mail, Phone, ArrowUpDown, Download, Calendar, CheckSquare, Bell, FileClock, History, Filter, ExternalLink } from 'lucide-react';
import { format, isPast, parseISO, addDays, differenceInDays } from 'date-fns';
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
import MemberProfileDialog from './MemberProfileDialog';
import SegmentBuilder from './SegmentBuilder';
import BulkActionDialog from './BulkActionDialog';
import { Checkbox } from "@/components/ui/checkbox";

export default function MembersDirectory() {
    const [searchTerm, setSearchTerm] = useState("");
    const [stateFilter, setStateFilter] = useState("all");
    const [donationFilter, setDonationFilter] = useState("all"); 
    const [followUpFilter, setFollowUpFilter] = useState("all"); 
    const [sortConfig, setSortConfig] = useState({ key: 'last_name', direction: 'asc' });
    
    // Segment & Advanced Filters
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [segmentCriteria, setSegmentCriteria] = useState({ match: 'all', rules: [] });
    const [selectedMemberIds, setSelectedMemberIds] = useState([]);
    const [isBulkActionOpen, setIsBulkActionOpen] = useState(false);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [editingMember, setEditingMember] = useState(null);
    const queryClient = useQueryClient();

    const { data: members, isLoading } = useQuery({
        queryKey: ['members'],
        queryFn: () => base44.entities.Member.list(null, 1000),
        initialData: [],
    });

    const { data: savedSegments } = useQuery({
        queryKey: ['member-segments'],
        queryFn: () => base44.entities.MemberSegment.list(),
        initialData: []
    });

    const saveSegmentMutation = useMutation({
        mutationFn: (name) => base44.entities.MemberSegment.create({ name, criteria: segmentCriteria, description: "Custom segment" }),
        onSuccess: () => {
            queryClient.invalidateQueries(['member-segments']);
            toast.success("Segment saved");
        }
    });

    const bulkActionMutation = useMutation({
        mutationFn: async ({ actionType, config }) => {
            const res = await base44.functions.invoke('processBulkMemberAction', {
                memberIds: selectedMemberIds,
                actionType,
                config
            });
            if (res.data.error) throw new Error(res.data.error);
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(`Processed: ${data.success} successful, ${data.failed} failed`);
            setIsBulkActionOpen(false);
            setSelectedMemberIds([]);
            queryClient.invalidateQueries(['members']);
        },
        onError: (err) => toast.error("Bulk action failed: " + err.message)
    });

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const res = await base44.functions.invoke('manageMember', { action: 'create', data });
            if (res.data.error) throw new Error(res.data.error);
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries(['members']);
            setIsDialogOpen(false);
            setEditingMember(null);
            toast.success("Member added successfully");
            if (data._workflows_triggered?.includes('welcome')) {
                toast.success("Welcome email sent");
            }
            if (data._workflows_triggered?.includes('donation_thank_you')) {
                toast.success("Donation thank-you email sent");
            }
        },
        onError: (err) => toast.error("Failed to create member: " + err.message)
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const res = await base44.functions.invoke('manageMember', { action: 'update', id, data });
            if (res.data.error) throw new Error(res.data.error);
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries(['members']);
            setIsDialogOpen(false);
            setEditingMember(null);
            toast.success("Member updated successfully");
            if (data._workflows_triggered?.includes('donation_thank_you')) {
                toast.success("Donation thank-you email sent");
            }
        },
        onError: (err) => toast.error("Failed to update member: " + err.message)
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const res = await base44.functions.invoke('manageMember', { action: 'delete', id });
            if (res.data.error) throw new Error(res.data.error);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['members']);
            queryClient.invalidateQueries(['member-activity']);
            toast.success("Member removed");
        }
    });

    const { data: activityLogs } = useQuery({
        queryKey: ['member-activity'],
        queryFn: () => base44.entities.MemberActivityLog.list('-timestamp', 50),
        enabled: isActivityLogOpen
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
                `"${m.comments || ''}"`,
                `"${m.last_donation_date || ''}"`,
                `"${m.last_contact_date || ''}"`,
                `"${m.follow_up_date || ''}"`
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "members_directory.csv";
        link.click();
    };

    // Advanced Filtering Logic
    const evaluateRule = (member, rule) => {
        let val = member[rule.field];
        if (val === undefined || val === null) val = "";
        
        const target = rule.value;

        if (rule.operator === 'contains') return String(val).toLowerCase().includes(String(target).toLowerCase());
        if (rule.operator === 'equals') return String(val).toLowerCase() === String(target).toLowerCase();
        if (rule.operator === 'starts_with') return String(val).toLowerCase().startsWith(String(target).toLowerCase());
        if (rule.operator === 'not_equals') return String(val).toLowerCase() !== String(target).toLowerCase();

        // Numeric
        if (['gt', 'lt', 'gte', 'lte'].includes(rule.operator)) {
            const numVal = parseFloat(String(val).replace(/[^0-9.-]+/g,""));
            const numTarget = parseFloat(target);
            if (isNaN(numVal) || isNaN(numTarget)) return false;
            if (rule.operator === 'gt') return numVal > numTarget;
            if (rule.operator === 'lt') return numVal < numTarget;
            if (rule.operator === 'gte') return numVal >= numTarget;
            if (rule.operator === 'lte') return numVal <= numTarget;
        }

        // Date Logic
        if (['before', 'after', 'on', 'days_ago_gt', 'days_ago_lt', 'in_next_days'].includes(rule.operator)) {
            if (!val) return false;
            const dateVal = parseISO(val);
            const today = new Date();
            
            if (rule.operator === 'days_ago_gt') {
                return differenceInDays(today, dateVal) > parseInt(target);
            }
            if (rule.operator === 'days_ago_lt') {
                return differenceInDays(today, dateVal) < parseInt(target);
            }
            if (rule.operator === 'in_next_days') {
                const diff = differenceInDays(dateVal, today);
                return diff >= 0 && diff <= parseInt(target);
            }

            const targetDate = parseISO(target);
            if (rule.operator === 'before') return dateVal < targetDate;
            if (rule.operator === 'after') return dateVal > targetDate;
            if (rule.operator === 'on') return format(dateVal, 'yyyy-MM-dd') === target;
        }

        return false;
    };

    const filteredMembers = (members || []).filter(member => {
        // Basic Filters
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

        let matchesFollowUp = true;
        if (followUpFilter === 'due') {
            matchesFollowUp = member.follow_up_status === 'pending' && member.follow_up_date && (isPast(parseISO(member.follow_up_date)) || format(parseISO(member.follow_up_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'));
        } else if (followUpFilter === 'pending') {
            matchesFollowUp = member.follow_up_status === 'pending';
        }

        // Advanced Segment Filters
        let matchesSegment = true;
        if (showAdvancedFilters && segmentCriteria.rules.length > 0) {
            const results = segmentCriteria.rules.map(rule => evaluateRule(member, rule));
            matchesSegment = segmentCriteria.match === 'all' ? results.every(Boolean) : results.some(Boolean);
        }

        return matchesSearch && matchesState && matchesDonation && matchesFollowUp && matchesSegment;
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
            last_donation_date: formData.get('last_donation_date'),
            last_contact_date: formData.get('last_contact_date'),
            follow_up_date: formData.get('follow_up_date'),
            follow_up_status: formData.get('follow_up_status') || 'pending',
            follow_up_notes: formData.get('follow_up_notes'),
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
                    <Button 
                        variant="outline" 
                        disabled={selectedMemberIds.length !== 1}
                        onClick={() => {
                            if (selectedMemberIds.length === 1) {
                                window.open(`${createPageUrl('MemberProfile')}?id=${selectedMemberIds[0]}`, '_blank');
                            }
                        }}
                        title={selectedMemberIds.length !== 1 ? "Select exactly one member to view profile page" : "Open Member Profile Page"}
                    >
                        <ExternalLink className="w-4 h-4 mr-2" /> Profile Page
                    </Button>
                    <Button variant="outline" onClick={() => setIsActivityLogOpen(true)}>
                        <History className="w-4 h-4 mr-2" /> Audit Log
                    </Button>
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
                    <Select value={followUpFilter} onValueChange={setFollowUpFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Follow-Up" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="due">Due / Overdue</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                    </Select>

                    <Button 
                    variant={showAdvancedFilters ? "secondary" : "outline"}
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={showAdvancedFilters ? "bg-stone-200 border-stone-300" : ""}
                    >
                    <Filter className="w-4 h-4 mr-2" /> Advanced
                    </Button>
                    </div>

                    {showAdvancedFilters && (
                    <div className="mb-6 animate-in fade-in slide-in-from-top-2">
                    <SegmentBuilder 
                        criteria={segmentCriteria} 
                        onChange={setSegmentCriteria} 
                        onSave={(name) => saveSegmentMutation.mutate(name)}
                        savedSegments={savedSegments}
                        onLoadSegment={(seg) => {
                            if (seg && seg.criteria) setSegmentCriteria(seg.criteria);
                        }}
                    />
                    </div>
                    )}

                    {selectedMemberIds.length > 0 && (
                    <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-md flex justify-between items-center animate-in fade-in">
                    <span className="text-teal-800 text-sm font-medium">{selectedMemberIds.length} members selected</span>
                    <div className="flex gap-2">
                         <Button size="sm" variant="ghost" onClick={() => setSelectedMemberIds([])} className="text-teal-700 hover:text-teal-800">
                            Clear Selection
                        </Button>
                        <Button size="sm" className="bg-teal-700 hover:bg-teal-800" onClick={() => setIsBulkActionOpen(true)}>
                            Bulk Actions ({selectedMemberIds.length})
                        </Button>
                    </div>
                    </div>
                    )}

                    <div className="rounded-md border border-stone-200 overflow-hidden">
                    <div className="overflow-x-auto max-h-[600px]">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-stone-100 text-stone-700 font-serif sticky top-0 z-10">
                            <tr>
                                <th className="p-4 w-[40px]">
                                    <Checkbox 
                                        checked={filteredMembers.length > 0 && selectedMemberIds.length === filteredMembers.length}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setSelectedMemberIds(filteredMembers.map(m => m.id));
                                            } else {
                                                setSelectedMemberIds([]);
                                            }
                                        }}
                                    />
                                </th>
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
                                    <th className="p-4 font-semibold">Follow-Up</th>
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
                                        <tr 
                                            key={member.id} 
                                            className={`hover:bg-teal-50/50 transition-colors cursor-pointer ${selectedMemberIds.includes(member.id) ? 'bg-teal-50' : ''}`}
                                            onClick={() => { setSelectedMember(member); setIsProfileOpen(true); }}
                                        >
                                            <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                                <Checkbox 
                                                    checked={selectedMemberIds.includes(member.id)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setSelectedMemberIds([...selectedMemberIds, member.id]);
                                                        } else {
                                                            setSelectedMemberIds(selectedMemberIds.filter(id => id !== member.id));
                                                        }
                                                    }}
                                                />
                                            </td>
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
                                            <td className="p-4">
                                                {member.follow_up_date && member.follow_up_status === 'pending' && (
                                                    <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full w-fit mb-1 ${isPast(parseISO(member.follow_up_date)) ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        <Calendar className="w-3 h-3" />
                                                        {format(parseISO(member.follow_up_date), 'MMM d')}
                                                    </div>
                                                )}
                                                {member.last_contact_date && isPast(addDays(parseISO(member.last_contact_date), 180)) && (
                                                    <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full w-fit bg-purple-100 text-purple-700" title="No contact in 6+ months">
                                                        <Bell className="w-3 h-3" /> Re-engage
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-stone-400 hover:text-teal-600"
                                                        title="Open Profile Page"
                                                        onClick={() => window.open(`${createPageUrl('MemberProfile')}?id=${member.id}`, '_blank')}
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-stone-400 hover:text-teal-600"
                                                        title="Open Profile Page"
                                                        onClick={() => window.open(`${createPageUrl('MemberProfile')}?id=${member.id}`, '_blank')}
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Button>
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
                <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[85vh] overflow-y-auto">
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

                        <div className="border-t border-stone-200 pt-4 mt-4">
                            <h4 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
                                <CheckSquare className="w-4 h-4 text-teal-600" /> Tracking & Follow-up
                            </h4>
                            <div className="grid grid-cols-2 gap-4 mb-3">
                                <div className="space-y-2">
                                    <Label htmlFor="last_donation_date" className="text-xs">Last Donation</Label>
                                    <Input id="last_donation_date" name="last_donation_date" type="date" defaultValue={editingMember?.last_donation_date} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="last_contact_date" className="text-xs">Last Contact</Label>
                                    <Input id="last_contact_date" name="last_contact_date" type="date" defaultValue={editingMember?.last_contact_date} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-3">
                                <div className="space-y-2">
                                    <Label htmlFor="follow_up_date" className="text-xs font-medium text-amber-700">Next Follow-up Due</Label>
                                    <Input id="follow_up_date" name="follow_up_date" type="date" defaultValue={editingMember?.follow_up_date} className="border-amber-200 focus:border-amber-400" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="follow_up_status" className="text-xs">Status</Label>
                                    <Select name="follow_up_status" defaultValue={editingMember?.follow_up_status || "pending"}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="follow_up_notes" className="text-xs">Follow-up Notes</Label>
                                <Input id="follow_up_notes" name="follow_up_notes" defaultValue={editingMember?.follow_up_notes} placeholder="Reason for follow-up..." />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" className="bg-teal-700 hover:bg-teal-800">Save Member</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Profile Dialog */}
            <MemberProfileDialog 
                member={selectedMember} 
                isOpen={isProfileOpen} 
                onClose={() => setIsProfileOpen(false)} 
                onEdit={(member) => {
                    setEditingMember(member);
                    setIsDialogOpen(true);
                    setIsProfileOpen(false);
                }}
            />

            <BulkActionDialog 
                isOpen={isBulkActionOpen}
                onClose={() => setIsBulkActionOpen(false)}
                selectedCount={selectedMemberIds.length}
                onConfirm={(type, cfg) => bulkActionMutation.mutate({ actionType: type, config: cfg })}
            />

            {/* Audit Log Dialog */}
            <Dialog open={isActivityLogOpen} onOpenChange={setIsActivityLogOpen}>
                <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <History className="w-5 h-5 text-teal-600" /> Member Directory Audit Log
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto mt-4 pr-2">
                        {activityLogs?.length > 0 ? (
                            <div className="space-y-4">
                                {activityLogs.map((log) => (
                                    <div key={log.id} className="flex gap-3 text-sm pb-3 border-b border-stone-100 last:border-0">
                                        <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                                            log.action === 'create' ? 'bg-green-500' : 
                                            log.action === 'delete' ? 'bg-red-500' :
                                            log.action === 'update' ? 'bg-blue-500' : 'bg-stone-400'
                                        }`} />
                                        <div className="flex-1">
                                            <div className="flex justify-between">
                                                <span className="font-semibold text-stone-800 capitalize">{log.action}</span>
                                                <span className="text-xs text-stone-400">{format(new Date(log.timestamp), 'MMM d, h:mm a')}</span>
                                            </div>
                                            <p className="text-stone-600 mt-0.5">
                                                <span className="font-medium">{log.member_name}</span> - {log.details}
                                            </p>
                                            <div className="text-xs text-stone-400 mt-1 flex items-center gap-1">
                                                by {log.performed_by}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-stone-500 py-10">No activity recorded yet.</div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}