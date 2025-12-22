import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ClipboardList } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";


export default function NewReservationDialog({ open, onOpenChange, plot, onCreated }) {
  const [form, setForm] = React.useState({
            request_for: "self",
            family_member_name: "",
            requester_name: "",
            requester_email: "",
            contact_by_phone: false,
            requester_phone: "",
            requester_phone_secondary: "",
            notes: ""
          });
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    if (form.request_for === 'family_member' && !String(form.family_member_name || '').trim()) {
            alert("Please enter the family member's name.");
            setSubmitting(false);
            return;
          }
          if (form.contact_by_phone && !String(form.requester_phone || '').trim()) {
            alert("Please enter your phone number to be contacted by an administrator.");
            setSubmitting(false);
            return;
          }
          try {
      const today = new Date().toISOString().split('T')[0];
      const EXPIRY_DAYS = 7;
      const expiryDateObj = new Date();
      expiryDateObj.setDate(expiryDateObj.getDate() + EXPIRY_DAYS);
      const expiryDate = expiryDateObj.toISOString().split('T')[0];
      const newReservation = await base44.entities.NewPlotReservation.create({
        new_plot_id: plot.id,
        request_for: form.request_for,
        family_member_name: form.request_for === 'family_member' ? form.family_member_name : '',
        requester_name: form.requester_name,
        requester_email: form.requester_email,
        requester_phone: form.requester_phone || '',
        requester_phone_secondary: form.requester_phone_secondary || '',
        status: "Pending Review",
        requested_date: today,
        notes: form.notes || ""
      });

      // Put plot on temporary hold
      await base44.entities.NewPlot.update(plot.id, { status: "Pending Reservation", reservation_expiry_date: expiryDate });

      // Notify admins
      await base44.entities.Notification.create({
        message: `New reservation request for plot ${plot.plot_number || ''} (Section ${plot.section || ''}) by ${form.requester_name}.`,
        type: "alert",
        is_read: false,
        user_email: null,
        related_entity_id: newReservation.id,
        related_entity_type: "NewPlotReservation",
        link: createPageUrl('NewPlotDetails') + `?id=${plot.id}`
      });

      // Send acknowledgment via SendGrid backend
      await base44.functions.invoke('sendReservationAcknowledgment', { reservationId: newReservation.id });



      onCreated && onCreated();
      setForm({ request_for: "self", family_member_name: "", requester_name: "", requester_email: "", contact_by_phone: false, requester_phone: "", requester_phone_secondary: "", notes: "" });
      window.alert("Your reservation request has been submitted for review.");
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[90vw] sm:w-[520px] p-0">
        <motion.div
          className="max-w-md w-[90vw] sm:w-[520px] resize overflow-y-auto pr-2 p-4 sm:p-6"
          drag
          dragMomentum={false}
          style={{ maxHeight: '80vh' }}
        >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 cursor-move">
            <ClipboardList className="w-4 h-4" /> Request Reservation
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">Who is this for?</label>
            <select
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
              value={form.request_for}
              onChange={(e)=>setForm({...form, request_for: e.target.value})}
            >
              <option value="self">Myself</option>
              <option value="family_member">Another family member</option>
            </select>
          </div>
          {form.request_for === 'family_member' && (
            <div>
              <label className="text-xs text-gray-500">Family Member Name</label>
              <Input value={form.family_member_name} onChange={(e)=>setForm({...form, family_member_name: e.target.value})} required />
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500">Your Name</label>
            <Input value={form.requester_name} onChange={(e)=>setForm({...form, requester_name: e.target.value})} required />
          </div>
          <div>
            <label className="text-xs text-gray-500">Your Email</label>
            <Input type="email" value={form.requester_email} onChange={(e)=>setForm({...form, requester_email: e.target.value})} />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <input
              id="contact_by_phone"
              type="checkbox"
              checked={form.contact_by_phone}
              onChange={(e)=>setForm({...form, contact_by_phone: e.target.checked})}
            />
            <label htmlFor="contact_by_phone" className="text-sm text-gray-700">Request administrator to contact me by phone</label>
          </div>
          {form.contact_by_phone && (
            <>
              <div>
                <label className="text-xs text-gray-500">Phone Number</label>
                <Input type="tel" value={form.requester_phone} onChange={(e)=>setForm({...form, requester_phone: e.target.value})} required />
              </div>
              <div>
                <label className="text-xs text-gray-500">Second Phone (optional)</label>
                <Input type="tel" value={form.requester_phone_secondary} onChange={(e)=>setForm({...form, requester_phone_secondary: e.target.value})} />
              </div>
            </>
          )}
          <div>
            <label className="text-xs text-gray-500">Notes</label>
            <Textarea rows={3} value={form.notes} onChange={(e)=>setForm({...form, notes: e.target.value})} />
          </div>
          <div className="pt-2 space-y-2">
            <div className="text-xs text-gray-700 bg-amber-50 border border-amber-200 rounded-md p-2">
              Note: You can hold a plot for up to seven days. After seven days, the plot goes back to Available.
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={()=>onOpenChange(false)}>Cancel</Button>
              <Button type="submit" className="bg-teal-700 hover:bg-teal-800 text-white" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create Request
              </Button>
            </div>
          </div>
        </form>
      </motion.div>
      </DialogContent>
    </Dialog>
  );
}