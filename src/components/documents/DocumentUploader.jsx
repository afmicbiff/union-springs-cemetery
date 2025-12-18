import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, FileUp, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function DocumentUploader({ onUploadComplete, versionContext = null }) {
    const [file, setFile] = useState(null);
    const [type, setType] = useState("Other");
    const [category, setCategory] = useState("Other");
    const [notes, setNotes] = useState("");
    const [expirationDate, setExpirationDate] = useState();
    const [uploading, setUploading] = useState(false);

    // Pre-fill if version context is provided
    useEffect(() => {
        if (versionContext) {
            setType(versionContext.type || "Other");
            setCategory(versionContext.category || "Other");
            setNotes(versionContext.notes || "");
            if (versionContext.expiration_date) {
                setExpirationDate(new Date(versionContext.expiration_date));
            }
        }
    }, [versionContext]);

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

    const categories = [
        "Contracts",
        "Certifications",
        "HR Forms",
        "Legal",
        "Other"
    ];

    const handleUpload = async () => {
        if (!file) {
            toast.error("Please select a file.");
            return;
        }

        setUploading(true);
        try {
            const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
            
            const newDoc = {
                id: crypto.randomUUID(),
                group_id: versionContext?.group_id || crypto.randomUUID(),
                version: versionContext ? (versionContext.version || 1) + 1 : 1,
                name: file.name,
                file_uri: file_uri,
                type: type,
                category: category,
                expiration_date: expirationDate ? format(expirationDate, 'yyyy-MM-dd') : null,
                notes: notes,
                uploaded_at: new Date().toISOString()
            };

            await onUploadComplete(newDoc);
            
            // Reset form if not in version context mode (where we usually close dialog after)
            if (!versionContext) {
                setFile(null);
                setNotes("");
                setExpirationDate(undefined);
                // Don't reset type/category, handy for bulk uploads
                const fileInput = document.getElementById("doc-upload-input");
                if (fileInput) fileInput.value = "";
            }
            
            toast.success("Document uploaded securely.");

        } catch (error) {
            console.error(error);
            toast.error("Upload failed: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={cn("bg-stone-50 p-4 rounded-md border border-stone-200 space-y-4", versionContext && "border-none shadow-none bg-transparent p-0")}>
            {!versionContext && (
                <h4 className="font-semibold text-stone-800 text-sm flex items-center gap-2">
                    <FileUp className="w-4 h-4 text-teal-600" /> Upload Secure Document
                </h4>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-xs">Category</Label>
                    <Select value={category} onValueChange={setCategory} disabled={!!versionContext}>
                        <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs">Document Type</Label>
                    <Select value={type} onValueChange={setType} disabled={!!versionContext}>
                        <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent>
                            {docTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs">File Selection</Label>
                    <Input 
                        id="doc-upload-input"
                        type="file" 
                        onChange={(e) => setFile(e.target.files[0])}
                        disabled={uploading}
                        className="bg-white"
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs">Expiration Date (Optional)</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal bg-white",
                                    !expirationDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {expirationDate ? format(expirationDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={expirationDate}
                                onSelect={setExpirationDate}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs">Notes (Optional)</Label>
                    <Input 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add context..."
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
                {versionContext ? `Upload New Version (v${(versionContext.version || 1) + 1})` : "Upload Securely"}
            </Button>
        </div>
    );
}