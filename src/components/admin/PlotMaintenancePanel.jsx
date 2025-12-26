import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2 } from "lucide-react";

const statusColor = (s) => ({
  open: "bg-amber-100 text-amber-800",
  scheduled: "bg-blue-100 text-blue-800",
  in_progress: "bg-indigo-100 text-indigo-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-stone-100 text-stone-700",
}[s] || "bg-stone-100 text-stone-700");

export default function PlotMaintenancePanel({ plot, entity = "Plot" }) {
  const queryClient = useQueryClient();
  const plotId = plot?.id;

  const { data: items, isLoading } = useQuery({
    queryKey: ["plot-maintenance", entity, plotId],
    enabled: !!plotId,
    queryFn: async () => base44.entities.PlotMaintenance.filter({ plot_entity: entity, plot_ref_id: plotId }, "-created_date", 100),
    initialData: [],
  });

  const [form, setForm] = React.useState({
    title: "",
    category: "other",
    description: "",
    status: "open",
    scheduled_date: "",
    assignee_id: "",
  });

  const createMut = useMutation({
    mutationFn: async () => {
      return base44.entities.PlotMaintenance.create({
        plot_entity: entity,
        plot_ref_id: plotId,
        title: form.title,
        category: form.category,
        description: form.description,
        status: form.status,
        scheduled_date: form.scheduled_date || null,
        assignee_id: form.assignee_id || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plot-maintenance", entity, plotId] });
      setForm({ title: "", category: "other", description: "", status: "open", scheduled_date: "", assignee_id: "" });
    },
  });

  const updateStatusMut = useMutation({
    mutationFn: async ({ id, status }) => base44.entities.PlotMaintenance.update(id, {
      status,
      completed_date: status === "completed" ? new Date().toISOString().slice(0,10) : null,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plot-maintenance", "Plot", plotId] })
  });

  return (
    <div className="space-y-4">
      <Card className="border-stone-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <Input placeholder="Title" value={form.title} onChange={(e)=>setForm({ ...form, title: e.target.value })} className="md:col-span-2" />
            <Select value={form.category} onValueChange={(v)=>setForm({ ...form, category: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {['mowing','trimming','cleaning','repair','inspection','other'].map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={form.status} onValueChange={(v)=>setForm({ ...form, status: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {['open','scheduled','in_progress','completed','cancelled'].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={form.scheduled_date} onChange={(e)=>setForm({ ...form, scheduled_date: e.target.value })} />
            <Input placeholder="Assignee ID (optional)" value={form.assignee_id} onChange={(e)=>setForm({ ...form, assignee_id: e.target.value })} />
            <Button className="bg-teal-700 hover:bg-teal-800" onClick={()=>createMut.mutate()} disabled={!form.title || createMut.isPending}>
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
            </Button>
            <div className="md:col-span-6">
              <Textarea placeholder="Description" value={form.description} onChange={(e)=>setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {isLoading ? (
          <div className="text-sm text-stone-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-stone-500">No maintenance logged for this plot yet.</div>
        ) : (
          items.map((m) => (
            <div key={m.id} className="border rounded-md p-3 flex justify-between items-start gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{m.title}</span>
                  <Badge className={statusColor(m.status)}>{m.status}</Badge>
                </div>
                <div className="text-xs text-stone-500 mt-0.5">{m.category} {m.scheduled_date ? `• Scheduled ${m.scheduled_date}` : ''} {m.completed_date ? `• Completed ${m.completed_date}` : ''}</div>
                {m.description && <div className="text-sm text-stone-700 mt-1 whitespace-pre-wrap">{m.description}</div>}
              </div>
              <div className="flex items-center gap-2">
                {m.status !== 'completed' && (
                  <Button size="sm" variant="outline" onClick={()=>updateStatusMut.mutate({ id: m.id, status: 'completed' })}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Mark done
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}