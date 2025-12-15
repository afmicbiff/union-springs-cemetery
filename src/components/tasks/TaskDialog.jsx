import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import { Check, Search, User } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export default function TaskDialog({ isOpen, onClose, task, onSave, employees = [] }) {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        due_date: "",
        assignee_id: "unassigned",
        status: "To Do",
        priority: "Medium"
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
                priority: task.priority || "Medium"
            });
        } else {
            setFormData({
                title: "",
                description: "",
                due_date: "",
                assignee_id: "unassigned",
                status: "To Do",
                priority: "Medium"
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
                        <Label htmlFor="description">Description</Label>
                        <Textarea 
                            id="description" 
                            rows={3}
                            placeholder="Task details..."
                            value={formData.description} 
                            onChange={(e) => setFormData({...formData, description: e.target.value})} 
                        />
                    </div>

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