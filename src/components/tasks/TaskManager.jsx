import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Circle, Clock, AlertCircle, Plus, Filter, Search, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import TaskDialog from './TaskDialog';

export default function TaskManager({ isAdmin = false, currentEmployeeId = null }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

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
        queryFn: () => base44.entities.Employee.list({ limit: 1000 }),
        initialData: []
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

    const deleteTaskMutation = useMutation({
        mutationFn: (id) => base44.entities.Task.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['tasks']);
            toast.success("Task deleted");
        }
    });

    // Helpers
    const getAssigneeName = (id) => {
        if (!id) return "Unassigned";
        const emp = employees.find(e => e.id === id);
        return emp ? `${emp.first_name} ${emp.last_name}` : "Unknown";
    };

    const handleSave = (taskData) => {
        if (editingTask) {
            updateTaskMutation.mutate({ id: editingTask.id, data: taskData });
        } else {
            createTaskMutation.mutate(taskData);
        }
    };

    // Filter Logic
    const filteredTasks = tasks.filter(task => {
        // Permission Filter
        if (!isAdmin && currentEmployeeId && task.assignee_id !== currentEmployeeId) {
            return false;
        }

        // Status Filter
        if (statusFilter !== "all" && task.status !== statusFilter) return false;

        // Search Filter
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
            task.title.toLowerCase().includes(searchLower) ||
            (task.description && task.description.toLowerCase().includes(searchLower)) ||
            getAssigneeName(task.assignee_id).toLowerCase().includes(searchLower);

        return matchesSearch;
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
                <Button onClick={() => { setEditingTask(null); setIsDialogOpen(true); }} className="bg-teal-700 hover:bg-teal-800">
                    <Plus className="w-4 h-4 mr-2" /> New Task
                </Button>
            </CardHeader>
            <CardContent>
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-500" />
                        <Input
                            placeholder="Search tasks..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
                        <TabsList>
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="To Do">To Do</TabsTrigger>
                            <TabsTrigger value="In Progress">Doing</TabsTrigger>
                            <TabsTrigger value="Completed">Done</TabsTrigger>
                        </TabsList>
                    </Tabs>
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
                                        className="mt-1 flex-shrink-0"
                                        onClick={() => updateTaskMutation.mutate({ 
                                            id: task.id, 
                                            data: { status: task.status === 'Completed' ? 'To Do' : 'Completed' } 
                                        })}
                                    >
                                        {getStatusIcon(task.status)}
                                    </button>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className={`font-semibold text-stone-900 ${task.status === 'Completed' ? 'line-through text-stone-500' : ''}`}>
                                                {task.title}
                                            </h3>
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
                                        
                                        <div className="flex items-center gap-4 pt-1 text-xs text-stone-400">
                                            {task.due_date && (
                                                <span className={`flex items-center gap-1 ${!task.status === 'Completed' && isPast(parseISO(task.due_date)) ? 'text-red-500 font-medium' : ''}`}>
                                                    <Clock className="w-3 h-3" />
                                                    {format(parseISO(task.due_date), 'MMM d, yyyy')}
                                                    {!task.status === 'Completed' && isPast(parseISO(task.due_date)) && ' (Overdue)'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MoreHorizontal className="w-4 h-4 text-stone-400" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => { setEditingTask(task); setIsDialogOpen(true); }}>
                                            <Pencil className="w-4 h-4 mr-2" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-red-600" onClick={() => {
                                            if(confirm("Delete this task?")) deleteTaskMutation.mutate(task.id);
                                        }}>
                                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                                        </DropdownMenuItem>
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
            />
        </Card>
    );
}