import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, User, FileText, Calendar } from "lucide-react";

const STATUSES = ["Available", "Pending Reservation", "Reserved", "Occupied", "Veteran", "Unavailable", "Unknown", "Not Usable"];

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 pb-2 mb-3 border-b border-gray-100">
      <Icon className="w-4 h-4 text-teal-600" />
      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">{title}</h3>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  );
}

export default function PlotEditForm({ form, setForm }) {
  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="space-y-6">
      {/* Location & Status */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <SectionHeader icon={MapPin} title="Location & Status" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Section"><Input value={form.section} onChange={set("section")} /></Field>
          <Field label="Row"><Input value={form.row_number} onChange={set("row_number")} /></Field>
          <Field label="Plot #"><Input value={form.plot_number} onChange={set("plot_number")} /></Field>
        </div>
        <div className="mt-4">
          <Field label="Status">
            <Select value={form.status || ""} onValueChange={(v) => setForm(prev => ({ ...prev, status: v }))}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>

      {/* Occupant */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <SectionHeader icon={User} title="Occupant / Owner" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="First Name"><Input value={form.first_name} onChange={set("first_name")} /></Field>
          <Field label="Last Name"><Input value={form.last_name} onChange={set("last_name")} /></Field>
        </div>
        <div className="mt-4">
          <Field label="Family Name"><Input value={form.family_name} onChange={set("family_name")} /></Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Field label="Birth Date"><Input value={form.birth_date} onChange={set("birth_date")} placeholder="MM/DD/YYYY or YYYY-MM-DD" /></Field>
          <Field label="Death Date"><Input value={form.death_date} onChange={set("death_date")} placeholder="MM/DD/YYYY or YYYY-MM-DD" /></Field>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <SectionHeader icon={FileText} title="Notes" />
        <Textarea rows={4} value={form.notes} onChange={set("notes")} placeholder="Additional notes about this plot..." />
      </div>

      {/* Admin Reservation */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <SectionHeader icon={Calendar} title="Reservation Admin" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Reservation Expiry"><Input value={form.reservation_expiry_date} onChange={set("reservation_expiry_date")} placeholder="YYYY-MM-DD" /></Field>
          <Field label="Responsible Admin Email"><Input value={form.assigned_admin_email || ''} onChange={set("assigned_admin_email")} placeholder="admin@example.com" /></Field>
        </div>
      </div>
    </div>
  );
}