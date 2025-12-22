import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Check, Edit, Trash2, AlertTriangle, Loader2, Calendar as CalIcon } from "lucide-react";
import LawnCareForm from "./lawncare/LawnCareForm";

function formatDate(d) {
  if (!d) return "";
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function computeNextDue(baseDate, frequency) {
  const map = { daily: 1, weekly: 7, "bi-weekly": 14, monthly: 30, quarterly: 90 };
  const days = map[frequency];
  if (!days) return null; // on-demand
  return formatDate(addDays(baseDate, days));
}

export default function LawnCare() {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list({ limit: 1000 }),
    initialData: [],
  });

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["lawncare-schedules"],
    queryFn: () => base44.entities.LawnCareSchedule.list("-created_date", 500),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LawnCareSchedule.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lawncare-schedules"] }); setOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LawnCareSchedule.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lawncare-schedules"] }); setOpen(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LawnCareSchedule.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lawncare-schedules"] }),
  });

  const markCompleted = (row) => {
    const today = new Date();
    const next = computeNextDue(today, row.frequency);
    const data = {
      last_completed_date: formatDate(today),
      next_due_date: next,
      status: next ? "scheduled" : "completed",
    };
    updateMutation.mutate({ id: row.id, data });
  };

  const filtered = (schedules || []).filter((s) => {
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    const matchesSearch = !search || (s.area || "").toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const today = new Date();
  const overdueCount = (schedules || []).filter((s) => s.next_due_date && new Date(s.next_due_date) < today && s.status !== 'completed').length;
  const dueSoonCount = (schedules || []).filter((s) => s.next_due_date && new Date(s.next_due_date) >= today && (new Date(s.next_due_date) - today) / (1000*60*60*24) <= 7).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-serif font-bold text-stone-900">Lawn Care</h2>
          <p className="text-stone-600">Schedule and track grounds maintenance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="destructive">{overdueCount} Overdue</Badge>
          <Badge variant="outline">{dueSoonCount} Due in 7 days</Badge>
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-teal-700 hover:bg-teal-800 text-white gap-2"><Plus className="w-4 h-4"/> New Schedule</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schedules</CardTitle>
          <CardDescription>Create, edit, and complete lawn care schedules.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="flex-1">
              <Input placeholder="Search by area..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="w-full md:w-56">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-stone-500">
                  <th className="py-2 pr-4">Area</th>
                  <th className="py-2 pr-4">Frequency</th>
                  <th className="py-2 pr-4">Next Due</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Assigned</th>
                  <th className="py-2 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="py-6 text-center text-stone-500"><Loader2 className="inline w-4 h-4 mr-1 animate-spin"/> Loading schedules...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-6 text-center text-stone-500">No schedules found.</td></tr>
                ) : (
                  filtered.map((s) => {
                    const emp = employees.find((e) => e.id === s.assigned_employee_id);
                    const overdue = s.next_due_date && new Date(s.next_due_date) < today && s.status !== 'completed';
                    return (
                      <tr key={s.id} className="border-t">
                        <td className="py-2 pr-4 font-medium text-stone-800">{s.area}</td>
                        <td className="py-2 pr-4">{s.frequency}</td>
                        <td className="py-2 pr-4 flex items-center gap-1">{s.next_due_date ? s.next_due_date : <span className="text-stone-400">—</span>} {overdue && <AlertTriangle className="w-4 h-4 text-red-600"/>}</td>
                        <td className="py-2 pr-4">
                          {overdue ? (
                            <Badge variant="destructive">Overdue</Badge>
                          ) : (
                            <Badge variant="outline">{s.status}</Badge>
                          )}
                        </td>
                        <td className="py-2 pr-4">{emp ? `${emp.first_name} ${emp.last_name}` : '—'}</td>
                        <td className="py-2 pr-0">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="h-8" onClick={() => markCompleted(s)}>
                              <Check className="w-4 h-4 mr-1"/> Complete
                            </Button>
                            <Button size="sm" variant="outline" className="h-8" onClick={() => { setEditing(s); setOpen(true); }}>
                              <Edit className="w-4 h-4 mr-1"/> Edit
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 text-red-600 border-red-200 hover:bg-red-50" onClick={() => deleteMutation.mutate(s.id)}>
                              <Trash2 className="w-4 h-4 mr-1"/> Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Schedule' : 'New Schedule'}</DialogTitle>
          </DialogHeader>
          <LawnCareForm
            initial={editing}
            employees={employees}
            onSave={(data) => {
              if (!data.next_due_date && data.frequency !== 'on-demand') {
                const base = data.start_date ? new Date(data.start_date) : new Date();
                data.next_due_date = computeNextDue(base, data.frequency);
              }
              if (editing) updateMutation.mutate({ id: editing.id, data });
              else createMutation.mutate(data);
            }}
            onCancel={() => { setOpen(false); setEditing(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}