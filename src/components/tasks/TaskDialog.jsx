import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import { Check, Search, User, Repeat, Link2, X } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export default function TaskDialog({ isOpen, onClose, task, onSave, employees = [], allTasks = [] }) {
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

    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title || "",
                description: task.description || "",
                due_date: task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : "",
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
    }, [task, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const dataToSave = { ...formData };
        if (dataToSave.assignee_id === "unassigned") dataToSave.assignee_id = null;
        onSave(dataToSave);
    };

    const filteredEmployees = employees.filter(emp => 
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        (emp.email && emp.email.toLowerCase().includes(employeeSearch.toLowerCase()))
    );

    const getAssigneeLabel = () => {
        if (formData.assignee_id === "unassigned" || !formData.assignee_id) return "Unassigned";
        const emp = employees.find(e => e.id === formData.assignee_id);
        return emp ? `${emp.first_name} ${emp.last_name}` : "Unknown Employee";
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{task ? 'Edit Task' : 'Create New Task'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input 
                            id="title" 
                            required 
                            placeholder="e.g. Weekly Report"
                            value={formData.title} 
                            onChange={(e) => setFormData({...formData, title: e.target.value})} 
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select 
                                value={formData.status} 
                                onValueChange={(val) => setFormData({...formData, status: val})}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="To Do">To Do</SelectItem>
                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="priority">Priority</Label>
                            <Select 
                                value={formData.priority} 
                                onValueChange={(val) => setFormData({...formData, priority: val})}
                            >
                                <SelectTrigger>
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

                    <div className="space-y-2">
                        <Label>Assignee</Label>
                        <div className="relative">
                            <div 
                                className="flex items-center justify-between w-full p-2 border rounded-md cursor-pointer hover:bg-stone-50"
                                onClick={() => setIsAssigneeOpen(!isAssigneeOpen)}
                            >
                                <span className={formData.assignee_id === "unassigned" ? "text-stone-500" : "font-medium"}>
                                    {getAssigneeLabel()}
                                </span>
                                <User className="w-4 h-4 text-stone-400" />
                            </div>

                            {isAssigneeOpen && (
                                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg p-2">
                                    <div className="flex items-center border-b px-2 pb-2 mb-2">
                                        <Search className="w-4 h-4 text-stone-400 mr-2" />
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
                                    <ScrollArea className="h-[200px]">
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
                                                {formData.assignee_id === "unassigned" && <Check className="w-4 h-4 text-teal-600" />}
                                            </div>
                                            {filteredEmployees.map(emp => (
                                                <div 
                                                    key={emp.id}
                                                    className={cn(
                                                        "flex items-center justify-between px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-stone-100",
                                                        formData.assignee_id === emp.id && "bg-stone-100 font-medium"
                                                    )}
                                                    onClick={() => {
                                                        setFormData({...formData, assignee_id: emp.id});
                                                        setIsAssigneeOpen(false);
                                                    }}
                                                >
                                                    <div>
                                                        <div>{emp.first_name} {emp.last_name}</div>
                                                        <div className="text-xs text-stone-400">{emp.email}</div>
                                                    </div>
                                                    {formData.assignee_id === emp.id && <Check className="w-4 h-4 text-teal-600" />}
                                                </div>
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

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="due_date">Due Date</Label>
                            <Input 
                                id="due_date" 
                                type="date"
                                value={formData.due_date} 
                                onChange={(e) => setFormData({...formData, due_date: e.target.value})} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="recurrence" className="flex items-center gap-1">
                                <Repeat className="w-3 h-3" /> Repeats
                            </Label>
                            <Select 
                                value={formData.recurrence} 
                                onValueChange={(val) => setFormData({...formData, recurrence: val})}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Does not repeat</SelectItem>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea 
                            id="description" 
                            rows={3}
                            placeholder="Task details..."
                            value={formData.description} 
                            onChange={(e) => setFormData({...formData, description: e.target.value})} 
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Link2 className="w-3.5 h-3.5" /> Dependencies (Waiting on...)</Label>
                        <Select 
                            onValueChange={(val) => {
                                if (!formData.dependencies.includes(val)) {
                                    setFormData(prev => ({ ...prev, dependencies: [...prev.dependencies, val] }));
                                }
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Add dependency..." />
                            </SelectTrigger>
                            <SelectContent>
                                {allTasks
                                    .filter(t => t.id !== task?.id && !formData.dependencies.includes(t.id))
                                    .map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        
                        {formData.dependencies.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {formData.dependencies.map(depId => {
                                    const depTask = allTasks.find(t => t.id === depId);
                                    return (
                                        <div key={depId} className="flex items-center gap-1 bg-stone-100 px-2 py-1 rounded text-xs">
                                            <span className="truncate max-w-[150px]">{depTask?.title || 'Unknown Task'}</span>
                                            <button 
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, dependencies: prev.dependencies.filter(id => id !== depId) }))}
                                                className="hover:text-red-500"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {task && (
                        <div className="space-y-2 bg-stone-50 p-3 rounded-md border border-stone-200">
                            <Label htmlFor="update_note" className="text-teal-700">Add Update Note</Label>
                            <Textarea 
                                id="update_note" 
                                rows={2}
                                placeholder="Enter details about this update..."
                                value={formData.update_note} 
                                onChange={(e) => setFormData({...formData, update_note: e.target.value})} 
                                className="bg-white"
                            />
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" className="bg-teal-700 hover:bg-teal-800">
                            {task ? 'Update Task' : 'Create Task'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}