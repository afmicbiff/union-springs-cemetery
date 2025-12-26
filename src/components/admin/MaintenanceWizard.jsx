import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";

export default function MaintenanceWizard({ open, onOpenChange, initialEntity = "Plot", initialPlotId = "" }) {
  const [step, setStep] = React.useState(1);
  const [entity, setEntity] = React.useState(initialEntity);
  const [plotId, setPlotId] = React.useState(initialPlotId);
  const [form, setForm] = React.useState({ title: "", category: "other", description: "", scheduled_date: "", assignee_id: "" });
  const queryClient = useQueryClient();

  React.useEffect(() => { if (!open) { setStep(1); setEntity(initialEntity); setPlotId(initialPlotId); setForm({ title: "", category: "other", description: "", scheduled_date: "", assignee_id: "" }); } }, [open]);

  const createMut = useMutation({
    mutationFn: async () => {
      return base44.entities.PlotMaintenance.create({
        plot_entity: entity,
        plot_ref_id: plotId,
        title: form.title,
        category: form.category,
        description: form.description,
        status: "open",
        scheduled_date: form.scheduled_date || null,
        assignee_id: form.assignee_id || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plot-maintenance", entity, plotId] });
      onOpenChange(false);
    }
  });

  const canNext = () => entity && plotId;
  const canSubmit = () => form.title;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Maintenance Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span className={`px-2 py-0.5 rounded ${step===1? 'bg-teal-600 text-white':'bg-stone-100'}`}>1. Select Plot</span>
            <span>→</span>
            <span className={`px-2 py-0.5 rounded ${step===2? 'bg-teal-600 text-white':'bg-stone-100'}`}>2. Details</span>
          </div>

          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-stone-600 mb-1">Entity</div>
                <Select value={entity} onValueChange={setEntity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Plot">Old Plots & Map (Plot)</SelectItem>
                    <SelectItem value="NewPlot">New Reservation Plots (NewPlot)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-xs text-stone-600 mb-1">Plot ID</div>
                <Input value={plotId} onChange={(e)=>setPlotId(e.target.value)} placeholder="e.g. 8f9c..." />
                <div className="text-[11px] text-stone-400 mt-1">Paste an ID from the table or plot details.</div>
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button onClick={()=>setStep(2)} disabled={!canNext()} className="gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-stone-600 mb-1">Title</div>
                  <Input value={form.title} onChange={(e)=>setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <div className="text-xs text-stone-600 mb-1">Category</div>
                  <Select value={form.category} onValueChange={(v)=>setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['mowing','trimming','cleaning','repair','inspection','other'].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-xs text-stone-600 mb-1">Scheduled Date</div>
                  <Input type="date" value={form.scheduled_date} onChange={(e)=>setForm({ ...form, scheduled_date: e.target.value })} />
                </div>
                <div>
                  <div className="text-xs text-stone-600 mb-1">Assignee ID (optional)</div>
                  <Input value={form.assignee_id} onChange={(e)=>setForm({ ...form, assignee_id: e.target.value })} />
                </div>
              </div>
              <div>
                <div className="text-xs text-stone-600 mb-1">Description</div>
                <Textarea value={form.description} onChange={(e)=>setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={()=>setStep(1)} className="gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button>
                <Button onClick={()=>createMut.mutate()} disabled={!canSubmit() || createMut.isPending} className="gap-2">
                  {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Request'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}