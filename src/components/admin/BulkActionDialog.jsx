import React, { useState, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Sparkles, Loader2 } from 'lucide-react';
import AIEmailAssistant from './AIEmailAssistant';

function BulkActionDialog({ isOpen, onClose, selectedCount, onConfirm, type = 'member' }) {
    const [actionType, setActionType] = useState(
        type === 'employee' ? "change_role" : 
        type === 'archived_employee' ? "reactivate" :
        "send_email"
    );
    const [config, setConfig] = useState({});

    // Reset action type when type prop changes
    React.useEffect(() => {
        setActionType(
            type === 'employee' ? "change_role" : 
            type === 'archived_employee' ? "reactivate" :
            "send_email"
        );
    }, [type]);

    // Fetch employees for task assignment
    const { data: employees, isLoading: employeesLoading } = useQuery({
        queryKey: ['employees-bulk'],
        queryFn: () => base44.entities.Employee.list('-updated_date', 100),
        initialData: [],
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        enabled: isOpen && actionType === 'create_task',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = useCallback(async () => {
        setIsSubmitting(true);
        try {
            await onConfirm(actionType, config);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    }, [actionType, config, onConfirm, onClose]);

    // Validation
    const isValid = useMemo(() => {
        if (actionType === 'send_email') return !!(config.subject?.trim() && config.body?.trim());
        if (actionType === 'create_task') return !!config.title?.trim();
        if (actionType === 'change_role') return !!config.employment_type;
        return true;
    }, [actionType, config]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Bulk Actions ({selectedCount} Selected)</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Select Action</Label>
                        <RadioGroup value={actionType} onValueChange={setActionType} className="flex flex-col gap-2">
                            {type === 'member' && (
                                <>
                                    <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-stone-50 cursor-pointer">
                                        <RadioGroupItem value="send_email" id="email" />
                                        <Label htmlFor="email" className="cursor-pointer font-normal flex-1">Send Targeted Email</Label>
                                    </div>
                                    <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-stone-50 cursor-pointer">
                                        <RadioGroupItem value="create_task" id="task" />
                                        <Label htmlFor="task" className="cursor-pointer font-normal flex-1">Assign Follow-up Task</Label>
                                    </div>
                                </>
                            )}
                            {type === 'employee' && (
                                <>
                                    <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-stone-50 cursor-pointer">
                                        <RadioGroupItem value="change_role" id="role" />
                                        <Label htmlFor="role" className="cursor-pointer font-normal flex-1">Change Role / Employment Type</Label>
                                    </div>
                                    <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-stone-50 cursor-pointer">
                                        <RadioGroupItem value="deactivate" id="deactivate" />
                                        <Label htmlFor="deactivate" className="cursor-pointer font-normal flex-1">Deactivate Employees</Label>
                                    </div>
                                </>
                            )}
                            {type === 'archived_employee' && (
                                <>
                                    <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-stone-50 cursor-pointer">
                                        <RadioGroupItem value="reactivate" id="reactivate" />
                                        <Label htmlFor="reactivate" className="cursor-pointer font-normal flex-1">Reactivate Employees</Label>
                                    </div>
                                </>
                            )}
                        </RadioGroup>
                    </div>

                    {actionType === 'send_email' && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-1">
                                <Label>Subject</Label>
                                <Input 
                                    placeholder="Email Subject" 
                                    value={config.subject || ''} 
                                    onChange={e => setConfig({...config, subject: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <Label>Message Body</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 text-teal-700 border-teal-200 bg-teal-50 hover:bg-teal-100 px-2">
                                                <Sparkles className="w-3 h-3" /> AI Assistant
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[400px]" align="end">
                                            <AIEmailAssistant 
                                                currentSubject={config.subject}
                                                currentBody={config.body}
                                                recipientContext={{ count: selectedCount, type: 'bulk' }}
                                                onApply={(result) => setConfig({ ...config, subject: result.subject, body: result.body })}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <Textarea 
                                    placeholder="Enter your message here. Use {{first_name}} for personalization." 
                                    className="min-h-[120px]"
                                    value={config.body || ''} 
                                    onChange={e => setConfig({...config, body: e.target.value})}
                                />
                                <p className="text-xs text-stone-500">Supported variables: {'{{first_name}}'}, {'{{last_name}}'}</p>
                            </div>
                        </div>
                    )}

                    {actionType === 'create_task' && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-1">
                                <Label>Task Title</Label>
                                <Input 
                                    placeholder="e.g. Annual Check-in" 
                                    value={config.title || ''} 
                                    onChange={e => setConfig({...config, title: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Description</Label>
                                <Textarea 
                                    placeholder="Task details..." 
                                    value={config.description || ''} 
                                    onChange={e => setConfig({...config, description: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label>Due Date</Label>
                                    <Input 
                                        type="date"
                                        value={config.due_date || ''} 
                                        onChange={e => setConfig({...config, due_date: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Priority</Label>
                                    <Select 
                                        value={config.priority} 
                                        onValueChange={v => setConfig({...config, priority: v})}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="High">High</SelectItem>
                                            <SelectItem value="Medium">Medium</SelectItem>
                                            <SelectItem value="Low">Low</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label>Assign To</Label>
                                <Select 
                                    value={config.assignee_id} 
                                    onValueChange={v => setConfig({...config, assignee_id: v})}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Employee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees.map(e => (
                                            <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center space-x-2 pt-2">
                                <Checkbox 
                                    id="update_followup"
                                    checked={config.update_member_followup || false}
                                    onCheckedChange={(checked) => setConfig({...config, update_member_followup: checked})}
                                />
                                <Label htmlFor="update_followup" className="text-sm font-normal">Also update member's "Follow-up" status to Pending</Label>
                            </div>
                        </div>
                    )}

                    {actionType === 'change_role' && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                            <Label>New Employment Type</Label>
                            <Select 
                                value={config.employment_type} 
                                onValueChange={v => setConfig({...config, employment_type: v})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Administrator">Administrator</SelectItem>
                                    <SelectItem value="Paid Employee">Paid Employee</SelectItem>
                                    <SelectItem value="Volunteer">Volunteer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {actionType === 'deactivate' && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                                Warning: This will mark {selectedCount} employees as inactive. They will be moved to the archive and may lose access to the system.
                            </p>
                        </div>
                    )}

                    {actionType === 'reactivate' && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                            <p className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
                                This will reactivate {selectedCount} employees. They will be restored to the active employee list.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={onClose} className="w-full sm:w-auto" disabled={isSubmitting}>Cancel</Button>
                    <Button 
                        className="bg-teal-700 hover:bg-teal-800 w-full sm:w-auto min-w-[140px]"
                        onClick={handleConfirm}
                        disabled={!isValid || isSubmitting}
                    >
                        {isSubmitting ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                        ) : 'Execute Action'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default React.memo(BulkActionDialog);