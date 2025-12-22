import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function LawnCareForm({ initial, employees = [], onSave, onCancel }) {
  const [form, setForm] = React.useState(() => ({
    area: initial?.area || "",
    frequency: initial?.frequency || "weekly",
    start_date: initial?.start_date || new Date().toISOString().slice(0, 10),
    end_date: initial?.end_date || "",
    next_due_date: initial?.next_due_date || "",
    assigned_employee_id: initial?.assigned_employee_id || "",
    status: initial?.status || "scheduled",
    notes: initial?.notes || "",
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Area</Label>
          <Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="e.g., Section A, Historic Row" required />
        </div>
        <div>
          <Label className="text-xs">Frequency</Label>
          <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="on-demand">On-demand</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Start Date</Label>
          <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
        </div>
        <div>
          <Label className="text-xs">Next Due Date</Label>
          <Input type="date" value={form.next_due_date || ""} onChange={(e) => setForm({ ...form, next_due_date: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Assigned Employee</Label>
          <Select value={form.assigned_employee_id || ""} onValueChange={(v) => setForm({ ...form, assigned_employee_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Unassigned</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs">Notes</Label>
        <Textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Instructions, materials, constraints, etc." />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-teal-700 hover:bg-teal-800 text-white">Save</Button>
      </div>
    </form>
  );
}