import React, { useState, useEffect, useCallback, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, User, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from "sonner";

const MemberProfile = memo(function MemberProfile({ user }) {
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

    const { data: memberRecord, isLoading, isError, refetch } = useQuery({
        queryKey: ['member-profile', user.email],
        queryFn: async () => {
            const res = await base44.entities.Member.filter({ email_primary: user.email }, null, 1);
            return res[0] || null;
        },
        enabled: !!user.email,
        staleTime: 5 * 60_000,
        retry: 2,
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

    const handleSubmit = useCallback((e) => {
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
    }, [formData, updateMutation]);

    const handleFieldChange = useCallback((field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    }, [errors]);

    if (isLoading) {
        return (
            <div className="p-8 text-center flex flex-col items-center gap-2">
                <Loader2 className="animate-spin w-6 h-6 text-teal-600" />
                <span className="text-sm text-stone-500">Loading profile...</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-8 text-center flex flex-col items-center gap-3 border-2 border-dashed border-red-200 rounded-lg bg-red-50">
                <AlertCircle className="w-8 h-8 text-red-400" />
                <p className="text-sm text-red-600">Failed to load profile</p>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8 text-xs">
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Try Again
                </Button>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader className="px-4 sm:px-6 pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <User className="w-5 h-5" /> My Profile
                </CardTitle>
                <CardDescription className="text-sm">
                    Update your personal contact information. This helps us keep you informed.
                </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="firstName" className={`text-sm ${errors.first_name ? 'text-red-600' : ''}`}>
                                First Name <span className="text-red-500">*</span>
                            </Label>
                            <Input 
                                id="firstName" 
                                value={formData.first_name}
                                onChange={e => handleFieldChange('first_name', e.target.value)}
                                className={`h-10 sm:h-9 text-base sm:text-sm ${errors.first_name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                            />
                            {errors.first_name && <p className="text-xs text-red-600">Required</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="lastName" className={`text-sm ${errors.last_name ? 'text-red-600' : ''}`}>
                                Last Name <span className="text-red-500">*</span>
                            </Label>
                            <Input 
                                id="lastName" 
                                value={formData.last_name}
                                onChange={e => handleFieldChange('last_name', e.target.value)}
                                className={`h-10 sm:h-9 text-base sm:text-sm ${errors.last_name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                            />
                            {errors.last_name && <p className="text-xs text-red-600">Required</p>}
                        </div>
                        
                        <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-sm">Email</Label>
                            <Input 
                                id="email" 
                                value={user.email}
                                disabled
                                className="bg-stone-50 text-stone-500 h-10 sm:h-9 text-base sm:text-sm"
                            />
                            <p className="text-[10px] text-stone-400">Email cannot be changed here.</p>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="phone" className={`text-sm ${errors.phone_primary ? 'text-red-600' : ''}`}>
                                Primary Phone <span className="text-red-500">*</span>
                            </Label>
                            <Input 
                                id="phone" 
                                type="tel"
                                inputMode="tel"
                                value={formData.phone_primary}
                                onChange={e => handleFieldChange('phone_primary', e.target.value)}
                                placeholder="(555) 555-5555"
                                className={`h-10 sm:h-9 text-base sm:text-sm ${errors.phone_primary ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                            />
                            {errors.phone_primary && <p className="text-xs text-red-600">Required</p>}
                        </div>

                        <div className="sm:col-span-2 space-y-1.5">
                            <Label htmlFor="address" className={`text-sm ${errors.address ? 'text-red-600' : ''}`}>
                                Street Address <span className="text-red-500">*</span>
                            </Label>
                            <Input 
                                id="address" 
                                value={formData.address}
                                onChange={e => handleFieldChange('address', e.target.value)}
                                className={`h-10 sm:h-9 text-base sm:text-sm ${errors.address ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                            />
                            {errors.address && <p className="text-xs text-red-600">Required</p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="city" className={`text-sm ${errors.city ? 'text-red-600' : ''}`}>
                                City <span className="text-red-500">*</span>
                            </Label>
                            <Input 
                                id="city" 
                                value={formData.city}
                                onChange={e => handleFieldChange('city', e.target.value)}
                                className={`h-10 sm:h-9 text-base sm:text-sm ${errors.city ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                            />
                            {errors.city && <p className="text-xs text-red-600">Required</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="state" className={`text-sm ${errors.state ? 'text-red-600' : ''}`}>
                                    State <span className="text-red-500">*</span>
                                </Label>
                                <Input 
                                    id="state" 
                                    value={formData.state}
                                    onChange={e => handleFieldChange('state', e.target.value)}
                                    className={`h-10 sm:h-9 text-base sm:text-sm ${errors.state ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                />
                                {errors.state && <p className="text-xs text-red-600">Required</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="zip" className={`text-sm ${errors.zip ? 'text-red-600' : ''}`}>
                                    Zip <span className="text-red-500">*</span>
                                </Label>
                                <Input 
                                    id="zip" 
                                    inputMode="numeric"
                                    value={formData.zip}
                                    onChange={e => handleFieldChange('zip', e.target.value)}
                                    className={`h-10 sm:h-9 text-base sm:text-sm ${errors.zip ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                />
                                {errors.zip && <p className="text-xs text-red-600">Required</p>}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="email_secondary" className="text-sm">Secondary Email (Optional)</Label>
                            <Input
                                id="email_secondary"
                                type="email"
                                inputMode="email"
                                value={formData.email_secondary}
                                onChange={e => handleFieldChange('email_secondary', e.target.value)}
                                placeholder="you+alt@example.com"
                                className="h-10 sm:h-9 text-base sm:text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="phone_secondary" className="text-sm">Secondary Phone (Optional)</Label>
                            <Input
                                id="phone_secondary"
                                type="tel"
                                inputMode="tel"
                                value={formData.phone_secondary}
                                onChange={e => handleFieldChange('phone_secondary', e.target.value)}
                                placeholder="(555) 555-5555"
                                className="h-10 sm:h-9 text-base sm:text-sm"
                            />
                        </div>

                        <div className="sm:col-span-2 space-y-1.5">
                            <Label htmlFor="comments" className="text-sm">Additional Notes</Label>
                            <Textarea 
                                id="comments" 
                                placeholder="Any other details you'd like us to know..."
                                value={formData.comments}
                                onChange={e => handleFieldChange('comments', e.target.value)}
                                className="min-h-[80px] text-base sm:text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button 
                            type="submit" 
                            className="bg-teal-700 hover:bg-teal-800 h-10 sm:h-9 text-sm w-full sm:w-auto touch-manipulation" 
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
});

export default MemberProfile;