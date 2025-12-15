import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save, User, LogOut } from 'lucide-react';
import { toast } from "sonner";
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        full_name: '',
        default_relation: ''
    });

    const { data: user, isLoading } = useQuery({
        queryKey: ['me'],
        queryFn: async () => {
            try {
                const u = await base44.auth.me();
                return u;
            } catch (e) {
                // Not logged in or error
                return null;
            }
        }
    });

    useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.full_name || '',
                default_relation: user.default_relation || ''
            });
        } else if (!isLoading && user === null) {
            // Redirect to login if needed, or show login button
            // base44.auth.redirectToLogin(createPageUrl('Profile'));
        }
    }, [user, isLoading]);

    const updateMutation = useMutation({
        mutationFn: async (data) => {
            return await base44.auth.updateMe(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['me']);
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

    const handleLogout = async () => {
        await base44.auth.logout();
        navigate(createPageUrl('Home'));
    };

    if (isLoading) {
        return <div className="flex justify-center items-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>;
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle>Sign In Required</CardTitle>
                        <CardDescription>Please sign in to manage your profile.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Button onClick={() => base44.auth.redirectToLogin(window.location.href)} className="bg-teal-700 hover:bg-teal-800">
                            Sign In / Sign Up
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8 font-serif">
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-teal-100 rounded-full">
                                <User className="w-6 h-6 text-teal-700" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl text-stone-900">Your Profile</CardTitle>
                                <CardDescription>Manage your personal information and preferences for tributes.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Full Name</Label>
                                <Input 
                                    id="full_name" 
                                    value={formData.full_name} 
                                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                                    placeholder="Your Name"
                                    className="bg-white"
                                />
                                <p className="text-xs text-stone-500">This name will appear on tributes you post.</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="default_relation">Default Relation</Label>
                                <Input 
                                    id="default_relation" 
                                    value={formData.default_relation} 
                                    onChange={(e) => setFormData({...formData, default_relation: e.target.value})}
                                    placeholder="e.g. Friend, Family, Colleague"
                                    className="bg-white"
                                />
                                <p className="text-xs text-stone-500">This will be automatically filled when you post a tribute.</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Email Address</Label>
                                <Input value={user.email} disabled className="bg-stone-100 text-stone-500" />
                                <p className="text-xs text-stone-400">Email address cannot be changed.</p>
                            </div>

                            <div className="pt-4 flex items-center justify-between">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={handleLogout}
                                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                >
                                    <LogOut className="w-4 h-4 mr-2" /> Sign Out
                                </Button>

                                <Button 
                                    type="submit" 
                                    disabled={updateMutation.isPending}
                                    className="bg-teal-700 hover:bg-teal-800 text-white"
                                >
                                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}