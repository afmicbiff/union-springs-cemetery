import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ClipboardList } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function NewReservationDialog({ open, onOpenChange, plot, onCreated }) {
  const [form, setForm] = React.useState({
    requester_name: "",
    requester_email: "",
    donation_amount: "",
    notes: ""
  });
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await base44.entities.NewPlotReservation.create({
        new_plot_id: plot.id,
        requester_name: form.requester_name,
        requester_email: form.requester_email,
        donation_amount: form.donation_amount ? Number(form.donation_amount) : 0,
        status: "Pending",
        requested_date: today,
        notes: form.notes || ""
      });
      onCreated && onCreated();
      setForm({ requester_name: "", requester_email: "", donation_amount: "", notes: "" });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" /> Start Reservation
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">Requester Name</label>
            <Input value={form.requester_name} onChange={(e)=>setForm({...form, requester_name: e.target.value})} required />
          </div>
          <div>
            <label className="text-xs text-gray-500">Requester Email</label>
            <Input type="email" value={form.requester_email} onChange={(e)=>setForm({...form, requester_email: e.target.value})} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Donation Amount</label>
            <Input type="number" step="0.01" value={form.donation_amount} onChange={(e)=>setForm({...form, donation_amount: e.target.value})} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Notes</label>
            <Textarea rows={3} value={form.notes} onChange={(e)=>setForm({...form, notes: e.target.value})} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={()=>onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-teal-700 hover:bg-teal-800 text-white" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}