import React, { useState, useCallback, useMemo, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Circle, Clock, Search, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { format, isPast, parseISO, isValid } from 'date-fns';
import { toast } from 'sonner';

// Safe date parser
const safeParseISO = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? d : null;
  } catch { return null; }
};

// Memoized task item component
const TaskItem = memo(function TaskItem({ task, onToggle, isToggling }) {
  const dueDate = safeParseISO(task.due_date);
  const updatedDate = safeParseISO(task.updated_date || task.created_date);
  const isOverdue = task.status !== 'Completed' && dueDate && isPast(dueDate);
  
  const statusIcon = useMemo(() => {
    switch (task.status) {
      case 'Completed': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'In Progress': return <Clock className="w-5 h-5 text-amber-500" />;
      default: return <Circle className="w-5 h-5 text-stone-400" />;
    }
  }, [task.status]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between p-3 sm:p-4 rounded-lg border border-stone-200 bg-white gap-3">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <button 
          className="mt-0.5 touch-manipulation shrink-0" 
          title="Toggle status" 
          onClick={() => onToggle(task)}
          disabled={isToggling}
        >
          {isToggling ? <Loader2 className="w-5 h-5 animate-spin text-teal-600" /> : statusIcon}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-semibold text-sm sm:text-base ${task.status === 'Completed' ? 'line-through text-stone-500' : 'text-stone-900'}`}>
              {task.title}
            </h3>
            <Badge variant="outline" className="text-[10px] sm:text-xs text-stone-700 bg-stone-50 border-stone-200">
              {task.priority || 'Medium'}
            </Badge>
          </div>
          {task.description && (
            <p className="text-xs sm:text-sm text-stone-600 mt-1 line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center gap-3 sm:gap-4 pt-2 text-[10px] sm:text-xs text-stone-400 flex-wrap">
            {dueDate && (
              <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                Due {format(dueDate, 'MMM d, yyyy')}
              </span>
            )}
            {updatedDate && (
              <span>Updated {format(updatedDate, 'MMM d')}</span>
            )}
          </div>
        </div>
      </div>
      <div className="shrink-0 self-end sm:self-start">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => onToggle(task)}
          disabled={isToggling}
          className="h-8 text-xs touch-manipulation w-full sm:w-auto"
        >
          {task.status === 'Completed' ? 'Mark To Do' : 'Mark Complete'}
        </Button>
      </div>
    </div>
  );
});

const MemberTasks = memo(function MemberTasks({ user }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [togglingTaskId, setTogglingTaskId] = useState(null);

  // 1) Load member record for this user - with proper caching
  const { data: member, isLoading: memberLoading } = useQuery({
    queryKey: ['member-for-user', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      try {
        const res = await base44.entities.Member.filter({ email_primary: user.email }, null, 1);
        return (res && res[0]) || null;
      } catch {
        return null;
      }
    },
    enabled: !!user?.email,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // 2) Load tasks assigned to this member - with proper error handling
  const { data: tasks = [], isLoading: tasksLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['member-tasks', member?.id],
    queryFn: async () => {
      if (!member?.id) return [];
      try {
        return await base44.entities.Task.filter({ member_id: member.id, is_archived: false }, '-created_date', 100);
      } catch {
        return [];
      }
    },
    enabled: !!member?.id,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchInterval: 60000,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const isLoading = memberLoading || tasksLoading;

  const toggleStatus = useMutation({
    mutationFn: async (task) => {
      setTogglingTaskId(task.id);
      const newStatus = task.status === 'Completed' ? 'To Do' : 'Completed';
      const res = await base44.functions.invoke('updateTaskStatus', { id: task.id, status: newStatus });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['member-tasks-indicator'] });
      toast.success('Task status updated');
    },
    onError: (e) => toast.error(e.message || 'Failed to update task'),
    onSettled: () => setTogglingTaskId(null),
  });

  const handleToggle = useCallback((task) => {
    toggleStatus.mutate(task);
  }, [toggleStatus]);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return (`${t.title} ${t.description || ''}`).toLowerCase().includes(s);
      }
      return true;
    });
  }, [tasks, statusFilter, searchTerm]);

  return (
    <Card className="h-full border-stone-200 shadow-sm">
      <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
        <CardTitle className="text-lg sm:text-xl font-serif flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-teal-700" /> My Tasks
        </CardTitle>
        <CardDescription className="text-sm">Tasks assigned to you by the administrators.</CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
            <Input 
              placeholder="Search tasks..." 
              className="pl-9 h-10 sm:h-9 text-base sm:text-sm" 
              value={searchTerm} 
              onChange={handleSearchChange} 
            />
          </div>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="w-max min-w-full sm:w-auto">
                <TabsTrigger value="all" className="text-xs sm:text-sm touch-manipulation">All</TabsTrigger>
                <TabsTrigger value="To Do" className="text-xs sm:text-sm touch-manipulation">To Do</TabsTrigger>
                <TabsTrigger value="In Progress" className="text-xs sm:text-sm touch-manipulation">Doing</TabsTrigger>
                <TabsTrigger value="Completed" className="text-xs sm:text-sm touch-manipulation">Done</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* List */}
        <div className="space-y-2 sm:space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
              <span className="text-sm text-stone-500">Loading tasks...</span>
            </div>
          ) : isError ? (
            <div className="text-center py-10 border-2 border-dashed border-red-200 rounded-lg bg-red-50">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-600">Failed to load tasks</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3 h-8 text-xs">
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Try Again
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 sm:py-12 text-stone-500 border-2 border-dashed rounded-lg">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-stone-300" />
              <p className="text-sm">No tasks yet.</p>
            </div>
          ) : (
            filtered.map(task => (
              <TaskItem 
                key={task.id} 
                task={task} 
                onToggle={handleToggle}
                isToggling={togglingTaskId === task.id}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export default MemberTasks;