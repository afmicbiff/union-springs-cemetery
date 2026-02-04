import React, { useState, memo, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO, isValid } from 'date-fns';
import { Clock, Plus, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

// Safe date formatter
const safeFormatDate = (dateStr, formatStr = 'MMM d, h:mm a') => {
    if (!dateStr) return '';
    try {
        const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
        return isValid(date) ? format(date, formatStr) : '';
    } catch {
        return '';
    }
};

const TaskTimeLogDialog = memo(function TaskTimeLogDialog({ isOpen, onClose, task, currentEmployeeId }) {
    const [minutes, setMinutes] = useState("");
    const [description, setDescription] = useState("");
    const queryClient = useQueryClient();

    const { data: logs = [], isLoading } = useQuery({
        queryKey: ['time-logs', task?.id],
        queryFn: () => base44.entities.TaskTimeLog.filter({ task_id: task.id }, '-logged_at', 50),
        enabled: !!task?.id,
        staleTime: 60_000,
        gcTime: 5 * 60_000,
    });

    const addLogMutation = useMutation({
        mutationFn: (data) => base44.entities.TaskTimeLog.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['time-logs', task.id] });
            setMinutes("");
            setDescription("");
            toast.success("Time logged");
        },
        onError: () => toast.error("Failed to log time")
    });

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        const mins = parseInt(minutes);
        if (!mins || isNaN(mins) || mins < 1 || mins > 1440) {
            toast.error("Please enter valid minutes (1-1440)");
            return;
        }

        addLogMutation.mutate({
            task_id: task.id,
            employee_id: currentEmployeeId || 'unknown',
            minutes: mins,
            description: description.trim(),
            logged_at: new Date().toISOString()
        });
    }, [minutes, description, task?.id, currentEmployeeId, addLogMutation]);

    const { totalMinutes, hours, mins } = useMemo(() => {
        const total = Array.isArray(logs) ? logs.reduce((acc, log) => acc + (log.minutes || 0), 0) : 0;
        return { totalMinutes: total, hours: Math.floor(total / 60), mins: total % 60 };
    }, [logs]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px] p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
                        <Clock className="w-4 h-4 text-teal-600" />
                        <span className="truncate">Time: {task?.title}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="py-1">
                    <div className="bg-stone-50 p-2 sm:p-3 rounded-lg border mb-3 flex justify-between items-center">
                        <span className="text-xs sm:text-sm font-medium text-stone-600">Total Time</span>
                        <span className="text-base sm:text-lg font-bold text-teal-700">
                            {hours}h {mins}m
                        </span>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3 mb-4 border-b pb-4">
                        <div className="grid grid-cols-4 gap-2 sm:gap-3">
                            <div className="col-span-1 space-y-1">
                                <Label htmlFor="minutes" className="text-xs">Mins *</Label>
                                <Input
                                    id="minutes"
                                    type="number"
                                    placeholder="30"
                                    value={minutes}
                                    onChange={(e) => setMinutes(e.target.value)}
                                    required
                                    min="1"
                                    max="1440"
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="col-span-3 space-y-1">
                                <Label htmlFor="desc" className="text-xs">Notes</Label>
                                <Input
                                    id="desc"
                                    placeholder="What did you work on?"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    maxLength={200}
                                    className="h-8 text-sm"
                                />
                            </div>
                        </div>
                        <Button 
                            type="submit" 
                            className="w-full bg-teal-700 hover:bg-teal-800 h-8 text-sm" 
                            size="sm"
                            disabled={!minutes || addLogMutation.isPending}
                        >
                            {addLogMutation.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <><Plus className="w-3.5 h-3.5 mr-1" /> Log Time</>
                            )}
                        </Button>
                    </form>

                    <Label className="text-[10px] font-semibold text-stone-500 uppercase mb-2 block">History</Label>
                    <ScrollArea className="h-[160px] pr-2">
                        <div className="space-y-2">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                                </div>
                            ) : logs.length === 0 ? (
                                <p className="text-xs text-stone-400 italic text-center py-4">No time logs yet.</p>
                            ) : (
                                logs.map(log => (
                                    <div key={log.id} className="text-xs sm:text-sm border-l-2 border-stone-200 pl-2 py-1">
                                        <div className="flex justify-between items-start">
                                            <span className="font-medium text-stone-900">{log.minutes} mins</span>
                                            <span className="text-[10px] text-stone-400">
                                                {safeFormatDate(log.logged_at)}
                                            </span>
                                        </div>
                                        {log.description && (
                                            <p className="text-stone-600 mt-0.5 line-clamp-2">{log.description}</p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
});

export default TaskTimeLogDialog;