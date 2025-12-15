import React, { useState } from 'react';
import { useSearchParams, Link, useLocation } from 'react-router-dom';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Heart, Image as ImageIcon, MessageCircle, Share2, Upload, Facebook, Twitter, Link as LinkIcon, PlayCircle, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from "sonner";
import { createPageUrl } from '@/utils';

export default function MemorialPage() {
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const queryClient = useQueryClient();
    const [isUploading, setIsUploading] = useState(false);

    // Fetch Deceased Details
    const { data: deceased, isLoading } = useQuery({
        queryKey: ['deceased', id],
        queryFn: async () => {
            if (!id) return null;
            // Since we don't have a direct get(id) in the SDK usually, we filter by id or list and find
            // Ideally base44.entities.Deceased.get(id) exists, if not we simulate it
            try {
                // Assuming list supports filter by ID or we just filter locally if list returns all (bad for perf but ok for now if get not avail)
                // Better: use filter
                const res = await base44.entities.Deceased.filter({ id });
                return res[0];
            } catch (e) {
                console.error(e);
                return null;
            }
        },
        enabled: !!id
    });

    // Fetch Media
    const { data: mediaList } = useQuery({
        queryKey: ['memorial-media', id],
        queryFn: () => base44.entities.MemorialMedia.filter({ deceased_id: id }),
        enabled: !!id,
        initialData: []
    });

    // Fetch Condolences
    const { data: condolences } = useQuery({
        queryKey: ['condolences', id],
        queryFn: () => base44.entities.Condolence.filter({ deceased_id: id }, '-created_at'), // sort desc
        enabled: !!id,
        initialData: []
    });

    // Fetch Current User for Pre-filling
    const { data: currentUser } = useQuery({
        queryKey: ['currentUser'],
        queryFn: async () => {
            try {
                return await base44.auth.me();
            } catch {
                return null;
            }
        }
    });

    // Mutations
    const uploadMutation = useMutation({
        mutationFn: async (file) => {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            await base44.entities.MemorialMedia.create({
                deceased_id: id,
                url: file_url,
                type: file.type.startsWith('video') ? 'video' : 'image',
                uploaded_at: new Date().toISOString()
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['memorial-media', id]);
            toast.success("Memory uploaded successfully");
            setIsUploading(false);
        },
        onError: (err) => {
            toast.error("Failed to upload: " + err.message);
            setIsUploading(false);
        }
    });

    const condolenceMutation = useMutation({
        mutationFn: (data) => base44.entities.Condolence.create({
            ...data,
            deceased_id: id,
            created_at: new Date().toISOString()
        }),
        onSuccess: () => {
            queryClient.invalidateQueries(['condolences', id]);
            toast.success("Condolence posted");
        }
    });

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploading(true);
        uploadMutation.mutate(file);
    };

    const handleShare = (platform) => {
        const url = window.location.href;
        const text = `In Loving Memory of ${deceased?.first_name} ${deceased?.last_name}`;
        
        if (platform === 'facebook') {
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        } else if (platform === 'twitter') {
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        } else {
            navigator.clipboard.writeText(url);
            toast.success("Link copied to clipboard");
        }
    };

    if (isLoading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-600"/></div>;
    if (!deceased) return <div className="p-12 text-center text-stone-500">Memorial not found.</div>;

    return (
        <div className="min-h-screen bg-stone-50 font-serif">
            {/* Hero / Header */}
            <div className="bg-stone-900 text-stone-100 min-h-[60vh] flex flex-col justify-center py-12 relative overflow-hidden">
                <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?q=80&w=2525&auto=format&fit=crop')] bg-cover bg-center" />
                <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
                    {deceased.image_url && (
                        <img 
                            src={deceased.image_url} 
                            alt={`${deceased.first_name} ${deceased.last_name}`}
                            className="h-auto max-h-64 md:max-h-96 w-auto max-w-full rounded-lg border-4 border-stone-100 shadow-xl mx-auto mb-6"
                        />
                    )}
                    
                    <h1 className="text-4xl md:text-6xl font-bold mb-2">{deceased.first_name} {deceased.last_name}</h1>
                    {(deceased.date_of_birth || deceased.date_of_death) && (
                        <p className="text-xl md:text-2xl text-teal-400 mb-6 italic">
                            {deceased.date_of_birth ? format(new Date(deceased.date_of_birth), 'MMMM d, yyyy') : 'Unknown'} – {deceased.date_of_death ? format(new Date(deceased.date_of_death), 'MMMM d, yyyy') : 'Unknown'}
                        </p>
                    )}
                    
                    <div className="flex justify-center gap-4">
                        <Button variant="outline" className="bg-transparent border-stone-400 text-stone-100 hover:bg-white/10" onClick={() => handleShare('facebook')}>
                            <Facebook className="w-4 h-4 mr-2" /> Share
                        </Button>
                        <Button variant="outline" className="bg-transparent border-stone-400 text-stone-100 hover:bg-white/10" onClick={() => handleShare('twitter')}>
                            <Twitter className="w-4 h-4 mr-2" /> Tweet
                        </Button>
                        <Button variant="outline" className="bg-transparent border-stone-400 text-stone-100 hover:bg-white/10" onClick={() => handleShare('copy')}>
                            <LinkIcon className="w-4 h-4 mr-2" /> Copy Link
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-12">
                <Tabs defaultValue="obituary" className="space-y-8">
                    <div className="relative flex items-center justify-center border-b border-stone-200">
                        <Link to={createPageUrl('Search')} className="absolute left-0 text-stone-500 hover:text-teal-700 transition-colors flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4" /> <span className="hidden md:inline">Back to Search</span>
                        </Link>
                        <TabsList className="bg-transparent border-none rounded-none h-auto p-0 gap-8">
                            <TabsTrigger value="obituary" className="text-lg px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-800">
                                Obituary
                            </TabsTrigger>
                            <TabsTrigger value="gallery" className="text-lg px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-800">
                                Gallery ({mediaList.length})
                            </TabsTrigger>
                            <TabsTrigger value="tributes" className="text-lg px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-800">
                                Tributes ({condolences.length})
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Obituary Tab */}
                    <TabsContent value="obituary" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Card className="bg-white shadow-sm border-stone-200">
                            <CardContent className="p-8 md:p-12">
                                <div className="prose prose-stone max-w-none prose-lg leading-relaxed">
                                    {deceased.obituary ? (
                                        <div dangerouslySetInnerHTML={{ __html: deceased.obituary.replace(/\n/g, '<br/>') }} />
                                    ) : (
                                        <p className="text-stone-500 italic text-center">No obituary available.</p>
                                    )}
                                </div>
                                <div className="mt-12 pt-8 border-t border-stone-100 flex flex-col md:flex-row justify-between items-center text-stone-500 text-sm">
                                    <span>Resting Place: {deceased.plot_location}</span>
                                    {deceased.veteran_status && (
                                        <span className="flex items-center gap-2 mt-2 md:mt-0 text-stone-800 font-bold">
                                            <span className="text-xl">🇺🇸</span> Veteran
                                        </span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Gallery Tab */}
                    <TabsContent value="gallery" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-stone-800">Photo & Video Gallery</h2>
                            <div className="relative">
                                <input 
                                    type="file" 
                                    id="media-upload" 
                                    className="hidden" 
                                    accept="image/*,video/*"
                                    onChange={handleFileUpload}
                                    disabled={isUploading}
                                />
                                <label htmlFor="media-upload">
                                    <Button asChild disabled={isUploading} className="bg-teal-700 hover:bg-teal-800 cursor-pointer">
                                        <span>
                                            {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Upload className="w-4 h-4 mr-2" />}
                                            Upload Memory
                                        </span>
                                    </Button>
                                </label>
                            </div>
                        </div>

                        {mediaList.length === 0 ? (
                            <div className="text-center py-20 bg-stone-100 rounded-lg border-2 border-dashed border-stone-300">
                                <ImageIcon className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                                <p className="text-stone-500">No photos or videos shared yet.</p>
                                <p className="text-sm text-stone-400">Be the first to share a memory.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {mediaList.map((media) => (
                                    <Dialog key={media.id}>
                                        <DialogTrigger>
                                            <div className="aspect-square relative group overflow-hidden rounded-lg cursor-pointer bg-stone-200">
                                                {media.type === 'video' ? (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <video src={media.url} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                                            <PlayCircle className="w-12 h-12 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <img 
                                                        src={media.url} 
                                                        alt="Memory" 
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                                                    />
                                                )}
                                            </div>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-none">
                                            <div className="w-full h-full flex items-center justify-center bg-black">
                                                {media.type === 'video' ? (
                                                    <video src={media.url} controls className="max-h-[80vh] w-auto" />
                                                ) : (
                                                    <img src={media.url} alt="Memory" className="max-h-[80vh] w-auto object-contain" />
                                                )}
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Tributes Tab */}
                    <TabsContent value="tributes" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-1">
                                <Card className="bg-teal-50 border-teal-100 sticky top-24">
                                    <CardHeader>
                                        <CardTitle className="text-teal-800 flex items-center gap-2">
                                            <Heart className="w-5 h-5" /> Leave a Condolence
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <form 
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                const formData = new FormData(e.target);
                                                condolenceMutation.mutate(Object.fromEntries(formData));
                                                if (!currentUser) {
                                                    e.target.reset();
                                                } else {
                                                    // Reset only message if user is logged in
                                                    e.target.elements.message.value = '';
                                                }
                                            }}
                                            className="space-y-4"
                                        >
                                            <Input 
                                                name="author_name" 
                                                placeholder="Your Name" 
                                                required 
                                                className="bg-white"
                                                defaultValue={currentUser?.full_name || ''}
                                                key={currentUser?.full_name ? 'user-name-loaded' : 'user-name-loading'}
                                            />
                                            <Input 
                                                name="relation" 
                                                placeholder="Relation (e.g. Friend)" 
                                                className="bg-white"
                                                defaultValue={currentUser?.default_relation || ''}
                                                key={currentUser?.default_relation ? 'user-relation-loaded' : 'user-relation-loading'}
                                            />
                                            <Textarea name="message" placeholder="Share a memory or condolence..." required className="bg-white min-h-[120px]" />
                                            <Button type="submit" disabled={condolenceMutation.isPending} className="w-full bg-teal-700 hover:bg-teal-800">
                                                {condolenceMutation.isPending ? "Posting..." : "Post Tribute"}
                                            </Button>
                                            {!currentUser && (
                                                <p className="text-xs text-center text-stone-500">
                                                    <Link to={createPageUrl('Profile')} className="underline hover:text-teal-700">Sign in</Link> to save your details for next time.
                                                </p>
                                            )}
                                        </form>
                                    </CardContent>
                                </Card>
                            </div>
                            
                            <div className="md:col-span-2 space-y-6">
                                {condolences.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-lg border border-stone-200">
                                        <MessageCircle className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                                        <p className="text-stone-500">No tributes yet.</p>
                                    </div>
                                ) : (
                                    condolences.map((c) => (
                                        <div key={c.id} className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h4 className="font-bold text-stone-900">{c.author_name}</h4>
                                                    {c.relation && <span className="text-xs text-teal-600 font-medium uppercase tracking-wider">{c.relation}</span>}
                                                </div>
                                                <span className="text-xs text-stone-400">
                                                    {format(new Date(c.created_at), 'MMM d, yyyy')}
                                                </span>
                                            </div>
                                            <p className="text-stone-600 leading-relaxed whitespace-pre-wrap">{c.message}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}