import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO } from 'date-fns';
import { Clock, Plus, Trash2 } from 'lucide-react';
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TaskTimeLogDialog({ isOpen, onClose, task, currentEmployeeId }) {
    const [minutes, setMinutes] = useState("");
    const [description, setDescription] = useState("");
    const queryClient = useQueryClient();

    const { data: logs, isLoading } = useQuery({
        queryKey: ['time-logs', task?.id],
        queryFn: () => base44.entities.TaskTimeLog.filter({ task_id: task.id }, '-logged_at'),
        enabled: !!task?.id
    });

    const addLogMutation = useMutation({
        mutationFn: (data) => base44.entities.TaskTimeLog.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['time-logs', task.id]);
            setMinutes("");
            setDescription("");
            toast.success("Time logged");
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!minutes || isNaN(minutes)) return;

        addLogMutation.mutate({
            task_id: task.id,
            employee_id: currentEmployeeId || 'unknown',
            minutes: parseInt(minutes),
            description: description,
            logged_at: new Date().toISOString()
        });
    };

    const totalMinutes = logs?.reduce((acc, log) => acc + (log.minutes || 0), 0) || 0;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-teal-600" />
                        Time Tracking: {task?.title}
                    </DialogTitle>
                </DialogHeader>

                <div className="py-2">
                    <div className="bg-stone-50 p-3 rounded-lg border mb-4 flex justify-between items-center">
                        <span className="text-sm font-medium text-stone-600">Total Time Spent</span>
                        <span className="text-lg font-bold text-teal-700">
                            {hours}h {mins}m
                        </span>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 mb-6 border-b pb-6">
                        <div className="grid grid-cols-4 gap-4">
                            <div className="col-span-1 space-y-2">
                                <Label htmlFor="minutes">Minutes</Label>
                                <Input
                                    id="minutes"
                                    type="number"
                                    placeholder="30"
                                    value={minutes}
                                    onChange={(e) => setMinutes(e.target.value)}
                                    required
                                    min="1"
                                />
                            </div>
                            <div className="col-span-3 space-y-2">
                                <Label htmlFor="desc">Notes</Label>
                                <Input
                                    id="desc"
                                    placeholder="What did you work on?"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button type="submit" className="w-full bg-teal-700 hover:bg-teal-800" disabled={!minutes}>
                            <Plus className="w-4 h-4 mr-2" /> Log Time
                        </Button>
                    </form>

                    <Label className="text-xs font-semibold text-stone-500 uppercase mb-2 block">History</Label>
                    <ScrollArea className="h-[200px] pr-4">
                        <div className="space-y-3">
                            {isLoading ? (
                                <p className="text-sm text-stone-400">Loading...</p>
                            ) : logs?.length === 0 ? (
                                <p className="text-sm text-stone-400 italic">No time logs yet.</p>
                            ) : (
                                logs.map(log => (
                                    <div key={log.id} className="text-sm border-l-2 border-stone-200 pl-3 py-1">
                                        <div className="flex justify-between items-start">
                                            <span className="font-medium text-stone-900">{log.minutes} mins</span>
                                            <span className="text-xs text-stone-400">
                                                {format(parseISO(log.logged_at), 'MMM d, h:mm a')}
                                            </span>
                                        </div>
                                        {log.description && (
                                            <p className="text-stone-600 mt-0.5">{log.description}</p>
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
}