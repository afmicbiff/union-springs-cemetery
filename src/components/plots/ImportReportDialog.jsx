import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, AlertTriangle, XCircle, FileText } from 'lucide-react';

export default function ImportReportDialog({ isOpen, onClose, report }) {
    if (!report) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" /> Import Report
                    </DialogTitle>
                    <DialogDescription>
                        Summary of the CSV import process.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-3 gap-4 text-center py-4 border-b">
                    <div className="bg-green-50 p-2 rounded">
                        <div className="text-2xl font-bold text-green-700">{report.created}</div>
                        <div className="text-xs text-green-600 font-medium">Created</div>
                    </div>
                    <div className="bg-blue-50 p-2 rounded">
                        <div className="text-2xl font-bold text-blue-700">{report.updated}</div>
                        <div className="text-xs text-blue-600 font-medium">Updated</div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                        <div className="text-2xl font-bold text-gray-700">{report.skipped}</div>
                        <div className="text-xs text-gray-500 font-medium">Unchanged</div>
                    </div>
                </div>

                <ScrollArea className="h-[200px] mt-2">
                    <div className="space-y-3 pr-2">
                        {report.errors?.length > 0 && (
                            <div>
                                <h4 className="text-sm font-bold text-red-600 mb-1 flex items-center gap-1">
                                    <XCircle className="w-3 h-3" /> Errors ({report.errors.length})
                                </h4>
                                <ul className="text-xs text-red-600 space-y-1 pl-4 list-disc">
                                    {report.errors.map((e, i) => <li key={i}>{e}</li>)}
                                </ul>
                            </div>
                        )}

                        {report.corrections?.length > 0 && (
                            <div>
                                <h4 className="text-sm font-bold text-amber-600 mb-1 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Auto-Corrections ({report.corrections.length})
                                </h4>
                                <ul className="text-xs text-stone-600 space-y-2">
                                    {report.corrections.map((c, i) => (
                                        <li key={i} className="bg-amber-50 p-2 rounded border border-amber-100">
                                            <span className="font-semibold block mb-0.5">Plot {c.plot}</span>
                                            <ul className="pl-3 list-disc text-amber-800">
                                                {c.notes.map((n, j) => <li key={j}>{n}</li>)}
                                            </ul>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {report.errors?.length === 0 && report.corrections?.length === 0 && (
                            <div className="text-center text-gray-400 py-8 flex flex-col items-center">
                                <CheckCircle2 className="w-8 h-8 mb-2 opacity-50" />
                                <p className="text-sm">Import completed perfectly.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter>
                    <Button onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}