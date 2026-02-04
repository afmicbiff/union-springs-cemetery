import React, { useState, useCallback, memo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const InteractionDialog = memo(function InteractionDialog({ member, onClose, onSaved }) {
  const [type, setType] = useState("call");
  const [note, setNote] = useState("");

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
          <SelectTrigger className="h-9"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="call">Call</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="meeting">Meeting</SelectItem>
            <SelectItem value="note">Note</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs block mb-1">Notes</label>
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened?" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={() => mutation.mutate()} disabled={!note.trim()} className="bg-teal-700 hover:bg-teal-800 text-white">Save</Button>
      </div>
    </div>
  );
});

export default InteractionDialog;