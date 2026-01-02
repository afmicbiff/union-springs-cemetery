import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Circle, Clock, Search } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function MemberTasks({ user }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 1) Load member record for this user
  const { data: member } = useQuery({
    queryKey: ['member-for-user', user?.email],
    queryFn: async () => {
      const res = await base44.entities.Member.filter({ email_primary: user.email }, null, 1);
      return (res && res[0]) || null;
    },
    enabled: !!user?.email
  });

  // 2) Load tasks assigned to this member
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['member-tasks', member?.id],
    queryFn: async () => {
      if (!member?.id) return [];
      return base44.entities.Task.filter({ member_id: member.id, is_archived: false }, '-created_date', 100);
    },
    enabled: !!member?.id,
    initialData: []
  });

  const toggleStatus = useMutation({
    mutationFn: async (task) => {
      const newStatus = task.status === 'Completed' ? 'To Do' : 'Completed';
      const res = await base44.functions.invoke('updateTaskStatus', { id: task.id, status: newStatus });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['member-tasks']);
      toast.success('Task status updated');
    },
    onError: (e) => toast.error(e.message || 'Failed to update task')
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed': return <CheckCircle2 className="w-5 h-5 text-green-600"/>;
      case 'In Progress': return <Clock className="w-5 h-5 text-amber-500"/>;
      default: return <Circle className="w-5 h-5 text-stone-400"/>;
    }
  };

  const filtered = tasks.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return (`${t.title} ${t.description || ''}`).toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <Card className="h-full border-stone-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-serif flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-teal-700"/> My Tasks
        </CardTitle>
        <CardDescription>Tasks assigned to you by the administrators.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-3 mb-4 items-stretch md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-500" />
            <Input placeholder="Search tasks..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="To Do">To Do</TabsTrigger>
              <TabsTrigger value="In Progress">Doing</TabsTrigger>
              <TabsTrigger value="Completed">Done</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-10 text-stone-500">Loading tasks...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-stone-500 border-2 border-dashed rounded-lg">No tasks yet.</div>
          ) : (
            filtered.map(task => (
              <div key={task.id} className="flex items-start justify-between p-4 rounded-lg border border-stone-200 bg-white">
                <div className="flex items-start gap-3">
                  <button className="mt-1" title="Toggle status" onClick={() => toggleStatus.mutate(task)}>
                    {getStatusIcon(task.status)}
                  </button>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`font-semibold ${task.status === 'Completed' ? 'line-through text-stone-500' : 'text-stone-900'}`}>{task.title}</h3>
                      <Badge variant="outline" className="text-xs text-stone-700 bg-stone-50 border-stone-200">{task.priority || 'Medium'}</Badge>
                    </div>
                    {task.description && (
                      <p className="text-sm text-stone-600 mt-1">{task.description}</p>
                    )}
                    <div className="flex items-center gap-4 pt-2 text-xs text-stone-400">
                      {task.due_date && (
                        <span className={`${task.status !== 'Completed' && isPast(parseISO(task.due_date)) ? 'text-red-500 font-medium' : ''}`}>
                          Due {format(parseISO(task.due_date), 'MMM d, yyyy')}
                        </span>
                      )}
                      <span>Updated {format(parseISO(task.updated_date || task.created_date), 'MMM d, h:mm a')}</span>
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  <Button size="sm" variant="outline" onClick={() => toggleStatus.mutate(task)}>
                    {task.status === 'Completed' ? 'Mark To Do' : 'Mark Complete'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}