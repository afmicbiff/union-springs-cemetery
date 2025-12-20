import React from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Database, Plus, FileJson, Clock, HardDrive, Upload, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from "sonner";
import PaginationControls from "@/components/ui/PaginationControls";

export default function BackupManager() {
    const queryClient = useQueryClient();
    const [page, setPage] = React.useState(1);
    const limit = 10;

    const { data: backupsData, isLoading } = useQuery({
        queryKey: ['backups', page],
        queryFn: async () => {
            const res = await base44.entities.Backup.list('-created_date', limit, (page - 1) * limit);
            // .list returns array, we need total for pagination if possible, 
            // but base44 list usually just returns array. 
            // We'll assume simple pagination or just list.
            return res; 
        }
    });

    const createBackupMutation = useMutation({
        mutationFn: () => base44.functions.invoke('createBackup'),
        onSuccess: () => {
            toast.success("Backup created successfully");
            queryClient.invalidateQueries({ queryKey: ['backups'] });
        },
        onError: (err) => {
            toast.error("Failed to create backup: " + err.message);
        }
    });

    const downloadBackup = async (fileUri, filename) => {
        const toastId = toast.loading("Generating download link...");
        try {
            const { data } = await base44.functions.invoke('getBackupUrl', { file_uri: fileUri });
            if (data.error) throw new Error(data.error);
            
            // Trigger download
            const link = document.createElement('a');
            link.href = data.signed_url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast.success("Download started", { id: toastId });
        } catch (err) {
            toast.error("Download failed: " + err.message, { id: toastId });
        }
    };

    const restoreBackup = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!confirm("WARNING: You are about to restore data from a backup.\n\nThis is intended for recovery when data is missing. Importing data that already exists may result in errors or duplication.\n\nAre you sure you want to proceed?")) {
            event.target.value = null;
            return;
        }

        const toastId = toast.loading("Reading backup file...");
        
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const jsonContent = JSON.parse(e.target.result);
                    toast.loading("Restoring data... This may take a minute.", { id: toastId });
                    
                    const { data } = await base44.functions.invoke('restoreSystem', { backupData: jsonContent });
                    
                    if (data.error) throw new Error(data.error);
                    
                    toast.success("Restore completed successfully!", { id: toastId });
                    
                    if (data.details?.errors?.length > 0) {
                        console.warn("Restore warnings:", data.details.errors);
                        toast.warning(`Restore finished with ${data.details.errors.length} warnings. Check console.`, { duration: 5000 });
                    }
                    
                    // Refresh current view
                    queryClient.invalidateQueries();
                } catch (err) {
                    console.error(err);
                    toast.error("Restore failed: " + err.message, { id: toastId });
                }
            };
            reader.readAsText(file);
        } catch (err) {
            toast.error("File reading failed", { id: toastId });
        }
        event.target.value = null;
    };

    const formatBytes = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                <div className="space-y-1.5">
                    <CardTitle>System Backups</CardTitle>
                    <CardDescription>
                        Create and manage full system data snapshots. 
                        Backups are stored securely and can be downloaded anytime.
                    </CardDescription>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <input
                            type="file"
                            accept=".json"
                            onChange={restoreBackup}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            title="Restore from JSON Backup"
                        />
                        <Button 
                            variant="outline"
                            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            Restore Data
                        </Button>
                    </div>
                    <Button 
                        onClick={() => createBackupMutation.mutate()} 
                        disabled={createBackupMutation.isPending}
                        className="bg-teal-700 hover:bg-teal-800 text-white"
                    >
                        {createBackupMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Plus className="w-4 h-4 mr-2" />
                        )}
                        Create New Backup
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-stone-50 text-stone-600 font-medium border-b">
                            <tr>
                                <th className="p-4 whitespace-nowrap">Date Created</th>
                                <th className="p-4 whitespace-nowrap">Created By</th>
                                <th className="p-4 whitespace-nowrap">File Size</th>
                                <th className="p-4 whitespace-nowrap">Content Stats</th>
                                <th className="p-4 whitespace-nowrap">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-stone-500">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Loading backups...
                                    </td>
                                </tr>
                            ) : backupsData?.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-stone-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Database className="w-8 h-8 text-stone-300" />
                                            <p>No backups found. Create one to get started.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                backupsData?.map(backup => (
                                    <tr key={backup.id} className="hover:bg-stone-50">
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 font-medium text-stone-900">
                                                <Clock className="w-4 h-4 text-stone-400" />
                                                {format(new Date(backup.created_date), 'MMM d, yyyy HH:mm')}
                                            </div>
                                        </td>
                                        <td className="p-4 text-stone-600">
                                            {backup.created_by_email}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <HardDrive className="w-4 h-4 text-stone-400" />
                                                {formatBytes(backup.file_size)}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-2 flex-wrap">
                                                {backup.stats && Object.entries(backup.stats).map(([key, value]) => (
                                                    <Badge key={key} variant="outline" className="text-xs font-normal text-stone-500 border-stone-200">
                                                        {value} {key}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <Badge variant={backup.status === 'completed' ? 'default' : 'secondary'} 
                                                className={backup.status === 'completed' ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}
                                            >
                                                {backup.status}
                                            </Badge>
                                        </td>
                                        <td className="p-4 text-right">
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => downloadBackup(backup.file_uri, backup.filename)}
                                                className="text-teal-700 border-teal-200 hover:bg-teal-50"
                                            >
                                                <Download className="w-4 h-4 mr-2" />
                                                Download
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                <div className="flex items-center justify-between px-2 py-4">
                     <div className="flex items-center gap-2">
                         <Button
                             variant="outline"
                             size="sm"
                             onClick={() => setPage(p => Math.max(1, p - 1))}
                             disabled={page === 1}
                         >
                             Previous
                         </Button>
                         <span className="text-sm text-stone-600">Page {page}</span>
                         <Button
                             variant="outline"
                             size="sm"
                             onClick={() => setPage(p => p + 1)}
                             disabled={backupsData?.length < limit}
                         >
                             Next
                         </Button>
                     </div>
                </div>

            </CardContent>
        </Card>
    );
}