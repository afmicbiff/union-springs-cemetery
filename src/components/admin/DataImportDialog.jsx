import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, Loader2, FileSpreadsheet, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

export default function DataImportDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [file, setFile] = useState(null);
    const queryClient = useQueryClient();

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleImport = async () => {
        if (!file) {
            toast.error("Please select a file first");
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading("Uploading and processing file...");

        try {
            // 1. Upload File
            const uploadRes = await base44.integrations.Core.UploadFile({ file });
            if (!uploadRes.file_url) throw new Error("Upload failed");

            // 2. Call Backend Function
            const importRes = await base44.functions.invoke('importPlotsFromFile', { 
                file_url: uploadRes.file_url 
            });

            if (importRes.data.error) {
                throw new Error(importRes.data.error);
            }

            toast.success(importRes.data.message || "Import successful", { id: toastId });
            
            // Invalidate queries
            queryClient.invalidateQueries({ queryKey: ['plots-admin-list'] });
            queryClient.invalidateQueries({ queryKey: ['plots-admin'] });
            
            setIsOpen(false);
            setFile(null);

        } catch (error) {
            console.error(error);
            toast.error("Import failed: " + error.message, { id: toastId });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-stone-800 text-white hover:bg-stone-900" size="sm">
                    <Upload className="w-4 h-4 md:mr-2" /> 
                    <span className="hidden md:inline">Import Data</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Import Cemetery Data</DialogTitle>
                    <DialogDescription>
                        Upload an Excel (.xlsx, .xls) or CSV file to import or update plots.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    <div className="bg-blue-50 p-3 rounded-md border border-blue-100 flex gap-3 text-sm text-blue-800">
                        <AlertCircle className="w-5 h-5 shrink-0 text-blue-600" />
                        <div>
                            <p className="font-semibold mb-1">Recommended Headers:</p>
                            <p>Section, Row, Plot, First Name, Last Name, Status, Date of Birth, Date of Death, Notes.</p>
                        </div>
                    </div>

                    <div className="border-2 border-dashed border-stone-200 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-stone-50 transition-colors cursor-pointer relative">
                        <input 
                            type="file" 
                            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                            onChange={handleFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            disabled={isUploading}
                        />
                        <div className="bg-teal-50 p-3 rounded-full mb-3">
                            <FileSpreadsheet className="w-6 h-6 text-teal-600" />
                        </div>
                        {file ? (
                            <div className="text-sm">
                                <p className="font-medium text-stone-900">{file.name}</p>
                                <p className="text-stone-500">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                        ) : (
                            <div className="text-sm text-stone-600">
                                <p className="font-medium">Click to upload or drag and drop</p>
                                <p className="text-xs text-stone-400 mt-1">Excel or CSV files</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isUploading}>
                        Cancel
                    </Button>
                    <Button onClick={handleImport} disabled={!file || isUploading} className="bg-teal-700 hover:bg-teal-800">
                        {isUploading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4 mr-2" />
                                Start Import
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}