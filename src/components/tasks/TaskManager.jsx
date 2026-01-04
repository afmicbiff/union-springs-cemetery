import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Circle, Clock, AlertCircle, Plus, Filter, Search, MoreHorizontal, Pencil, Trash2, Archive, RotateCcw, Timer, Repeat, Link2 } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar"; 
import { CalendarIcon, X } from "lucide-react";
import TaskDialog from './TaskDialog';
import TaskTimeLogDialog from './TaskTimeLogDialog';

export default function TaskManager({ isAdmin = false, currentEmployeeId = null }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [loggingTask, setLoggingTask] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    const [statusFilter, setStatusFilter] = useState("all");
    const [showArchived, setShowArchived] = useState(false);
    
    // Advanced Filters
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [dateFilterType, setDateFilterType] = useState("due_date");
    const [dateRange, setDateRange] = useState({ start: null, end: null });
    const [showFilters, setShowFilters] = useState(false);

    const queryClient = useQueryClient();

    // 1. Fetch Tasks
    const { data: tasks, isLoading: isLoadingTasks } = useQuery({
        queryKey: ['tasks'],
        queryFn: () => base44.entities.Task.list('-created_date', 100), // Sort by newest
        initialData: []
    });

    // 2. Fetch Employees (for assignment mapping)
    const { data: employees } = useQuery({
        queryKey: ['employees-list-tasks'],
        queryFn: () => base44.entities.Employee.list(null, 1000),
        initialData: []
    });
    const employeesById = {};
    (employees || []).forEach(e => { if (e?.id) employeesById[e.id] = e; });

    // Mutations
    const createTaskMutation = useMutation({
        mutationFn: async (data) => {
            const res = await base44.functions.invoke('createTask', data);
            if (res.data.error) throw new Error(res.data.error);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['tasks']);
            setIsDialogOpen(false);
            setEditingTask(null);
            toast.success("Task created & notification sent");
        },
        onError: (err) => toast.error("Failed to create task: " + err.message)
    });

    const updateTaskMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['tasks']);
            setIsDialogOpen(false);
            setEditingTask(null);
            toast.success("Task updated");
        },
        onError: (err) => toast.error("Failed to update task")
    });

    const toggleStatusMutation = useMutation({
        mutationFn: async ({ id, status }) => {
            const res = await base44.functions.invoke('updateTaskStatus', { id, status });
            if (res.data.error) throw new Error(res.data.error);
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries(['tasks']);
            if (data.status === 'Completed' && data.recurrence && data.recurrence !== 'none') {
                toast.success("Task completed. Next occurrence created.");
            } else {
                toast.success("Task status updated");
            }
        },
        onError: (err) => toast.error("Failed to update status: " + err.message)
    });

    const deleteTaskMutation = useMutation({
        mutationFn: async (id) => {
            await base44.entities.Task.delete(id);
            // Audit Log
            try {
                const user = await base44.auth.me();
                await base44.entities.AuditLog.create({
                    action: 'delete',
                    entity_type: 'Task',
                    entity_id: id,
                    details: 'Task deleted permanently.',
                    performed_by: user.email,
                    timestamp: new Date().toISOString()
                });
            } catch (e) { console.error(e); }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['tasks']);
            toast.success("Task deleted permanently");
        }
    });

    const archiveTaskMutation = useMutation({
        mutationFn: async ({ id, is_archived }) => {
            await base44.entities.Task.update(id, { is_archived });
            // Audit Log
            try {
                const user = await base44.auth.me();
                await base44.entities.AuditLog.create({
                    action: is_archived ? 'archive' : 'unarchive',
                    entity_type: 'Task',
                    entity_id: id,
                    details: is_archived ? 'Task archived.' : 'Task unarchived.',
                    performed_by: user.email,
                    timestamp: new Date().toISOString()
                });
            } catch (e) { console.error(e); }
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries(['tasks']);
            toast.success(variables && variables.is_archived ? "Task archived" : "Task unarchived");
        }
    });

    // Helpers
    const getAssigneeName = (id) => {
        if (!id) return "Unassigned";
        const emp = employeesById[id];
        return emp ? `${emp.first_name} ${emp.last_name}` : "Unknown";
    };

    const handleSave = (taskData) => {
        if (editingTask) {
            const dataToUpdate = { ...taskData };
            
            // Handle update note
            if (dataToUpdate.update_note) {
                const currentUpdates = editingTask.updates || [];
                const empName = getAssigneeName(currentEmployeeId); // Best effort to get current user name if employee
                
                const newUpdate = {
                    note: dataToUpdate.update_note,
                    timestamp: new Date().toISOString(),
                    updated_by: empName !== "Unassigned" ? empName : "Administrator" 
                };
                
                dataToUpdate.updates = [newUpdate, ...currentUpdates];
                delete dataToUpdate.update_note;
            } else {
                delete dataToUpdate.update_note;
            }

            updateTaskMutation.mutate({ id: editingTask.id, data: dataToUpdate });
        } else {
            // Remove update_note if it exists for create (though usually empty)
            const { update_note, ...rest } = taskData;
            createTaskMutation.mutate(rest);
        }
    };

    // Filter Logic
    const filteredTasks = (tasks || []).filter(task => {
        // Archive Filter
        if (showArchived) {
            if (!task.is_archived) return false;
        } else {
            if (task.is_archived) return false;
        }

        // Permission Filter
        if (!isAdmin && currentEmployeeId && task.assignee_id !== currentEmployeeId) {
            return false;
        }

        // Status Filter
        if (statusFilter !== "all" && task.status !== statusFilter) return false;

        // Priority Filter
        if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;

        // Date Range Filter
        if (dateRange.start || dateRange.end) {
            const dateStr = dateFilterType === 'created_date' ? task.created_date : task.due_date;
            if (!dateStr) return false; // If filtering by date but task has none, exclude it
            
            const taskDate = new Date(dateStr);
            taskDate.setHours(0, 0, 0, 0);

            if (dateRange.start) {
                const start = new Date(dateRange.start);
                start.setHours(0, 0, 0, 0);
                if (taskDate < start) return false;
            }
            if (dateRange.end) {
                const end = new Date(dateRange.end);
                end.setHours(23, 59, 59, 999);
                if (taskDate > end) return false;
            }
        }

        // Fuzzy Search
        if (searchTerm) {
            const terms = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
            const hay = `${task.title} ${task.description || ''} ${getAssigneeName(task.assignee_id)}`.toLowerCase();
            return terms.every(t => hay.includes(t));
        }

        return true;
    });

    const getPriorityColor = (p) => {
        switch (p) {
            case 'High': return 'text-red-600 bg-red-50 border-red-200';
            case 'Medium': return 'text-amber-600 bg-amber-50 border-amber-200';
            case 'Low': return 'text-blue-600 bg-blue-50 border-blue-200';
            default: return 'text-stone-600 bg-stone-50 border-stone-200';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Completed': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'In Progress': return <Clock className="w-5 h-5 text-amber-500" />;
            default: return <Circle className="w-5 h-5 text-stone-400" />;
        }
    };

    return (
        <Card className="h-full border-stone-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                    <CardTitle className="flex items-center gap-2 text-xl font-serif">
                        <CheckCircle2 className="w-5 h-5 text-teal-700" />
                        {isAdmin ? 'Task Management' : 'My Tasks'}
                    </CardTitle>
                    <CardDescription>
                        {isAdmin ? 'Manage all tasks and assignments.' : 'Track your assigned work.'}
                    </CardDescription>
                </div>
                <div className="flex gap-2">
                    {isAdmin && (
                        <Button 
                            variant={showArchived ? "secondary" : "outline"} 
                            onClick={() => setShowArchived(!showArchived)}
                            className={showArchived ? "bg-stone-200" : ""}
                        >
                            <Archive className="w-4 h-4 mr-2" />
                            {showArchived ? "View Active Tasks" : "View Archive"}
                        </Button>
                    )}
                    {!showArchived && (
                        <Button onClick={() => { setEditingTask(null); setIsDialogOpen(true); }} className="bg-teal-700 hover:bg-teal-800">
                            <Plus className="w-4 h-4 mr-2" /> New Task
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {/* Toolbar */}
                <div className="space-y-4 mb-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-500" />
                            <Input
                                placeholder="Search by title, description, or assignee..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowFilters(!showFilters)}
                            className={showFilters ? "bg-stone-100" : ""}
                        >
                            <Filter className="w-4 h-4 mr-2" /> Filters
                            {(priorityFilter !== 'all' || dateRange.start || dateRange.end) && (
                                <Badge variant="secondary" className="ml-2 px-1 h-5 bg-teal-100 text-teal-800">!</Badge>
                            )}
                        </Button>
                        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto hidden md:block">
                            <TabsList>
                                <TabsTrigger value="all">All</TabsTrigger>
                                <TabsTrigger value="To Do">To Do</TabsTrigger>
                                <TabsTrigger value="In Progress">Doing</TabsTrigger>
                                <TabsTrigger value="Completed">Done</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    {/* Mobile Tabs */}
                    <div className="md:hidden">
                        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
                            <TabsList className="w-full">
                                <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                                <TabsTrigger value="To Do" className="flex-1">To Do</TabsTrigger>
                                <TabsTrigger value="In Progress" className="flex-1">Doing</TabsTrigger>
                                <TabsTrigger value="Completed" className="flex-1">Done</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    {/* Advanced Filters */}
                    {showFilters && (
                        <div className="p-4 bg-stone-50 rounded-lg border border-stone-200 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-stone-500">Priority</Label>
                                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="All Priorities" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Priorities</SelectItem>
                                        <SelectItem value="High">High</SelectItem>
                                        <SelectItem value="Medium">Medium</SelectItem>
                                        <SelectItem value="Low">Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-stone-500">Filter Date By</Label>
                                <Select value={dateFilterType} onValueChange={setDateFilterType}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="due_date">Due Date</SelectItem>
                                        <SelectItem value="created_date">Creation Date</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-stone-500">Date Range</Label>
                                <div className="flex gap-2 items-center">
                                    <Input 
                                        type="date" 
                                        className="bg-white"
                                        value={dateRange.start || ''}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                    />
                                    <span className="text-stone-400">-</span>
                                    <Input 
                                        type="date" 
                                        className="bg-white"
                                        value={dateRange.end || ''}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                    />
                                    {(dateRange.start || dateRange.end) && (
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-stone-400 hover:text-red-500"
                                            onClick={() => setDateRange({ start: null, end: null })}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Task List */}
                <div className="space-y-3">
                    {filteredTasks.length === 0 ? (
                        <div className="text-center py-12 text-stone-500 border-2 border-dashed rounded-lg">
                            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
                            <p>No tasks found.</p>
                        </div>
                    ) : (
                        filteredTasks.map(task => (
                            <div key={task.id} className="flex items-start justify-between p-4 rounded-lg border border-stone-200 bg-white hover:shadow-md transition-shadow group">
                                <div className="flex items-start gap-3 flex-1">
                                    <button 
                                        className="mt-1 flex-shrink-0 hover:scale-110 transition-transform"
                                        onClick={() => toggleStatusMutation.mutate({ 
                                            id: task.id, 
                                            status: task.status === 'Completed' ? 'To Do' : 'Completed' 
                                        })}
                                        title="Toggle Status"
                                    >
                                        {getStatusIcon(task.status)}
                                    </button>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className={`font-semibold text-stone-900 ${task.status === 'Completed' ? 'line-through text-stone-500' : ''}`}>
                                                {task.title}
                                            </h3>
                                            {task.dependencies && task.dependencies.length > 0 && (
                                                <div className="flex gap-1">
                                                    {task.dependencies.map(depId => {
                                                        const depTask = tasks.find(t => t.id === depId);
                                                        if (!depTask) return null;
                                                        return (
                                                            <Badge key={depId} variant="outline" className={`text-[10px] px-1 py-0 h-5 border-dashed flex items-center gap-1 ${depTask.status === 'Completed' ? 'text-green-600 border-green-200 bg-green-50' : 'text-amber-600 border-amber-200 bg-amber-50'}`}>
                                                                <Link2 className="w-2.5 h-2.5" />
                                                                <span className="max-w-[80px] truncate">{depTask.title}</span>
                                                            </Badge>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            <Badge variant="outline" className={`text-xs font-normal ${getPriorityColor(task.priority)}`}>
                                                {task.priority}
                                            </Badge>
                                            {isAdmin && (
                                                <Badge variant="secondary" className="text-xs bg-stone-100 text-stone-600">
                                                    {getAssigneeName(task.assignee_id)}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-stone-600">{task.description}</p>

                                        {task.updates && task.updates.length > 0 && (
                                            <div className="mt-3 space-y-2 border-t pt-2 border-stone-100">
                                                {task.updates.slice(0, 3).map((update, idx) => (
                                                    <div key={idx} className="text-xs">
                                                        <div className="flex justify-between text-stone-400 mb-0.5">
                                                            <span className="font-medium text-teal-700">{update.updated_by}</span>
                                                            <span>{format(new Date(update.timestamp), 'MMM d, h:mm a')}</span>
                                                        </div>
                                                        <p className="text-stone-600 pl-2 border-l-2 border-stone-200">{update.note}</p>
                                                    </div>
                                                ))}
                                                {task.updates.length > 3 && (
                                                    <p className="text-xs text-stone-400 italic text-center pt-1">
                                                        +{task.updates.length - 3} more updates
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        
                                        <div className="flex items-center gap-4 pt-2 text-xs text-stone-400">
                                            {task.due_date && (
                                                <span className={`flex items-center gap-1 ${task.status !== 'Completed' && isPast(parseISO(task.due_date)) ? 'text-red-500 font-medium' : ''}`}>
                                                    <Clock className="w-3 h-3" />
                                                    {format(parseISO(task.due_date), 'MMM d, yyyy')}
                                                    {task.status !== 'Completed' && isPast(parseISO(task.due_date)) && ' (Overdue)'}
                                                </span>
                                            )}
                                            {task.recurrence && task.recurrence !== 'none' && (
                                                <span className="flex items-center gap-1 text-teal-600 font-medium capitalize">
                                                    <Repeat className="w-3 h-3" />
                                                    {task.recurrence}
                                                </span>
                                            )}
                                            <span className="text-stone-300 mx-1">•</span>
                                            <span className="text-stone-400 italic" title="Last Updated">
                                                Updated {format(parseISO(task.updated_date || task.created_date), 'MMM d, h:mm a')}
                                            </span>
                                            </div>
                                    </div>
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button size="sm" className="bg-teal-700 hover:bg-teal-800 text-white shadow-sm font-medium">
                                            Actions <MoreHorizontal className="w-4 h-4 ml-2" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {!task.is_archived && (
                                            <DropdownMenuItem onClick={() => { setLoggingTask(task); }}>
                                                <Timer className="w-4 h-4 mr-2" /> Log Time
                                            </DropdownMenuItem>
                                        )}

                                        {!task.is_archived && (
                                            <DropdownMenuItem onClick={() => { setEditingTask(task); setIsDialogOpen(true); }}>
                                                <Pencil className="w-4 h-4 mr-2" /> Edit
                                            </DropdownMenuItem>
                                        )}
                                        
                                        {isAdmin && !task.is_archived && (
                                            <DropdownMenuItem onClick={() => {
                                                if(confirm("Archive this task?")) archiveTaskMutation.mutate({ id: task.id, is_archived: true });
                                            }}>
                                                <Archive className="w-4 h-4 mr-2" /> Archive
                                            </DropdownMenuItem>
                                        )}

                                        {isAdmin && task.is_archived && (
                                            <DropdownMenuItem onClick={() => {
                                                archiveTaskMutation.mutate({ id: task.id, is_archived: false });
                                            }}>
                                                <RotateCcw className="w-4 h-4 mr-2" /> Restore
                                            </DropdownMenuItem>
                                        )}

                                        {isAdmin && (
                                            <DropdownMenuItem className="text-red-600" onClick={() => {
                                                if(confirm("Permanently delete this task? This cannot be undone.")) deleteTaskMutation.mutate(task.id);
                                            }}>
                                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>

            <TaskDialog 
                isOpen={isDialogOpen} 
                onClose={() => { setIsDialogOpen(false); setEditingTask(null); }}
                task={editingTask}
                onSave={handleSave}
                employees={employees}
                allTasks={tasks}
            />

            <TaskTimeLogDialog
                isOpen={!!loggingTask}
                onClose={() => setLoggingTask(null)}
                task={loggingTask}
                currentEmployeeId={currentEmployeeId}
            />
            </Card>
            );
            }