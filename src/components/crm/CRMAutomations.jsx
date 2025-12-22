import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Play, Save, Trash2 } from "lucide-react";

export default function CRMAutomations() {
  const qc = useQueryClient();

  const { data: rules = [] } = useQuery({
    queryKey: ["crm-rules"],
    queryFn: () => base44.entities.CRMAutomationRule.list("-created_date", 100),
    initialData: []
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["email-templates"],
    queryFn: () => base44.entities.EmailTemplate.list("-created_date", 100),
    initialData: []
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list({ limit: 1000 }),
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CRMAutomationRule.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-rules"] })
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CRMAutomationRule.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-rules"] })
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CRMAutomationRule.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-rules"] })
  });

  const addRule = () => {
    createMutation.mutate({
      name: "New Automation",
      is_active: true,
      trigger_type: "interest_match",
      interest_keywords: ["plots"],
      actions: ["create_task"],
      task_due_in_days: 3
    });
  };

  const runNow = async () => {
    await base44.functions.invoke('runCrmAutomations');
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Automations</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={runNow} className="gap-2"><Play className="w-4 h-4" /> Run Now</Button>
          <Button onClick={addRule} className="gap-2"><Plus className="w-4 h-4" /> New Rule</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rules.length === 0 ? (
          <div className="text-sm text-stone-500">No automations yet. Click New Rule to create one.</div>
        ) : (
          rules.map((r) => (
            <div key={r.id} className="border rounded-lg p-3 space-y-3 bg-white">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Switch checked={r.is_active} onCheckedChange={(v) => updateMutation.mutate({ id: r.id, data: { is_active: v } })} />
                  <Input value={r.name || ''} onChange={(e) => updateMutation.mutate({ id: r.id, data: { name: e.target.value } })} className="w-64" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="gap-2" onClick={() => updateMutation.mutate({ id: r.id, data: r })}><Save className="w-4 h-4"/> Save</Button>
                  <Button variant="outline" className="gap-2 text-red-600 border-red-200 hover:bg-red-50" onClick={() => deleteMutation.mutate(r.id)}><Trash2 className="w-4 h-4"/> Delete</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-xs text-stone-500">Trigger Type</label>
                  <Select value={r.trigger_type} onValueChange={(v) => updateMutation.mutate({ id: r.id, data: { trigger_type: v } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interest_match">Interest match</SelectItem>
                      <SelectItem value="inactivity">Inactivity</SelectItem>
                    </SelectContent>
                  </Select>

                  {r.trigger_type === 'interest_match' ? (
                    <div>
                      <label className="text-xs text-stone-500">Interest Keywords (comma separated)</label>
                      <Input value={(r.interest_keywords || []).join(', ')} onChange={(e) => updateMutation.mutate({ id: r.id, data: { interest_keywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } })} />
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-stone-500">Inactivity Days</label>
                      <Input type="number" value={r.inactivity_days || 30} onChange={(e) => updateMutation.mutate({ id: r.id, data: { inactivity_days: Number(e.target.value) } })} />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-stone-500">Actions</label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Checkbox id={`task-${r.id}`} checked={(r.actions || []).includes('create_task')} onCheckedChange={(v) => {
                        const set = new Set(r.actions || []);
                        v ? set.add('create_task') : set.delete('create_task');
                        updateMutation.mutate({ id: r.id, data: { actions: Array.from(set) } });
                      }} />
                      <label htmlFor={`task-${r.id}`} className="text-sm">Create Task</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id={`email-${r.id}`} checked={(r.actions || []).includes('send_email')} onCheckedChange={(v) => {
                        const set = new Set(r.actions || []);
                        v ? set.add('send_email') : set.delete('send_email');
                        updateMutation.mutate({ id: r.id, data: { actions: Array.from(set) } });
                      }} />
                      <label htmlFor={`email-${r.id}`} className="text-sm">Send Email</label>
                    </div>
                  </div>

                  {(r.actions || []).includes('create_task') && (
                    <div className="space-y-2 mt-2">
                      <label className="text-xs text-stone-500">Task Assignee</label>
                      <Select value={r.task_assignee_id || ''} onValueChange={(v) => updateMutation.mutate({ id: r.id, data: { task_assignee_id: v } })}>
                        <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>Unassigned</SelectItem>
                          {employees.map((e) => (
                            <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <label className="text-xs text-stone-500">Task Due (days)</label>
                      <Input type="number" value={r.task_due_in_days || 3} onChange={(e) => updateMutation.mutate({ id: r.id, data: { task_due_in_days: Number(e.target.value) } })} />

                      <label className="text-xs text-stone-500">Task Title Template</label>
                      <Input value={r.task_title_template || ''} onChange={(e) => updateMutation.mutate({ id: r.id, data: { task_title_template: e.target.value } })} />

                      <label className="text-xs text-stone-500">Task Description Template</label>
                      <Input value={r.task_description_template || ''} onChange={(e) => updateMutation.mutate({ id: r.id, data: { task_description_template: e.target.value } })} />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {(r.actions || []).includes('send_email') && (
                    <>
                      <label className="text-xs text-stone-500">Email Template</label>
                      <Select value={r.email_template_id || ''} onValueChange={(v) => updateMutation.mutate({ id: r.id, data: { email_template_id: v } })}>
                        <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>None</SelectItem>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name || t.key || t.id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <label className="text-xs text-stone-500">Subject Override</label>
                      <Input value={r.email_subject_template || ''} onChange={(e) => updateMutation.mutate({ id: r.id, data: { email_subject_template: e.target.value } })} />

                      <label className="text-xs text-stone-500">Recipient</label>
                      <Select value={r.email_recipient || 'primary'} onValueChange={(v) => updateMutation.mutate({ id: r.id, data: { email_recipient: v } })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="primary">Primary Email</SelectItem>
                          <SelectItem value="secondary">Secondary Email</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}