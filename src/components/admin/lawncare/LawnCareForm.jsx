import React, { useState, useCallback, memo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LawnCareForm = memo(function LawnCareForm({ initial, employees = [], onSave, onCancel }) {
  const [form, setForm] = useState(() => ({
    area: initial?.area || "",
    frequency: initial?.frequency || "weekly",
    start_date: initial?.start_date || new Date().toISOString().slice(0, 10),
    end_date: initial?.end_date || "",
    next_due_date: initial?.next_due_date || "",
    assigned_employee_id: initial?.assigned_employee_id || "",
    status: initial?.status || "scheduled",
    notes: initial?.notes || "",
  }));

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    onSave({ ...form });
  }, [form, onSave]);

  const handleChange = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <Label className="text-xs">Area</Label>
          <Input value={form.area} onChange={(e) => handleChange('area', e.target.value)} placeholder="e.g., Section A" required />
        </div>
        <div>
          <Label className="text-xs">Frequency</Label>
          <Select value={form.frequency} onValueChange={(v) => handleChange('frequency', v)}>
            <SelectTrigger><SelectValue placeholder="Frequency" /></SelectTrigger>
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
          <Input type="date" value={form.start_date} onChange={(e) => handleChange('start_date', e.target.value)} required />
        </div>
        <div>
          <Label className="text-xs">Next Due</Label>
          <Input type="date" value={form.next_due_date || ""} onChange={(e) => handleChange('next_due_date', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Assigned</Label>
          <Select value={form.assigned_employee_id || ""} onValueChange={(v) => handleChange('assigned_employee_id', v)}>
            <SelectTrigger><SelectValue placeholder="Employee" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Unassigned</SelectItem>
              {employees.slice(0, 50).map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={form.status} onValueChange={(v) => handleChange('status', v)}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
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
        <Textarea rows={3} value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Instructions..." />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" className="bg-teal-700 hover:bg-teal-800 text-white">Save</Button>
      </div>
    </form>
  );
});

export default LawnCareForm;