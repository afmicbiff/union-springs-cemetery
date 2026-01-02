import React, { useRef, useState } from 'react';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2 } from 'lucide-react';

export default function AdminBylaws() {
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
            toast.success('Bylaws uploaded successfully');
            // Optionally: you could store file_uri in state to list/manage files later
        } catch (err) {
            toast.error(`Upload failed: ${err?.message || 'Unknown error'}`);
        } finally {
            setUploading(false);
            // reset input so same file can be re-selected if needed
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
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-stone-50">
                    <FileText className="w-12 h-12 text-stone-300 mb-4" />
                    <h3 className="text-lg font-semibold text-stone-900 mb-1">Bylaws Repository</h3>
                    <p className="text-stone-500 mb-6 text-center max-w-md">
                        Upload and manage the cemetery's rules, regulations, and bylaws documents here.
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <Button
                        className="bg-teal-700 hover:bg-teal-800"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Upload className="w-4 h-4 mr-2" />
                        )}
                        {uploading ? 'Uploading...' : 'Upload New Bylaws'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}