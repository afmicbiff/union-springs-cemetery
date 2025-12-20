import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, User } from 'lucide-react';
import { toast } from "sonner";

export default function MemberProfile({ user }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone_primary: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        comments: ''
    });

    const { data: memberRecord, isLoading } = useQuery({
        queryKey: ['member-profile', user.email],
        queryFn: async () => {
            const res = await base44.entities.Member.list({ email_primary: user.email }, 1);
            return res[0] || null;
        },
        enabled: !!user.email
    });

    useEffect(() => {
        if (memberRecord) {
            setFormData({
                first_name: memberRecord.first_name || '',
                last_name: memberRecord.last_name || '',
                phone_primary: memberRecord.phone_primary || '',
                address: memberRecord.address || '',
                city: memberRecord.city || '',
                state: memberRecord.state || '',
                zip: memberRecord.zip || '',
                comments: memberRecord.comments || ''
            });
        } else if (user) {
            // Pre-fill from Auth user if no member record yet
            const [first, ...last] = (user.full_name || '').split(' ');
            setFormData(prev => ({
                ...prev,
                first_name: first || '',
                last_name: last.join(' ') || ''
            }));
        }
    }, [memberRecord, user]);

    const updateMutation = useMutation({
        mutationFn: async (data) => {
            if (memberRecord) {
                return await base44.entities.Member.update(memberRecord.id, data);
            } else {
                return await base44.entities.Member.create({
                    ...data,
                    email_primary: user.email,
                    last_contact_date: new Date().toISOString().split('T')[0]
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['member-profile']);
            toast.success("Profile updated successfully");
        },
        onError: (err) => {
            toast.error("Failed to update profile: " + err.message);
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        updateMutation.mutate(formData);
    };

    if (isLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline" /> Loading profile...</div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" /> My Profile
                </CardTitle>
                <CardDescription>
                    Update your personal contact information. This helps us keep you informed.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input 
                                id="firstName" 
                                value={formData.first_name}
                                onChange={e => setFormData({...formData, first_name: e.target.value})}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input 
                                id="lastName" 
                                value={formData.last_name}
                                onChange={e => setFormData({...formData, last_name: e.target.value})}
                                required
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input 
                                id="email" 
                                value={user.email}
                                disabled
                                className="bg-stone-50 text-stone-500"
                            />
                            <p className="text-[10px] text-stone-400">Email cannot be changed here.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input 
                                id="phone" 
                                value={formData.phone_primary}
                                onChange={e => setFormData({...formData, phone_primary: e.target.value})}
                                placeholder="(555) 555-5555"
                            />
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <Label htmlFor="address">Street Address</Label>
                            <Input 
                                id="address" 
                                value={formData.address}
                                onChange={e => setFormData({...formData, address: e.target.value})}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Input 
                                    id="city" 
                                    value={formData.city}
                                    onChange={e => setFormData({...formData, city: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state">State</Label>
                                <Input 
                                    id="state" 
                                    value={formData.state}
                                    onChange={e => setFormData({...formData, state: e.target.value})}
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="zip">Zip Code</Label>
                            <Input 
                                id="zip" 
                                value={formData.zip}
                                onChange={e => setFormData({...formData, zip: e.target.value})}
                            />
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <Label htmlFor="comments">Additional Notes</Label>
                            <Textarea 
                                id="comments" 
                                placeholder="Any other details you'd like us to know..."
                                value={formData.comments}
                                onChange={e => setFormData({...formData, comments: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" className="bg-teal-700 hover:bg-teal-800" disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}