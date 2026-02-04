import React, { useState, memo, useCallback, useMemo, lazy, Suspense } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Circle, Clock, Plus, Filter, Search, MoreHorizontal, Pencil, Trash2, Archive, RotateCcw, Timer, Repeat, Link2, Loader2, X } from 'lucide-react';
import { format, isPast, parseISO, isValid } from 'date-fns';
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
import { useDebounce } from './useDebounce';

// Lazy load dialogs for better initial load
const TaskDialog = lazy(() => import('./TaskDialog'));
const TaskTimeLogDialog = lazy(() => import('./TaskTimeLogDialog'));

// Safe date formatter
const safeFormatDate = (dateStr, formatStr = 'MMM d, yyyy') => {
    if (!dateStr) return '';
    try {
        const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
        return isValid(date) ? format(date, formatStr) : '';
    } catch {
        return '';
    }
};

// Memoized task row component
const TaskRow = memo(({ task, tasks, isAdmin, employeeNameById, onToggleStatus, onEdit, onLogTime, onArchive, onDelete }) => {
    const getAssigneeName = (id) => (!id ? "Unassigned" : (employeeNameById.get(id) || "Unknown"));
    
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
            case 'Completed': return <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />;
            case 'In Progress': return <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />;
            default: return <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-stone-400" />;
        }
    };

    const isOverdue = task.status !== 'Completed' && task.due_date && isPast(parseISO(task.due_date));

    return (
        <div className="flex items-start justify-between p-3 sm:p-4 rounded-lg border border-stone-200 bg-white hover:shadow-md transition-shadow group">
            <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                <button 
                    className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform touch-manipulation"
                    onClick={() => onToggleStatus(task.id, task.status === 'Completed' ? 'To Do' : 'Completed')}
                    title="Toggle Status"
                >
                    {getStatusIcon(task.status)}
                </button>
                <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                        <h3 className={`font-semibold text-sm sm:text-base text-stone-900 truncate max-w-[200px] sm:max-w-none ${task.status === 'Completed' ? 'line-through text-stone-500' : ''}`}>
                            {task.title}
                        </h3>
                        {task.dependencies?.length > 0 && (
                            <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1 py-0 h-4 sm:h-5 border-dashed text-amber-600 border-amber-200 bg-amber-50 hidden sm:flex items-center gap-0.5">
                                <Link2 className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                                <span>{task.dependencies.length}</span>
                            </Badge>
                        )}
                        <Badge variant="outline" className={`text-[9px] sm:text-xs font-normal ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                        </Badge>
                        {isAdmin && (
                            <Badge variant="secondary" className="text-[9px] sm:text-xs bg-stone-100 text-stone-600 truncate max-w-[80px] sm:max-w-none">
                                {getAssigneeName(task.assignee_id)}
                            </Badge>
                        )}
                    </div>
                    {task.description && (
                        <p className="text-xs sm:text-sm text-stone-600 line-clamp-2">{task.description}</p>
                    )}
                    
                    <div className="flex items-center gap-2 sm:gap-4 pt-1 text-[10px] sm:text-xs text-stone-400 flex-wrap">
                        {task.due_date && (
                            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
                                <Clock className="w-3 h-3" />
                                {safeFormatDate(task.due_date)}
                                {isOverdue && <span className="hidden sm:inline"> (Overdue)</span>}
                            </span>
                        )}
                        {task.recurrence && task.recurrence !== 'none' && (
                            <span className="flex items-center gap-1 text-teal-600 font-medium capitalize">
                                <Repeat className="w-3 h-3" />
                                <span className="hidden sm:inline">{task.recurrence}</span>
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size="sm" className="bg-teal-700 hover:bg-teal-800 text-white shadow-sm font-medium h-7 sm:h-8 px-2 sm:px-3 text-xs">
                        <span className="hidden sm:inline mr-1">Actions</span>
                        <MoreHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="text-sm">
                    {!task.is_archived && (
                        <>
                            <DropdownMenuItem onClick={() => onLogTime(task)}>
                                <Timer className="w-4 h-4 mr-2" /> Log Time
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(task)}>
                                <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                        </>
                    )}
                    {isAdmin && !task.is_archived && (
                        <DropdownMenuItem onClick={() => onArchive(task.id, true)}>
                            <Archive className="w-4 h-4 mr-2" /> Archive
                        </DropdownMenuItem>
                    )}
                    {isAdmin && task.is_archived && (
                        <DropdownMenuItem onClick={() => onArchive(task.id, false)}>
                            <RotateCcw className="w-4 h-4 mr-2" /> Restore
                        </DropdownMenuItem>
                    )}
                    {isAdmin && (
                        <DropdownMenuItem className="text-red-600" onClick={() => onDelete(task.id)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
});

const TaskManager = memo(function TaskManager({ isAdmin = false, currentEmployeeId = null }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [loggingTask, setLoggingTask] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 400);
    const [statusFilter, setStatusFilter] = useState("all");
    const [showArchived, setShowArchived] = useState(false);
    
    // Advanced Filters
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [dateFilterType, setDateFilterType] = useState("due_date");
    const [dateRange, setDateRange] = useState({ start: null, end: null });
    const [showFilters, setShowFilters] = useState(false);

    const queryClient = useQueryClient();

    // 1. Fetch Tasks
    const { data: tasks = [], isLoading: isLoadingTasks, isError: isTasksError } = useQuery({
        queryKey: ['tasks', isAdmin, currentEmployeeId, statusFilter, priorityFilter, showArchived, debouncedSearchTerm],
        queryFn: async () => {
            const where = { is_archived: showArchived };
            if (!isAdmin && currentEmployeeId) where.assignee_id = currentEmployeeId;
            if (statusFilter !== 'all') where.status = statusFilter;
            if (priorityFilter !== 'all') where.priority = priorityFilter;
            if (debouncedSearchTerm) {
                const res = await base44.functions.invoke('searchTasks', { isAdmin, currentEmployeeId, statusFilter, priorityFilter, showArchived, searchTerm: debouncedSearchTerm });
                return res.data?.tasks || [];
            }
            return base44.entities.Task.filter(where, '-updated_date', 200);
        },
        initialData: [],
        staleTime: 90_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        retry: 2,
    });

    // 2. Fetch Employees (for assignment mapping)
    const { data: employees = [] } = useQuery({
        queryKey: ['employees-list-tasks'],
        queryFn: () => base44.entities.Employee.list(null, 500),
        initialData: [],
        staleTime: 60 * 60_000,
        gcTime: 2 * 60 * 60_000,
        refetchOnWindowFocus: false,
    });

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
    const employeeNameById = useMemo(() => {
        const map = new Map();
        (employees || []).forEach(e => map.set(e.id, `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Unknown'));
        return map;
    }, [employees]);

    const getAssigneeName = useCallback((id) => (!id ? "Unassigned" : (employeeNameById.get(id) || "Unknown")), [employeeNameById]);

    const handleSave = useCallback((taskData) => {
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
    }, [editingTask, updateTaskMutation, createTaskMutation, getAssigneeName, currentEmployeeId]);

    // Callbacks for task row actions
    const handleToggleStatus = useCallback((id, status) => {
        toggleStatusMutation.mutate({ id, status });
    }, [toggleStatusMutation]);

    const handleEdit = useCallback((task) => {
        setEditingTask(task);
        setIsDialogOpen(true);
    }, []);

    const handleLogTime = useCallback((task) => {
        setLoggingTask(task);
    }, []);

    const handleArchive = useCallback((id, is_archived) => {
        if (is_archived && !confirm("Archive this task?")) return;
        archiveTaskMutation.mutate({ id, is_archived });
    }, [archiveTaskMutation]);

    const handleDelete = useCallback((id) => {
        if (confirm("Permanently delete this task? This cannot be undone.")) {
            deleteTaskMutation.mutate(id);
        }
    }, [deleteTaskMutation]);

    const handleNewTask = useCallback(() => {
        setEditingTask(null);
        setIsDialogOpen(true);
    }, []);

    // Server filters applied above; apply only client-side date range + debounced search here
    const filteredTasks = useMemo(() => {
        let arr = tasks || [];

        if (dateRange.start || dateRange.end) {
            arr = arr.filter((task) => {
                const dateStr = dateFilterType === 'created_date' ? task.created_date : task.due_date;
                if (!dateStr) return false;
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
                return true;
            });
        }

        if (debouncedSearchTerm) {
            const terms = debouncedSearchTerm.toLowerCase().split(/\s+/).filter(Boolean);
            arr = arr.filter((task) => {
                const text = `${task.title || ''} ${task.description || ''} ${getAssigneeName(task.assignee_id)}`.toLowerCase();
                return terms.every((t) => text.includes(t));
            });
        }

        return arr;
    }, [tasks, dateRange.start, dateRange.end, dateFilterType, debouncedSearchTerm, getAssigneeName]);

    return (
        <Card className="h-full border-stone-200 shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 px-3 sm:px-6">
                <div>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-xl font-serif">
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-teal-700" />
                        {isAdmin ? 'Task Management' : 'My Tasks'}
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                        {isAdmin ? 'Manage all tasks and assignments.' : 'Track your assigned work.'}
                    </CardDescription>
                </div>
                <div className="flex gap-2">
                    {isAdmin && (
                        <Button 
                            variant={showArchived ? "secondary" : "outline"} 
                            onClick={() => setShowArchived(!showArchived)}
                            className={`h-8 text-xs sm:text-sm ${showArchived ? "bg-stone-200" : ""}`}
                            size="sm"
                        >
                            <Archive className="w-3.5 h-3.5 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">{showArchived ? "View Active" : "View Archive"}</span>
                            <span className="sm:hidden">{showArchived ? "Active" : "Archive"}</span>
                        </Button>
                    )}
                    {!showArchived && (
                        <Button onClick={handleNewTask} className="bg-teal-700 hover:bg-teal-800 h-8 text-xs sm:text-sm" size="sm">
                            <Plus className="w-3.5 h-3.5 mr-1" /> <span className="hidden sm:inline">New Task</span><span className="sm:hidden">Add</span>
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
                {/* Toolbar */}
                <div className="space-y-3 mb-4">
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-stone-500" />
                            <Input
                                placeholder="Search tasks..."
                                className="pl-8 h-8 sm:h-9 text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowFilters(!showFilters)}
                            className={`h-8 text-xs sm:text-sm ${showFilters ? "bg-stone-100" : ""}`}
                            size="sm"
                        >
                            <Filter className="w-3.5 h-3.5 mr-1" /> <span className="hidden sm:inline">Filters</span>
                            {(priorityFilter !== 'all' || dateRange.start || dateRange.end) && (
                                <Badge variant="secondary" className="ml-1 px-1 h-4 text-[10px] bg-teal-100 text-teal-800">!</Badge>
                            )}
                        </Button>
                        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto hidden lg:block">
                            <TabsList className="h-8">
                                <TabsTrigger value="all" className="text-xs h-7">All</TabsTrigger>
                                <TabsTrigger value="To Do" className="text-xs h-7">To Do</TabsTrigger>
                                <TabsTrigger value="In Progress" className="text-xs h-7">Doing</TabsTrigger>
                                <TabsTrigger value="Completed" className="text-xs h-7">Done</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    {/* Mobile/Tablet Tabs */}
                    <div className="lg:hidden">
                        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
                            <TabsList className="w-full h-8">
                                <TabsTrigger value="all" className="flex-1 text-[10px] sm:text-xs h-7">All</TabsTrigger>
                                <TabsTrigger value="To Do" className="flex-1 text-[10px] sm:text-xs h-7">To Do</TabsTrigger>
                                <TabsTrigger value="In Progress" className="flex-1 text-[10px] sm:text-xs h-7">Doing</TabsTrigger>
                                <TabsTrigger value="Completed" className="flex-1 text-[10px] sm:text-xs h-7">Done</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    {/* Advanced Filters */}
                    {showFilters && (
                        <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-semibold uppercase text-stone-500">Priority</Label>
                                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                    <SelectTrigger className="bg-white h-8 text-sm">
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

                            <div className="space-y-1">
                                <Label className="text-[10px] font-semibold uppercase text-stone-500">Filter Date By</Label>
                                <Select value={dateFilterType} onValueChange={setDateFilterType}>
                                    <SelectTrigger className="bg-white h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="due_date">Due Date</SelectItem>
                                        <SelectItem value="created_date">Creation Date</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                                <Label className="text-[10px] font-semibold uppercase text-stone-500">Date Range</Label>
                                <div className="flex gap-2 items-center">
                                    <Input 
                                        type="date" 
                                        className="bg-white h-8 text-sm flex-1"
                                        value={dateRange.start || ''}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                    />
                                    <span className="text-stone-400 text-xs">-</span>
                                    <Input 
                                        type="date" 
                                        className="bg-white h-8 text-sm flex-1"
                                        value={dateRange.end || ''}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                    />
                                    {(dateRange.start || dateRange.end) && (
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 text-stone-400 hover:text-red-500"
                                            onClick={() => setDateRange({ start: null, end: null })}
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Task List */}
                <div className="space-y-2 sm:space-y-3">
                    {isLoadingTasks ? (
                        <div className="flex items-center justify-center py-12 text-stone-500">
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            Loading tasks...
                        </div>
                    ) : isTasksError ? (
                        <div className="text-center py-12 text-red-500 border-2 border-dashed border-red-200 rounded-lg bg-red-50">
                            <p className="text-sm">Failed to load tasks. Please try again.</p>
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="text-center py-8 sm:py-12 text-stone-500 border-2 border-dashed rounded-lg">
                            <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No tasks found.</p>
                        </div>
                    ) : (
                        filteredTasks.map(task => (
                            <TaskRow 
                                key={task.id}
                                task={task}
                                tasks={tasks}
                                isAdmin={isAdmin}
                                employeeNameById={employeeNameById}
                                onToggleStatus={handleToggleStatus}
                                onEdit={handleEdit}
                                onLogTime={handleLogTime}
                                onArchive={handleArchive}
                                onDelete={handleDelete}
                            />
                        ))
                    )}
                </div>
            </CardContent>

            <Suspense fallback={null}>
                {isDialogOpen && (
                    <TaskDialog 
                        isOpen={isDialogOpen} 
                        onClose={() => { setIsDialogOpen(false); setEditingTask(null); }}
                        task={editingTask}
                        onSave={handleSave}
                        employees={employees}
                        allTasks={tasks}
                    />
                )}

                {loggingTask && (
                    <TaskTimeLogDialog
                        isOpen={!!loggingTask}
                        onClose={() => setLoggingTask(null)}
                        task={loggingTask}
                        currentEmployeeId={currentEmployeeId}
                    />
                )}
            </Suspense>
        </Card>
    );
});

export default TaskManager;