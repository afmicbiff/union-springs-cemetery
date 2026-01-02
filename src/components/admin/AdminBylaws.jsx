import React, { useRef, useState, useEffect, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, Search as SearchIcon, ExternalLink } from 'lucide-react';

export default function AdminBylaws() {
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const queryClient = useQueryClient();
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [signedUrl, setSignedUrl] = useState(null);
    const [textContent, setTextContent] = useState('');
    const [search, setSearch] = useState('');

    const { data: bylaws = [], isLoading: loadingBylaws } = useQuery({
        queryKey: ['bylaws'],
        queryFn: () => base44.entities.BylawDocument.list('-uploaded_at', 100),
        initialData: [],
    });

    useEffect(() => {
        if (selectedDoc || !bylaws.length) return;
        const lower = (s) => String(s || '').toLowerCase();
        const targetPdf = bylaws.find(d => lower(d.name).includes('union springs cemetery bylaws') && (lower(d.type) === 'pdf' || lower(d.name).endsWith('.pdf')));
        if (targetPdf) { setSelectedDoc(targetPdf); return; }
        const fallbackMgmt = bylaws.find(d => lower(d.name).includes('union springs cemetery management'));
        setSelectedDoc(fallbackMgmt || bylaws[0]);
    }, [bylaws, selectedDoc]);

    const currentExt = useMemo(() => (selectedDoc ? ((selectedDoc.type || selectedDoc.name?.split('.').pop() || '').toLowerCase()) : ''), [selectedDoc]);

    async function loadViewer(doc) {
        if (!doc) return;
        setSignedUrl(null);
        setTextContent('');
        const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: doc.file_uri });
        setSignedUrl(signed_url);
        const ext = (doc.type || doc.name?.split('.').pop() || '').toLowerCase();
        if (["txt","md"].includes(ext)) {
            const res = await fetch(signed_url);
            const txt = await res.text();
            setTextContent(txt);
        }
    }

    useEffect(() => { if (selectedDoc) loadViewer(selectedDoc); }, [selectedDoc]);

    const highlightedText = useMemo(() => {
        if (!search) return textContent;
        try {
            const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const parts = String(textContent).split(new RegExp(`(${safe})`, 'gi'));
            return parts.map((p, i) => (i % 2 ? <mark key={i} className="bg-yellow-200">{p}</mark> : p));
        } catch {
            return textContent;
        }
    }, [textContent, search]);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
            const ext = (file.name.split('.').pop() || '').toLowerCase();
            const type = ["pdf","doc","docx","txt","md"].includes(ext) ? ext : 'other';
            await base44.entities.BylawDocument.create({ name: file.name, file_uri, uploaded_at: new Date().toISOString(), type });
            toast.success('Bylaws uploaded successfully');
            queryClient.invalidateQueries({ queryKey: ['bylaws'] });
        } catch (err) {
            toast.error(`Upload failed: ${err?.message || 'Unknown error'}`);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };
    return (
        <Card>
            <CardHeader>
                <CardTitle>Cemetery Bylaws</CardTitle>
                <CardDescription>View and manage the official bylaws and regulations.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-1">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-stone-400" />
                                <h3 className="text-sm font-semibold text-stone-800">Bylaws Repository</h3>
                            </div>
                            <div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.doc,.docx,.txt,.md"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                <Button size="sm" className="bg-teal-700 hover:bg-teal-800" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                                    {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                    {uploading ? 'Uploading…' : 'Upload'}
                                </Button>
                            </div>
                        </div>
                        <div className="border rounded-md overflow-hidden bg-stone-50">
                            {loadingBylaws ? (
                                <div className="p-4 text-sm text-stone-500">Loading…</div>
                            ) : bylaws.length === 0 ? (
                                <div className="p-4 text-sm text-stone-500">No bylaws uploaded yet.</div>
                            ) : (
                                <ul className="max-h-[520px] overflow-y-auto divide-y divide-stone-200">
                                    {bylaws.map((doc) => (
                                        <li key={doc.id} className={`p-3 cursor-pointer hover:bg-stone-100 ${selectedDoc?.id === doc.id ? 'bg-teal-50' : ''}`} onClick={() => setSelectedDoc(doc)}>
                                            <div className="text-sm font-medium text-stone-800 truncate">{doc.name}</div>
                                            <div className="text-xs text-stone-400">{new Date(doc.uploaded_at || doc.created_date || Date.now()).toLocaleString()}</div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div className="md:col-span-3">
                        <div className="flex items-center gap-2 mb-3">
                            <SearchIcon className="w-4 h-4 text-stone-400" />
                            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search within bylaws…" className="bg-stone-50" />
                            {signedUrl && (
                                <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="ml-auto">
                                    <Button variant="outline" size="sm"><ExternalLink className="w-4 h-4 mr-2" /> Open</Button>
                                </a>
                            )}
                        </div>
                        <div className="border rounded-md bg-white h-[600px] overflow-auto">
                            {!selectedDoc ? (
                                <div className="h-full flex items-center justify-center text-stone-500">Select a document</div>
                            ) : (["txt","md"].includes(currentExt) ? (
                                <div className="p-4 whitespace-pre-wrap font-mono text-sm">{highlightedText}</div>
                            ) : currentExt === 'pdf' ? (
                                signedUrl ? <iframe src={signedUrl} title={selectedDoc.name} className="w-full h-full border-0" /> : <div className="h-full flex items-center justify-center text-stone-500">Preparing preview…</div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-stone-500 p-6 text-center">
                                    Preview not supported. Use the Open button to view this document in a new tab.
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}