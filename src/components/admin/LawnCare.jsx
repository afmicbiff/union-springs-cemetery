import React, { useState, useCallback, useMemo, lazy, Suspense, memo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Check, Edit, Trash2, AlertTriangle, Loader2, Download } from "lucide-react";

// Lazy load heavy components
const LawnCareForm = lazy(() => import("./lawncare/LawnCareForm"));
const LawnCareStats = lazy(() => import("./lawncare/LawnCareStats"));
const LawnCareHistoryChart = lazy(() => import("./lawncare/LawnCareHistoryChart"));
const Dialog = lazy(() => import("@/components/ui/dialog").then(m => ({ default: m.Dialog })));
const DialogContent = lazy(() => import("@/components/ui/dialog").then(m => ({ default: m.DialogContent })));
const DialogHeader = lazy(() => import("@/components/ui/dialog").then(m => ({ default: m.DialogHeader })));
const DialogTitle = lazy(() => import("@/components/ui/dialog").then(m => ({ default: m.DialogTitle })));

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

// Memoized table row for performance
const ScheduleRow = memo(({ s, emp, overdue, today, markCompleted, setEditing, setOpen, deleteMutation }) => (
  <tr className="border-t">
    <td className="py-2 pr-4 font-medium text-stone-800">{s.area}</td>
    <td className="py-2 pr-4">{s.frequency}</td>
    <td className="py-2 pr-4 flex items-center gap-1">
      {s.next_due_date || <span className="text-stone-400">—</span>}
      {overdue && <AlertTriangle className="w-4 h-4 text-red-600"/>}
    </td>
    <td className="py-2 pr-4">
      {overdue ? <Badge variant="destructive">Overdue</Badge> : <Badge variant="outline">{s.status}</Badge>}
    </td>
    <td className="py-2 pr-4">{emp ? `${emp.first_name} ${emp.last_name}` : '—'}</td>
    <td className="py-2 pr-0">
      <div className="flex justify-end gap-1 sm:gap-2">
        <Button size="sm" variant="outline" className="h-8 px-2 sm:px-3" onClick={() => markCompleted(s)}>
          <Check className="w-4 h-4 sm:mr-1"/><span className="hidden sm:inline">Complete</span>
        </Button>
        <Button size="sm" variant="outline" className="h-8 px-2 sm:px-3" onClick={() => { setEditing(s); setOpen(true); }}>
          <Edit className="w-4 h-4 sm:mr-1"/><span className="hidden sm:inline">Edit</span>
        </Button>
        <Button size="sm" variant="outline" className="h-8 px-2 sm:px-3 text-red-600 border-red-200 hover:bg-red-50" onClick={() => deleteMutation.mutate(s.id)}>
          <Trash2 className="w-4 h-4"/>
        </Button>
      </div>
    </td>
  </tr>
));

export default function LawnCare() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list({ limit: 200 }),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    initialData: [],
  });

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["lawncare-schedules"],
    queryFn: () => base44.entities.LawnCareSchedule.list("-created_date", 100),
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
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

  const markCompleted = useCallback((row) => {
    const today = new Date();
    const next = computeNextDue(today, row.frequency);
    const data = {
      last_completed_date: formatDate(today),
      next_due_date: next,
      status: next ? "scheduled" : "completed",
    };
    updateMutation.mutate({ id: row.id, data });
  }, [updateMutation]);

  const handleExportCsv = () => {
    const headers = [
      "area",
      "frequency",
      "start_date",
      "end_date",
      "last_completed_date",
      "next_due_date",
      "status",
      "assigned_employee_id",
      "assigned_employee_name"
    ];

    const getEmpName = (id) => {
      const e = (employees || []).find((x) => x.id === id);
      return e ? `${e.first_name || ""} ${e.last_name || ""}`.trim() : "";
    };

    const escape = (val) => {
      if (val === null || val === undefined) return "";
      const s = String(val).replace(/"/g, '""');
      return `"${s}` + `"`;
    };

    const rows = (schedules || []).map((s) => [
      s.area || "",
      s.frequency || "",
      s.start_date || "",
      s.end_date || "",
      s.last_completed_date || "",
      s.next_due_date || "",
      s.status || "",
      s.assigned_employee_id || "",
      getEmpName(s.assigned_employee_id)
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lawncare_export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const today = useMemo(() => new Date(), []);
  
  const { filtered, overdueCount, dueSoonCount } = useMemo(() => {
    const searchLower = search.toLowerCase();
    const fil = (schedules || []).filter((s) => {
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      const matchesSearch = !search || (s.area || "").toLowerCase().includes(searchLower);
      return matchesStatus && matchesSearch;
    });
    const overdue = (schedules || []).filter((s) => s.next_due_date && new Date(s.next_due_date) < today && s.status !== 'completed').length;
    const dueSoon = (schedules || []).filter((s) => s.next_due_date && new Date(s.next_due_date) >= today && (new Date(s.next_due_date) - today) / (1000*60*60*24) <= 7).length;
    return { filtered: fil, overdueCount: overdue, dueSoonCount: dueSoon };
  }, [schedules, statusFilter, search, today]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">Lawn Care</h2>
          <p className="text-sm text-stone-600">Schedule and track grounds maintenance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="destructive" className="text-xs">{overdueCount} Overdue</Badge>
          <Badge variant="outline" className="text-xs">{dueSoonCount} Due Soon</Badge>
          <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1 h-8"><Download className="w-3.5 h-3.5"/><span className="hidden sm:inline">Export</span></Button>
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }} className="bg-teal-700 hover:bg-teal-800 text-white gap-1 h-8"><Plus className="w-3.5 h-3.5"/><span className="hidden sm:inline">New</span></Button>
        </div>
      </div>

      <Suspense fallback={<div className="h-32 bg-gray-50 rounded animate-pulse" />}>
        <LawnCareStats schedules={schedules} />
      </Suspense>

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
                  <tr><td colSpan={6} className="py-6 text-center text-stone-500"><Loader2 className="inline w-4 h-4 mr-1 animate-spin"/> Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-6 text-center text-stone-500">No schedules found.</td></tr>
                ) : (
                  filtered.slice(0, 50).map((s) => {
                    const emp = employees.find((e) => e.id === s.assigned_employee_id);
                    const overdue = s.next_due_date && new Date(s.next_due_date) < today && s.status !== 'completed';
                    return (
                      <ScheduleRow
                        key={s.id}
                        s={s}
                        emp={emp}
                        overdue={overdue}
                        today={today}
                        markCompleted={markCompleted}
                        setEditing={setEditing}
                        setOpen={setOpen}
                        deleteMutation={deleteMutation}
                      />
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Lazy load chart - hidden on mobile for performance */}
      <div className="hidden sm:block">
        <Suspense fallback={<div className="h-72 bg-gray-50 rounded animate-pulse" />}>
          <LawnCareHistoryChart schedules={schedules} />
        </Suspense>
      </div>

      {/* Dialog only rendered when open */}
      {open && (
        <Suspense fallback={null}>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit Schedule' : 'New Schedule'}</DialogTitle>
              </DialogHeader>
              <Suspense fallback={<div className="h-48 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
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
              </Suspense>
            </DialogContent>
          </Dialog>
        </Suspense>
      )}
    </div>
  );
}