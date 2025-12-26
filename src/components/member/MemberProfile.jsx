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
            phone_secondary: '',
            address: '',
            city: '',
            state: '',
            zip: '',
            email_secondary: '',
            comments: ''
        });
        const [errors, setErrors] = useState({});
        const requiredFields = ['first_name','last_name','phone_primary','address','city','state','zip'];

        const { data: memberRecord, isLoading } = useQuery({
        queryKey: ['member-profile', user.email],
        queryFn: async () => {
            const res = await base44.entities.Member.filter({ email_primary: user.email }, null, 1);
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
                phone_secondary: memberRecord.phone_secondary || '',
                address: memberRecord.address || '',
                city: memberRecord.city || '',
                state: memberRecord.state || '',
                zip: memberRecord.zip || '',
                email_secondary: memberRecord.email_secondary || '',
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
            // Invalidate all queries starting with this key (covers dashboard and profile tabs)
            queryClient.invalidateQueries({ queryKey: ['member-profile'] });
            toast.success("Profile updated successfully");
        },
        onError: (err) => {
            toast.error("Failed to update profile: " + err.message);
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const missing = requiredFields.filter((f) => !String(formData[f] || '').trim());
        if (missing.length) {
            const newErrors = {};
            missing.forEach((f) => { newErrors[f] = 'Required'; });
            setErrors((prev) => ({ ...prev, ...newErrors }));
            toast.error('Please fill all required fields.');
            return;
        }
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
                            <Label htmlFor="firstName" className={errors.first_name ? 'text-red-600' : ''}>First Name</Label>
                            <Input 
                                id="firstName" 
                                value={formData.first_name}
                                onChange={e => { setFormData({...formData, first_name: e.target.value}); if (errors.first_name) setErrors(prev => ({...prev, first_name: undefined})); }}
                                className={errors.first_name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                            />
                            {errors.first_name && <p className="text-xs text-red-600 mt-1">Required</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName" className={errors.last_name ? 'text-red-600' : ''}>Last Name</Label>
                            <Input 
                                id="lastName" 
                                value={formData.last_name}
                                onChange={e => { setFormData({...formData, last_name: e.target.value}); if (errors.last_name) setErrors(prev => ({...prev, last_name: undefined})); }}
                                className={errors.last_name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                            />
                            {errors.last_name && <p className="text-xs text-red-600 mt-1">Required</p>}
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
                            <Label htmlFor="phone" className={errors.phone_primary ? 'text-red-600' : ''}>Primary Phone</Label>
                            <Input 
                                id="phone" 
                                value={formData.phone_primary}
                                onChange={e => { setFormData({...formData, phone_primary: e.target.value}); if (errors.phone_primary) setErrors(prev => ({...prev, phone_primary: undefined})); }}
                                placeholder="(555) 555-5555"
                                className={errors.phone_primary ? 'border-red-500 focus-visible:ring-red-500' : ''}
                            />
                            {errors.phone_primary && <p className="text-xs text-red-600 mt-1">Required</p>}
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <Label htmlFor="address" className={errors.address ? 'text-red-600' : ''}>Street Address</Label>
                            <Input 
                                id="address" 
                                value={formData.address}
                                onChange={e => { setFormData({...formData, address: e.target.value}); if (errors.address) setErrors(prev => ({...prev, address: undefined})); }}
                                className={errors.address ? 'border-red-500 focus-visible:ring-red-500' : ''}
                            />
                            {errors.address && <p className="text-xs text-red-600 mt-1">Required</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="city" className={errors.city ? 'text-red-600' : ''}>City</Label>
                                <Input 
                                    id="city" 
                                    value={formData.city}
                                    onChange={e => { setFormData({...formData, city: e.target.value}); if (errors.city) setErrors(prev => ({...prev, city: undefined})); }}
                                    className={errors.city ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                />
                                {errors.city && <p className="text-xs text-red-600 mt-1">Required</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state" className={errors.state ? 'text-red-600' : ''}>State</Label>
                                <Input 
                                    id="state" 
                                    value={formData.state}
                                    onChange={e => { setFormData({...formData, state: e.target.value}); if (errors.state) setErrors(prev => ({...prev, state: undefined})); }}
                                    className={errors.state ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                />
                                {errors.state && <p className="text-xs text-red-600 mt-1">Required</p>}
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="zip" className={errors.zip ? 'text-red-600' : ''}>Zip Code</Label>
                            <Input 
                                id="zip" 
                                value={formData.zip}
                                onChange={e => { setFormData({...formData, zip: e.target.value}); if (errors.zip) setErrors(prev => ({...prev, zip: undefined})); }}
                                className={errors.zip ? 'border-red-500 focus-visible:ring-red-500' : ''}
                            />
                            {errors.zip && <p className="text-xs text-red-600 mt-1">Required</p>}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="email_secondary">Secondary Email (Optional)</Label>
                                <Input
                                  id="email_secondary"
                                  type="email"
                                  value={formData.email_secondary}
                                  onChange={e => setFormData({ ...formData, email_secondary: e.target.value })}
                                  placeholder="you+alt@example.com"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="phone_secondary">Secondary Phone (Optional)</Label>
                                <Input
                                  id="phone_secondary"
                                  type="tel"
                                  value={formData.phone_secondary}
                                  onChange={e => setFormData({ ...formData, phone_secondary: e.target.value })}
                                  placeholder="(555) 555-5555"
                                />
                              </div>
                            </div>
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