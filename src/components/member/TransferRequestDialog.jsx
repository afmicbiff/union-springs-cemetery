import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function TransferRequestDialog({ open, onOpenChange, reservation, user }) {
  const [form, setForm] = React.useState({ new_owner_name: "", new_owner_email: "", phone: "", note: "" });
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async () => {
    if (!form.new_owner_name || !form.new_owner_email) {
      toast.error("Please provide the new owner's name and email.");
      return;
    }
    setSubmitting(true);
    try {
      const subject = `Plot Transfer Request - ${reservation?.new_plot_id || reservation?.id}`;
      const details = [
        `From: ${user?.full_name} <${user?.email}>`,
        `Reservation ID: ${reservation?.id}`,
        `Plot ID: ${reservation?.new_plot_id || '-'}`,
        `New Owner: ${form.new_owner_name} <${form.new_owner_email}>` + (form.phone ? `, Phone: ${form.phone}` : ""),
        form.note ? `Notes: ${form.note}` : "",
      ].filter(Boolean).join("\n");

      await base44.entities.Message.create({
        sender_email: user.email,
        recipient_email: "ADMIN",
        subject,
        body: details,
        type: "inquiry",
      });

      toast.success("Transfer request sent to administration.");
      onOpenChange(false);
      setForm({ new_owner_name: "", new_owner_email: "", phone: "", note: "" });
    } catch (e) {
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>Request Plot Transfer</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-gray-600">Reservation: {reservation?.id} • Plot: {reservation?.new_plot_id || '-'}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>New Owner Full Name</Label>
              <Input value={form.new_owner_name} onChange={(e)=>setForm({...form, new_owner_name: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>New Owner Email</Label>
              <Input type="email" value={form.new_owner_email} onChange={(e)=>setForm({...form, new_owner_email: e.target.value})} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Phone (optional)</Label>
              <Input value={form.phone} onChange={(e)=>setForm({...form, phone: e.target.value})} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Notes (optional)</Label>
              <Textarea value={form.note} onChange={(e)=>setForm({...form, note: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={submitting} className="bg-teal-700 hover:bg-teal-800">{submitting ? 'Sending…' : 'Send Request'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}