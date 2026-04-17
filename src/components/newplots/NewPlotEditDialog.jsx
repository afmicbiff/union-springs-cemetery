import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const EMPTY = { status: "Available", first_name: "", last_name: "", family_name: "", birth_date: "", death_date: "", notes: "" };

export default function NewPlotEditDialog({ open, onOpenChange, plot, position }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (plot) {
      setForm({
        status: plot.status || "Available",
        first_name: plot.first_name || "",
        last_name: plot.last_name || "",
        family_name: plot.family_name || "",
        birth_date: plot.birth_date || "",
        death_date: plot.death_date || "",
        notes: plot.notes || "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [plot, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (plot?.id) {
        return base44.entities.NewPlotSimple.update(plot.id, form);
      }
      return base44.entities.NewPlotSimple.create({ ...form, position });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["new-plots-simple"] });
      toast.success(`Plot ${position} saved`);
      onOpenChange(false);
    },
    onError: (err) => toast.error("Save failed: " + err.message),
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Plot #{position}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="Reserved">Reserved</SelectItem>
                <SelectItem value="Occupied">Occupied</SelectItem>
                <SelectItem value="Unavailable">Unavailable</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>First Name</Label>
              <Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Family Name</Label>
            <Input value={form.family_name} onChange={(e) => set("family_name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Birth Date</Label>
              <Input value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} placeholder="MM/DD/YYYY" />
            </div>
            <div>
              <Label>Death Date</Label>
              <Input value={form.death_date} onChange={(e) => set("death_date", e.target.value)} placeholder="MM/DD/YYYY" />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-teal-700 hover:bg-teal-800">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}