import React, { useState, useEffect, memo, useCallback, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isValid, parseISO } from 'date-fns';
import { Check, Search, User, Repeat, Link2, X, Loader2, AlertCircle } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Safe date formatter for form
const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    try {
        const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
        return isValid(date) ? format(date, 'yyyy-MM-dd') : '';
    } catch {
        return '';
    }
};

const TaskDialog = memo(function TaskDialog({ isOpen, onClose, task, onSave, employees = [], allTasks = [] }) {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        due_date: "",
        assignee_id: "unassigned",
        status: "To Do",
        priority: "Medium",
        recurrence: "none",
        update_note: "",
        dependencies: []
    });

    const [employeeSearch, setEmployeeSearch] = useState("");
    const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title || "",
                description: task.description || "",
                due_date: formatDateForInput(task.due_date),
                assignee_id: task.assignee_id || "unassigned",
                status: task.status || "To Do",
                priority: task.priority || "Medium",
                recurrence: task.recurrence || "none",
                update_note: "",
                dependencies: task.dependencies || []
            });
        } else {
            setFormData({
                title: "",
                description: "",
                due_date: "",
                assignee_id: "unassigned",
                status: "To Do",
                priority: "Medium",
                recurrence: "none",
                update_note: "",
                dependencies: []
            });
        }
        setIsSubmitting(false);
    }, [task, isOpen]);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        if (isSubmitting) return;
        
        // Validation
        const title = formData.title?.trim();
        if (!title) {
            toast.error("Title is required");
            return;
        }
        if (title.length < 2) {
            toast.error("Title must be at least 2 characters");
            return;
        }
        
        setIsSubmitting(true);
        const dataToSave = { ...formData, title };
        if (dataToSave.assignee_id === "unassigned") dataToSave.assignee_id = null;
        
        // Wrap in try-catch for safety
        try {
            onSave(dataToSave);
        } catch (err) {
            setIsSubmitting(false);
            toast.error("Failed to save task");
        }
    }, [formData, onSave, isSubmitting]);

    const handleCompleteAndArchive = useCallback(() => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        const dataToSave = { ...formData, status: "Completed", is_archived: true };
        if (dataToSave.assignee_id === "unassigned") dataToSave.assignee_id = null;
        onSave(dataToSave);
    }, [formData, onSave, isSubmitting]);

    const filteredEmployees = useMemo(() => {
        const search = employeeSearch.toLowerCase();
        if (!search) return employees.slice(0, 50); // Limit for performance
        return employees.filter(emp => {
            const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
            return fullName.includes(search) || (emp.email?.toLowerCase().includes(search));
        }).slice(0, 50);
    }, [employees, employeeSearch]);

    const getAssigneeLabel = useCallback(() => {
        if (formData.assignee_id === "unassigned" || !formData.assignee_id) return "Unassigned";
        const emp = employees.find(e => e.id === formData.assignee_id);
        return emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || "Unknown" : "Unknown Employee";
    }, [formData.assignee_id, employees]);

    const availableDependencies = useMemo(() => 
        allTasks.filter(t => t.id !== task?.id && !formData.dependencies.includes(t.id)).slice(0, 100),
        [allTasks, task?.id, formData.dependencies]
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="text-base sm:text-lg">{task ? 'Edit Task' : 'Create New Task'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-3 py-2">
                    <div className="space-y-1">
                        <Label htmlFor="title" className="text-xs sm:text-sm">Title *</Label>
                        <Input 
                            id="title" 
                            required 
                            minLength={2}
                            maxLength={200}
                            placeholder="e.g. Weekly Report"
                            value={formData.title} 
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                            className="h-8 sm:h-9 text-sm"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="status" className="text-xs sm:text-sm">Status</Label>
                            <Select 
                                value={formData.status} 
                                onValueChange={(val) => setFormData({...formData, status: val})}
                            >
                                <SelectTrigger className="h-8 sm:h-9 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="To Do">To Do</SelectItem>
                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="priority" className="text-xs sm:text-sm">Priority</Label>
                            <Select 
                                value={formData.priority} 
                                onValueChange={(val) => setFormData({...formData, priority: val})}
                            >
                                <SelectTrigger className="h-8 sm:h-9 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Low">Low</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="High">High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs sm:text-sm">Assignee</Label>
                        <div className="relative">
                            <button 
                                type="button"
                                className="flex items-center justify-between w-full p-2 border rounded-md cursor-pointer hover:bg-stone-50 h-9 sm:h-10 text-sm touch-manipulation"
                                onClick={() => setIsAssigneeOpen(!isAssigneeOpen)}
                            >
                                <span className={`truncate ${formData.assignee_id === "unassigned" ? "text-stone-500" : "font-medium"}`}>
                                    {getAssigneeLabel()}
                                </span>
                                <User className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                            </button>

                            {isAssigneeOpen && (
                                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg p-2">
                                    <div className="flex items-center border-b px-2 pb-2 mb-2" onClick={(e) => e.stopPropagation()}>
                                        <Search className="w-3.5 h-3.5 text-stone-400 mr-2" />
                                        <input
                                            className="w-full text-sm outline-none"
                                            placeholder="Search employees..."
                                            value={employeeSearch}
                                            onChange={(e) => setEmployeeSearch(e.target.value)}
                                            onKeyDown={(e) => { 
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (filteredEmployees.length > 0) {
                                                        setFormData({...formData, assignee_id: filteredEmployees[0].id});
                                                        setIsAssigneeOpen(false);
                                                    }
                                                }
                                            }}
                                            autoFocus
                                        />
                                    </div>
                                    <ScrollArea className="h-[180px]">
                                        <div className="space-y-1">
                                            <div 
                                                className={cn(
                                                    "flex items-center justify-between px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-stone-100",
                                                    formData.assignee_id === "unassigned" && "bg-stone-100 font-medium"
                                                )}
                                                onClick={() => {
                                                    setFormData({...formData, assignee_id: "unassigned"});
                                                    setIsAssigneeOpen(false);
                                                }}
                                            >
                                                <span>Unassigned</span>
                                                {formData.assignee_id === "unassigned" && <Check className="w-3.5 h-3.5 text-teal-600" />}
                                            </div>
                                            {filteredEmployees.map(emp => (
                                                <button 
                                                    type="button"
                                                    key={emp.id}
                                                    className={cn(
                                                        "flex items-center justify-between px-2 py-2.5 sm:py-1.5 text-sm rounded cursor-pointer hover:bg-stone-100 w-full text-left touch-manipulation",
                                                        formData.assignee_id === emp.id && "bg-stone-100 font-medium"
                                                    )}
                                                    onClick={() => {
                                                        setFormData({...formData, assignee_id: emp.id});
                                                        setIsAssigneeOpen(false);
                                                    }}
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="truncate">{emp.first_name} {emp.last_name}</div>
                                                        <div className="text-[10px] text-stone-400 truncate">{emp.email}</div>
                                                    </div>
                                                    {formData.assignee_id === emp.id && <Check className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />}
                                                </button>
                                            ))}
                                            {filteredEmployees.length === 0 && (
                                                <div className="text-center py-4 text-xs text-stone-500">No employees found</div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="due_date" className="text-xs sm:text-sm">Due Date</Label>
                            <Input 
                                id="due_date" 
                                type="date"
                                value={formData.due_date} 
                                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                                className="h-8 sm:h-9 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="recurrence" className="flex items-center gap-1 text-xs sm:text-sm">
                                <Repeat className="w-3 h-3" /> Repeats
                            </Label>
                            <Select 
                                value={formData.recurrence} 
                                onValueChange={(val) => setFormData({...formData, recurrence: val})}
                            >
                                <SelectTrigger className="h-8 sm:h-9 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No repeat</SelectItem>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="description" className="text-xs sm:text-sm">Description</Label>
                        <Textarea 
                            id="description" 
                            rows={2}
                            maxLength={1000}
                            placeholder="Task details..."
                            value={formData.description} 
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            className="text-sm"
                        />
                    </div>

                    <div className="space-y-1">
                        <Label className="flex items-center gap-1 text-xs sm:text-sm"><Link2 className="w-3 h-3" /> Dependencies</Label>
                        <Select 
                            onValueChange={(val) => {
                                if (!formData.dependencies.includes(val)) {
                                    setFormData(prev => ({ ...prev, dependencies: [...prev.dependencies, val] }));
                                }
                            }}
                        >
                            <SelectTrigger className="h-8 sm:h-9 text-sm">
                                <SelectValue placeholder="Add dependency..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableDependencies.map(t => (
                                    <SelectItem key={t.id} value={t.id} className="text-sm">
                                        <span className="truncate max-w-[200px]">{t.title}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        
                        {formData.dependencies.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                                {formData.dependencies.map(depId => {
                                    const depTask = allTasks.find(t => t.id === depId);
                                    return (
                                        <div key={depId} className="flex items-center gap-1 bg-stone-100 px-1.5 py-0.5 rounded text-[10px] sm:text-xs">
                                            <span className="truncate max-w-[100px] sm:max-w-[150px]">{depTask?.title || 'Unknown'}</span>
                                            <button 
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, dependencies: prev.dependencies.filter(id => id !== depId) }))}
                                                className="hover:text-red-500"
                                            >
                                                <X className="w-2.5 h-2.5" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {task && (
                        <div className="space-y-2 bg-stone-50 p-2 sm:p-3 rounded-md border border-stone-200">
                            <Label htmlFor="update_note" className="text-teal-700 text-xs sm:text-sm">Add Update Note</Label>
                            <Textarea 
                                id="update_note" 
                                rows={2}
                                maxLength={500}
                                placeholder="Enter details about this update..."
                                value={formData.update_note} 
                                onChange={(e) => setFormData({...formData, update_note: e.target.value})} 
                                className="bg-white text-sm"
                            />
                            <Button 
                                type="button" 
                                variant="secondary" 
                                size="sm"
                                className="w-full mt-1 bg-green-100 text-green-800 hover:bg-green-200 border border-green-200 h-8 text-xs sm:text-sm"
                                onClick={handleCompleteAndArchive}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5 mr-1" /> Complete & Archive</>}
                            </Button>
                        </div>
                    )}

                    <DialogFooter className="gap-2 pt-2 flex-col sm:flex-row">
                        <Button type="button" variant="outline" onClick={onClose} size="sm" className="h-10 sm:h-8 w-full sm:w-auto touch-manipulation">Cancel</Button>
                        <Button type="submit" className="bg-teal-700 hover:bg-teal-800 h-10 sm:h-8 w-full sm:w-auto touch-manipulation" size="sm" disabled={isSubmitting || !formData.title?.trim()}>
                            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (task ? 'Update Task' : 'Create Task')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
});

export default TaskDialog;