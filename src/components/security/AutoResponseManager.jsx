import React, { memo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Loader2, Plus, Pencil, Trash2, Zap, Shield, Mail, Monitor,
  Bug, AlertTriangle, Clock, History, Play, ChevronDown, ChevronUp
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const SEVERITY_OPTIONS = ['info', 'low', 'medium', 'high', 'critical'];

const SEV_BADGE = {
  info: 'bg-slate-100 text-slate-700',
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};

// Rule Card
const RuleCard = memo(function RuleCard({ rule, onEdit, onDelete, onToggle }) {
  const [showDetails, setShowDetails] = useState(false);
  const actions = rule.actions || {};
  const cond = rule.trigger_conditions || {};

  const actionCount = [
    actions.block_ip?.enabled,
    actions.isolate_endpoint?.enabled,
    actions.trigger_vuln_scan?.enabled,
    actions.notify_email?.enabled,
    actions.create_in_app_alert?.enabled !== false,
    actions.escalate_severity?.enabled
  ].filter(Boolean).length;

  return (
    <div className={`p-3 border rounded-lg ${rule.enabled ? 'bg-white' : 'bg-stone-50 opacity-75'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${rule.enabled ? 'text-amber-500' : 'text-stone-400'}`} />
            <span className="font-medium text-sm truncate">{rule.name}</span>
            <Switch
              checked={rule.enabled}
              onCheckedChange={() => onToggle(rule)}
              className="scale-75"
            />
          </div>
          {rule.description && (
            <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{rule.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => onEdit(rule)} className="h-7 w-7">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(rule)} className="h-7 w-7 text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2">
        {cond.severity?.map(s => (
          <Badge key={s} className={`${SEV_BADGE[s]} text-[9px]`}>{s}</Badge>
        ))}
        {cond.threat_intel_match && <Badge className="bg-red-100 text-red-700 text-[9px]">Threat Intel</Badge>}
        {cond.endpoint_posture?.map(p => (
          <Badge key={p} className="bg-purple-100 text-purple-700 text-[9px]">{p}</Badge>
        ))}
        {cond.event_count_threshold && (
          <Badge className="bg-blue-100 text-blue-700 text-[9px]">
            ≥{cond.event_count_threshold} events
          </Badge>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDetails(!showDetails)}
        className="h-6 text-[10px] mt-2 gap-1 p-0"
      >
        {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {actionCount} action{actionCount !== 1 ? 's' : ''} • Triggered {rule.trigger_count || 0}x
      </Button>

      {showDetails && (
        <div className="mt-2 pt-2 border-t text-[10px] space-y-1">
          {actions.block_ip?.enabled && (
            <div className="flex items-center gap-1"><Shield className="w-3 h-3 text-red-500" /> Block IP ({actions.block_ip.duration_minutes || 60} min)</div>
          )}
          {actions.isolate_endpoint?.enabled && (
            <div className="flex items-center gap-1"><Monitor className="w-3 h-3 text-orange-500" /> Isolate Endpoint</div>
          )}
          {actions.trigger_vuln_scan?.enabled && (
            <div className="flex items-center gap-1"><Bug className="w-3 h-3 text-purple-500" /> Trigger Vuln Scan</div>
          )}
          {actions.notify_email?.enabled && (
            <div className="flex items-center gap-1"><Mail className="w-3 h-3 text-blue-500" /> Email: {actions.notify_email.recipients?.join(', ')}</div>
          )}
          {actions.escalate_severity?.enabled && (
            <div className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-500" /> Escalate to {actions.escalate_severity.to_severity}</div>
          )}
          {rule.last_triggered && (
            <div className="flex items-center gap-1 text-stone-500">
              <Clock className="w-3 h-3" /> Last: {formatDistanceToNow(new Date(rule.last_triggered), { addSuffix: true })}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Rule Editor Dialog
function RuleEditorDialog({ rule, open, onOpenChange, onSave }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    enabled: true,
    trigger_conditions: {
      severity: [],
      event_types: [],
      threat_intel_match: false,
      endpoint_posture: [],
      event_count_threshold: null,
      time_window_minutes: 10
    },
    actions: {
      block_ip: { enabled: false, duration_minutes: 60 },
      isolate_endpoint: { enabled: false },
      trigger_vuln_scan: { enabled: false },
      notify_email: { enabled: false, recipients: [] },
      create_in_app_alert: { enabled: true },
      escalate_severity: { enabled: false, to_severity: 'high' }
    },
    cooldown_minutes: 30
  });
  const [emailInput, setEmailInput] = useState('');

  React.useEffect(() => {
    if (rule) {
      setForm({
        name: rule.name || '',
        description: rule.description || '',
        enabled: rule.enabled !== false,
        trigger_conditions: {
          severity: rule.trigger_conditions?.severity || [],
          event_types: rule.trigger_conditions?.event_types || [],
          threat_intel_match: rule.trigger_conditions?.threat_intel_match || false,
          endpoint_posture: rule.trigger_conditions?.endpoint_posture || [],
          event_count_threshold: rule.trigger_conditions?.event_count_threshold || null,
          time_window_minutes: rule.trigger_conditions?.time_window_minutes || 10
        },
        actions: {
          block_ip: rule.actions?.block_ip || { enabled: false, duration_minutes: 60 },
          isolate_endpoint: rule.actions?.isolate_endpoint || { enabled: false },
          trigger_vuln_scan: rule.actions?.trigger_vuln_scan || { enabled: false },
          notify_email: rule.actions?.notify_email || { enabled: false, recipients: [] },
          create_in_app_alert: rule.actions?.create_in_app_alert || { enabled: true },
          escalate_severity: rule.actions?.escalate_severity || { enabled: false, to_severity: 'high' }
        },
        cooldown_minutes: rule.cooldown_minutes || 30
      });
      setEmailInput(rule.actions?.notify_email?.recipients?.join(', ') || '');
    } else {
      setForm({
        name: '',
        description: '',
        enabled: true,
        trigger_conditions: {
          severity: [],
          event_types: [],
          threat_intel_match: false,
          endpoint_posture: [],
          event_count_threshold: null,
          time_window_minutes: 10
        },
        actions: {
          block_ip: { enabled: false, duration_minutes: 60 },
          isolate_endpoint: { enabled: false },
          trigger_vuln_scan: { enabled: false },
          notify_email: { enabled: false, recipients: [] },
          create_in_app_alert: { enabled: true },
          escalate_severity: { enabled: false, to_severity: 'high' }
        },
        cooldown_minutes: 30
      });
      setEmailInput('');
    }
  }, [rule, open]);

  const toggleSeverity = (sev) => {
    const current = form.trigger_conditions.severity || [];
    const updated = current.includes(sev) ? current.filter(s => s !== sev) : [...current, sev];
    setForm(f => ({ ...f, trigger_conditions: { ...f.trigger_conditions, severity: updated } }));
  };

  const togglePosture = (posture) => {
    const current = form.trigger_conditions.endpoint_posture || [];
    const updated = current.includes(posture) ? current.filter(p => p !== posture) : [...current, posture];
    setForm(f => ({ ...f, trigger_conditions: { ...f.trigger_conditions, endpoint_posture: updated } }));
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Rule name is required');
      return;
    }
    const data = {
      ...form,
      actions: {
        ...form.actions,
        notify_email: {
          ...form.actions.notify_email,
          recipients: emailInput.split(',').map(e => e.trim()).filter(Boolean)
        }
      }
    };
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm sm:text-base">{rule ? 'Edit Rule' : 'Create Auto-Response Rule'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Rule Name *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Block Critical Threats"
                className="h-8 text-sm"
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <Switch checked={form.enabled} onCheckedChange={v => setForm(f => ({ ...f, enabled: v }))} />
              <Label className="text-xs">Enabled</Label>
            </div>
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What does this rule do?"
              className="h-16 text-sm"
            />
          </div>

          {/* Trigger Conditions */}
          <div className="border-t pt-3">
            <h4 className="text-xs font-medium mb-2">Trigger Conditions (any match)</h4>
            
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-stone-600">Severity Levels</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {SEVERITY_OPTIONS.map(sev => (
                    <Badge
                      key={sev}
                      className={`cursor-pointer text-[10px] ${
                        form.trigger_conditions.severity?.includes(sev)
                          ? SEV_BADGE[sev]
                          : 'bg-stone-100 text-stone-500'
                      }`}
                      onClick={() => toggleSeverity(sev)}
                    >
                      {sev}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={form.trigger_conditions.threat_intel_match}
                  onCheckedChange={v => setForm(f => ({
                    ...f,
                    trigger_conditions: { ...f.trigger_conditions, threat_intel_match: v }
                  }))}
                />
                <Label className="text-xs">IP matches threat intelligence</Label>
              </div>

              <div>
                <Label className="text-xs text-stone-600">Endpoint Posture</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {['compromised', 'at_risk'].map(posture => (
                    <Badge
                      key={posture}
                      className={`cursor-pointer text-[10px] ${
                        form.trigger_conditions.endpoint_posture?.includes(posture)
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-stone-100 text-stone-500'
                      }`}
                      onClick={() => togglePosture(posture)}
                    >
                      {posture}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-stone-600">Event Count Threshold</Label>
                  <Input
                    type="number"
                    value={form.trigger_conditions.event_count_threshold || ''}
                    onChange={e => setForm(f => ({
                      ...f,
                      trigger_conditions: { ...f.trigger_conditions, event_count_threshold: e.target.value ? parseInt(e.target.value) : null }
                    }))}
                    placeholder="e.g., 5"
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs text-stone-600">Cooldown (min)</Label>
                  <Input
                    type="number"
                    value={form.cooldown_minutes}
                    onChange={e => setForm(f => ({ ...f, cooldown_minutes: parseInt(e.target.value) || 30 }))}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t pt-3">
            <h4 className="text-xs font-medium mb-2">Actions</h4>
            
            <div className="space-y-3">
              {/* Block IP */}
              <div className="flex items-center justify-between gap-2 p-2 bg-stone-50 rounded">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={form.actions.block_ip?.enabled}
                    onCheckedChange={v => setForm(f => ({
                      ...f,
                      actions: { ...f.actions, block_ip: { ...f.actions.block_ip, enabled: v } }
                    }))}
                  />
                  <Shield className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs">Block IP</span>
                </div>
                {form.actions.block_ip?.enabled && (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={form.actions.block_ip?.duration_minutes || 60}
                      onChange={e => setForm(f => ({
                        ...f,
                        actions: { ...f.actions, block_ip: { ...f.actions.block_ip, duration_minutes: parseInt(e.target.value) || 60 } }
                      }))}
                      className="h-6 w-16 text-xs"
                    />
                    <span className="text-xs text-stone-500">min</span>
                  </div>
                )}
              </div>

              {/* Isolate Endpoint */}
              <div className="flex items-center gap-2 p-2 bg-stone-50 rounded">
                <Checkbox
                  checked={form.actions.isolate_endpoint?.enabled}
                  onCheckedChange={v => setForm(f => ({
                    ...f,
                    actions: { ...f.actions, isolate_endpoint: { enabled: v } }
                  }))}
                />
                <Monitor className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-xs">Isolate Endpoint</span>
              </div>

              {/* Trigger Vuln Scan */}
              <div className="flex items-center gap-2 p-2 bg-stone-50 rounded">
                <Checkbox
                  checked={form.actions.trigger_vuln_scan?.enabled}
                  onCheckedChange={v => setForm(f => ({
                    ...f,
                    actions: { ...f.actions, trigger_vuln_scan: { enabled: v } }
                  }))}
                />
                <Bug className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-xs">Trigger Vulnerability Scan</span>
              </div>

              {/* Email Notification */}
              <div className="p-2 bg-stone-50 rounded space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={form.actions.notify_email?.enabled}
                    onCheckedChange={v => setForm(f => ({
                      ...f,
                      actions: { ...f.actions, notify_email: { ...f.actions.notify_email, enabled: v } }
                    }))}
                  />
                  <Mail className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs">Email Notification</span>
                </div>
                {form.actions.notify_email?.enabled && (
                  <Input
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    placeholder="email1@example.com, email2@example.com"
                    className="h-7 text-xs"
                  />
                )}
              </div>

              {/* In-App Alert */}
              <div className="flex items-center gap-2 p-2 bg-stone-50 rounded">
                <Checkbox
                  checked={form.actions.create_in_app_alert?.enabled !== false}
                  onCheckedChange={v => setForm(f => ({
                    ...f,
                    actions: { ...f.actions, create_in_app_alert: { enabled: v } }
                  }))}
                />
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs">Create In-App Alert</span>
              </div>

              {/* Escalate Severity */}
              <div className="flex items-center justify-between gap-2 p-2 bg-stone-50 rounded">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={form.actions.escalate_severity?.enabled}
                    onCheckedChange={v => setForm(f => ({
                      ...f,
                      actions: { ...f.actions, escalate_severity: { ...f.actions.escalate_severity, enabled: v } }
                    }))}
                  />
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs">Escalate Severity</span>
                </div>
                {form.actions.escalate_severity?.enabled && (
                  <Select
                    value={form.actions.escalate_severity?.to_severity || 'high'}
                    onValueChange={v => setForm(f => ({
                      ...f,
                      actions: { ...f.actions, escalate_severity: { ...f.actions.escalate_severity, to_severity: v } }
                    }))}
                  >
                    <SelectTrigger className="h-6 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs">
            Cancel
          </Button>
          <Button onClick={handleSave} className="h-8 text-xs">
            {rule ? 'Update Rule' : 'Create Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Response Logs
const ResponseLogs = memo(function ResponseLogs({ logs = [], isLoading }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4 text-stone-500 text-xs">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading logs…
      </div>
    );
  }

  if (!logs?.length) {
    return <p className="text-xs text-stone-500 py-2">No auto-response logs yet</p>;
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {logs.slice(0, 20).map(log => (
        <div key={log.id} className="p-2 border rounded text-[10px] bg-white">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{log.rule_name}</span>
            <span className="text-stone-500">
              {log.executed_at ? format(new Date(log.executed_at), 'MMM d HH:mm') : '-'}
            </span>
          </div>
          <p className="text-stone-600 mt-0.5">{log.trigger_reason}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {log.actions_taken?.map((a, i) => (
              <Badge
                key={i}
                className={`text-[9px] ${
                  a.status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                  a.status === 'failed' ? 'bg-red-100 text-red-700' :
                  'bg-stone-100 text-stone-600'
                }`}
              >
                {a.action}: {a.status}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

// Main Component
function AutoResponseManager() {
  const qc = useQueryClient();
  const [editRule, setEditRule] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  // Fetch rules
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['auto-response-rules'],
    queryFn: () => base44.entities.SecurityAutoResponse.list('-created_date', 50),
    staleTime: 60_000,
  });

  // Fetch logs
  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['auto-response-logs'],
    queryFn: () => base44.entities.AutoResponseLog.list('-executed_at', 50),
    staleTime: 60_000,
    enabled: showLogs,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editRule?.id) {
        return base44.entities.SecurityAutoResponse.update(editRule.id, data);
      }
      return base44.entities.SecurityAutoResponse.create(data);
    },
    onSuccess: () => {
      toast.success(editRule ? 'Rule updated' : 'Rule created');
      qc.invalidateQueries({ queryKey: ['auto-response-rules'] });
      setEditorOpen(false);
      setEditRule(null);
    },
    onError: (e) => toast.error(e.message),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SecurityAutoResponse.delete(id),
    onSuccess: () => {
      toast.success('Rule deleted');
      qc.invalidateQueries({ queryKey: ['auto-response-rules'] });
    },
    onError: (e) => toast.error(e.message),
  });

  // Toggle mutation
  const toggleMutation = useMutation({
    mutationFn: (rule) => base44.entities.SecurityAutoResponse.update(rule.id, { enabled: !rule.enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auto-response-rules'] }),
  });

  const handleEdit = useCallback((rule) => {
    setEditRule(rule);
    setEditorOpen(true);
  }, []);

  const handleDelete = useCallback((rule) => {
    if (confirm(`Delete rule "${rule.name}"?`)) {
      deleteMutation.mutate(rule.id);
    }
  }, [deleteMutation]);

  const handleToggle = useCallback((rule) => {
    toggleMutation.mutate(rule);
  }, [toggleMutation]);

  const handleSave = useCallback((data) => {
    saveMutation.mutate(data);
  }, [saveMutation]);

  const handleCreate = useCallback(() => {
    setEditRule(null);
    setEditorOpen(true);
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base lg:text-lg flex items-center gap-2">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
            Auto-Response Rules
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLogs(!showLogs)}
              className="h-7 text-xs gap-1"
            >
              <History className="w-3.5 h-3.5" />
              {showLogs ? 'Hide' : 'Show'} Logs
            </Button>
            <Button size="sm" onClick={handleCreate} className="h-7 text-xs gap-1">
              <Plus className="w-3.5 h-3.5" /> Add Rule
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-stone-500 text-sm">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading rules…
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-6 text-stone-500 text-sm">
            No auto-response rules configured. Create one to automate security responses.
          </div>
        ) : (
          <div className="grid gap-2">
            {rules.map(rule => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}

        {showLogs && (
          <div className="border-t pt-3">
            <h4 className="text-xs font-medium mb-2 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Response History
            </h4>
            <ResponseLogs logs={logs} isLoading={logsLoading} />
          </div>
        )}
      </CardContent>

      <RuleEditorDialog
        rule={editRule}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSave={handleSave}
      />
    </Card>
  );
}

export default memo(AutoResponseManager);