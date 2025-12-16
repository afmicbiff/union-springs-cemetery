import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronLeft, Loader2, CheckSquare } from 'lucide-react';
import { Button } from "@/components/ui/button";
import MemberProfileDetail from '@/components/admin/MemberProfileDetail';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function MemberProfile() {
    const urlParams = new URLSearchParams(window.location.search);
    const memberId = urlParams.get('id');
    const [isEditOpen, setIsEditOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: member, isLoading } = useQuery({
        queryKey: ['member', memberId],
        queryFn: async () => {
            const res = await base44.entities.Member.filter({ id: memberId });
            return res[0];
        },
        enabled: !!memberId
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const res = await base44.functions.invoke('manageMember', { action: 'update', id, data });
            if (res.data.error) throw new Error(res.data.error);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['member', memberId]);
            setIsEditOpen(false);
            toast.success("Member updated successfully");
        },
        onError: (err) => toast.error("Failed to update member: " + err.message)
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
        updateMutation.mutate({ id: member.id, data });
    };

    if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-teal-700" /></div>;
    if (!member) return <div className="p-10 text-center">Member not found</div>;

    return (
        <div className="bg-stone-100 min-h-screen p-6">
            <div className="max-w-6xl mx-auto space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <Link to={createPageUrl('admin')}>
                        <Button variant="ghost" className="pl-0 hover:pl-2 transition-all">
                            <ChevronLeft className="w-4 h-4 mr-2" /> Back to Directory
                        </Button>
                    </Link>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden h-[calc(100vh-140px)]">
                    <MemberProfileDetail 
                        member={member} 
                        onEdit={() => setIsEditOpen(true)}
                    />
                </div>
            </div>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                 <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Member</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="first_name">First Name</Label>
                                <Input id="first_name" name="first_name" defaultValue={member?.first_name} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last_name">Last Name</Label>
                                <Input id="last_name" name="last_name" defaultValue={member?.last_name} required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Input id="address" name="address" defaultValue={member?.address} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone_primary">Primary Phone</Label>
                                <Input id="phone_primary" name="phone_primary" defaultValue={member?.phone_primary} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone_secondary">Secondary Phone</Label>
                                <Input id="phone_secondary" name="phone_secondary" defaultValue={member?.phone_secondary} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="email_primary">Primary Email</Label>
                                <Input id="email_primary" name="email_primary" type="email" defaultValue={member?.email_primary} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email_secondary">Secondary Email</Label>
                                <Input id="email_secondary" name="email_secondary" type="email" defaultValue={member?.email_secondary} />
                            </div>
                        </div>
                        <div className="grid grid-cols-6 gap-4">
                            <div className="col-span-3 space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Input id="city" name="city" defaultValue={member?.city} />
                            </div>
                            <div className="col-span-1 space-y-2">
                                <Label htmlFor="state">State</Label>
                                <Input id="state" name="state" defaultValue={member?.state} maxLength={2} />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="zip">Zip</Label>
                                <Input id="zip" name="zip" defaultValue={member?.zip} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="donation">Donation</Label>
                            <Input id="donation" name="donation" defaultValue={member?.donation} placeholder="Amount or Type" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="comments">Comments</Label>
                            <Input id="comments" name="comments" defaultValue={member?.comments} placeholder="Additional notes..." />
                        </div>

                        <div className="border-t border-stone-200 pt-4 mt-4">
                            <h4 className="text-sm font-semibold text-stone-900 mb-3 flex items-center gap-2">
                                <CheckSquare className="w-4 h-4 text-teal-600" /> Tracking & Follow-up
                            </h4>
                            <div className="grid grid-cols-2 gap-4 mb-3">
                                <div className="space-y-2">
                                    <Label htmlFor="last_donation_date" className="text-xs">Last Donation</Label>
                                    <Input id="last_donation_date" name="last_donation_date" type="date" defaultValue={member?.last_donation_date} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="last_contact_date" className="text-xs">Last Contact</Label>
                                    <Input id="last_contact_date" name="last_contact_date" type="date" defaultValue={member?.last_contact_date} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-3">
                                <div className="space-y-2">
                                    <Label htmlFor="follow_up_date" className="text-xs font-medium text-amber-700">Next Follow-up Due</Label>
                                    <Input id="follow_up_date" name="follow_up_date" type="date" defaultValue={member?.follow_up_date} className="border-amber-200 focus:border-amber-400" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="follow_up_status" className="text-xs">Status</Label>
                                    <Select name="follow_up_status" defaultValue={member?.follow_up_status || "pending"}>
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
                                <Input id="follow_up_notes" name="follow_up_notes" defaultValue={member?.follow_up_notes} placeholder="Reason for follow-up..." />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                            <Button type="submit" className="bg-teal-700 hover:bg-teal-800">Save Changes</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}