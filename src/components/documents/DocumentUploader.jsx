import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, FileUp } from 'lucide-react';
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

export default function DocumentUploader({ onUploadComplete }) {
    const [file, setFile] = useState(null);
    const [type, setType] = useState("Other");
    const [notes, setNotes] = useState("");
    const [uploading, setUploading] = useState(false);

    const docTypes = [
        "Resume",
        "Offer Letter",
        "Form I-9",
        "Form W-4",
        "Form L-4",
        "Minor Cert",
        "Performance Review",
        "Disciplinary Action",
        "Medical",
        "Certification/License",
        "Signed Agreement",
        "Other"
    ];

    const handleUpload = async () => {
        if (!file) {
            toast.error("Please select a file.");
            return;
        }

        setUploading(true);
        try {
            // Use UploadPrivateFile for secure storage
            const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
            
            const newDoc = {
                name: file.name,
                file_uri: file_uri, // Store URI for secure access
                type: type,
                notes: notes,
                uploaded_at: new Date().toISOString()
            };

            await onUploadComplete(newDoc);
            
            // Reset form
            setFile(null);
            setNotes("");
            // Don't reset type, user might upload multiple of same type
            toast.success("Document uploaded securely.");
            
            // Reset file input visually
            const fileInput = document.getElementById("doc-upload-input");
            if (fileInput) fileInput.value = "";

        } catch (error) {
            console.error(error);
            toast.error("Upload failed: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="bg-stone-50 p-4 rounded-md border border-stone-200 space-y-4">
            <h4 className="font-semibold text-stone-800 text-sm flex items-center gap-2">
                <FileUp className="w-4 h-4 text-teal-600" /> Upload Secure Document
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-xs">Document Type</Label>
                    <Select value={type} onValueChange={setType}>
                        <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent>
                            {docTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs">File Selection</Label>
                    <Input 
                        id="doc-upload-input"
                        type="file" 
                        onChange={(e) => setFile(e.target.files[0])}
                        disabled={uploading}
                        className="bg-white"
                    />
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs">Notes (Optional)</Label>
                    <Input 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add context (e.g., '2025 Review', 'Signed by John')..."
                        className="bg-white"
                    />
                </div>
            </div>

            <Button 
                onClick={handleUpload} 
                disabled={uploading || !file}
                className="w-full bg-teal-700 hover:bg-teal-800"
            >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                Upload Securely
            </Button>
        </div>
    );
}