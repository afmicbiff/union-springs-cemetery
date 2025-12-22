import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function InteractionDialog({ member, onClose, onSaved }) {
  const [type, setType] = React.useState("call");
  const [note, setNote] = React.useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      const log = {
        timestamp: new Date().toISOString(),
        type,
        note,
        logged_by: user?.email || "system"
      };
      const logs = Array.isArray(member.contact_logs) ? [...member.contact_logs, log] : [log];
      const data = { contact_logs: logs, last_contact_date: new Date().toISOString().slice(0,10) };
      return base44.entities.Member.update(member.id, data);
    },
    onSuccess: () => { onSaved?.(); onClose?.(); },
  });

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs block mb-1">Type</label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="call">Call</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="meeting">Meeting</SelectItem>
            <SelectItem value="note">Note</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs block mb-1">Notes</label>
        <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened?" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => mutation.mutate()} disabled={!note.trim()} className="bg-teal-700 hover:bg-teal-800 text-white">Save</Button>
      </div>
    </div>
  );
}