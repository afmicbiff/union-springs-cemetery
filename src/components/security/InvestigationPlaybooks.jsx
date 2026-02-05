import React, { memo, useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Loader2, Plus, Play, Pause, CheckCircle, Circle, ChevronRight, ChevronDown, Book,
  AlertTriangle, Shield, Bug, Mail, Database, Users, Lock, ExternalLink, Link2,
  Clock, Target, FileText, Clipboard, ArrowRight, RotateCcw, X, Eye, Trash2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const SEV_COLORS = { critical: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800', medium: 'bg-amber-100 text-amber-800', low: 'bg-emerald-100 text-emerald-800' };
const STATUS_COLORS = { in_progress: 'bg-blue-100 text-blue-700', paused: 'bg-amber-100 text-amber-700', completed: 'bg-emerald-100 text-emerald-700', escalated: 'bg-red-100 text-red-700', closed: 'bg-stone-100 text-stone-600' };
const STEP_COLORS = { pending: 'bg-stone-100 text-stone-500', in_progress: 'bg-blue-100 text-blue-700', completed: 'bg-emerald-100 text-emerald-700', skipped: 'bg-stone-50 text-stone-400' };
const CATEGORY_ICONS = { identification: Target, containment: Shield, eradication: Bug, recovery: RotateCcw, lessons_learned: Book };
const SCENARIO_ICONS = { malware_outbreak: Bug, phishing_campaign: Mail, data_exfiltration: Database, brute_force: Lock, insider_threat: Users, ransomware: AlertTriangle, lateral_movement: ArrowRight, custom: FileText };

// Default playbook templates
const PLAYBOOK_TEMPLATES = [
  {
    name: "Malware Outbreak Response",
    scenario_type: "malware_outbreak",
    severity: "high",
    estimated_duration_minutes: 120,
    description: "Systematic response to malware detection across endpoints",
    steps: [
      { id: "1", title: "Initial Triage", category: "identification", description: "Assess the scope and nature of the malware outbreak",
        checklist: ["Identify affected endpoints", "Determine malware type/family", "Check threat intel for known IOCs", "Document initial findings"],
        data_queries: [{ label: "High/Critical Security Events", entity: "SecurityEvent", filter_template: "severity:high,critical" }, { label: "Compromised Endpoints", entity: "Endpoint", filter_template: "security_posture:compromised" }],
        recommended_actions: ["Isolate confirmed infected endpoints", "Preserve forensic evidence", "Alert SOC team"], mitre_techniques: ["T1204", "T1059"] },
      { id: "2", title: "Containment", category: "containment", description: "Prevent further spread of malware",
        checklist: ["Network isolate affected systems", "Block malicious IPs at firewall", "Disable compromised accounts", "Quarantine suspicious files"],
        data_queries: [{ label: "Related IOC Matches", entity: "HuntFinding", filter_template: "finding_type:ioc_match" }],
        recommended_actions: ["Enable enhanced logging", "Deploy additional monitoring"], mitre_techniques: ["T1105", "T1071"] },
      { id: "3", title: "Eradication", category: "eradication", description: "Remove malware and close attack vectors",
        checklist: ["Run full AV scan on all endpoints", "Remove malware artifacts", "Patch exploited vulnerabilities", "Reset compromised credentials"],
        recommended_actions: ["Verify clean state with IOC sweep", "Update AV signatures"], mitre_techniques: ["T1485"] },
      { id: "4", title: "Recovery", category: "recovery", description: "Restore systems to normal operations",
        checklist: ["Restore from clean backups if needed", "Verify system integrity", "Re-enable network access gradually", "Monitor for reinfection"],
        recommended_actions: ["Implement additional security controls", "Schedule follow-up scans"] },
      { id: "5", title: "Lessons Learned", category: "lessons_learned", description: "Document findings and improve defenses",
        checklist: ["Complete incident report", "Update detection rules", "Conduct team debrief", "Update playbook if needed"],
        recommended_actions: ["Share IOCs with threat intel community", "Review security policies"] }
    ],
    required_data_sources: ["SecurityEvent", "Endpoint", "HuntFinding"], tags: ["malware", "incident_response"], is_template: true
  },
  {
    name: "Phishing Campaign Investigation",
    scenario_type: "phishing_campaign",
    severity: "medium",
    estimated_duration_minutes: 90,
    description: "Investigate and respond to phishing attacks targeting users",
    steps: [
      { id: "1", title: "Report Analysis", category: "identification", description: "Analyze the reported phishing attempt",
        checklist: ["Collect phishing email samples", "Extract sender info and headers", "Identify malicious URLs/attachments", "Check for credential harvesting"],
        data_queries: [{ label: "Email-related Events", entity: "SecurityEvent", filter_template: "event_type:email,phishing" }],
        recommended_actions: ["Block sender domain", "Add URLs to blocklist"], mitre_techniques: ["T1566.001", "T1566.002"] },
      { id: "2", title: "Scope Assessment", category: "identification", description: "Determine how many users were targeted/affected",
        checklist: ["Search for similar emails in logs", "Identify all recipients", "Check for clicked links", "Identify credential submissions"],
        data_queries: [{ label: "User Activity Events", entity: "SecurityEvent", filter_template: "user_email" }],
        recommended_actions: ["Notify affected users", "Enable MFA for high-risk accounts"], mitre_techniques: ["T1078"] },
      { id: "3", title: "Containment", category: "containment", description: "Prevent further damage from the campaign",
        checklist: ["Block phishing domains/IPs", "Reset compromised passwords", "Revoke active sessions", "Quarantine malicious attachments"],
        recommended_actions: ["Enable email filtering rules", "Alert help desk of potential calls"] },
      { id: "4", title: "User Communication", category: "recovery", description: "Communicate with affected users",
        checklist: ["Send security advisory", "Provide password reset instructions", "Offer phishing awareness training", "Document user impact"],
        recommended_actions: ["Schedule security awareness training", "Update email security policies"] },
      { id: "5", title: "Post-Incident Review", category: "lessons_learned", description: "Analyze the incident and improve defenses",
        checklist: ["Document attack timeline", "Update detection signatures", "Review email gateway config", "Plan training improvements"],
        recommended_actions: ["Implement DMARC/DKIM if not present", "Review user reporting process"] }
    ],
    required_data_sources: ["SecurityEvent"], tags: ["phishing", "email", "social_engineering"], is_template: true
  },
  {
    name: "Brute Force Attack Response",
    scenario_type: "brute_force",
    severity: "medium",
    estimated_duration_minutes: 45,
    description: "Respond to detected brute force authentication attempts",
    steps: [
      { id: "1", title: "Attack Identification", category: "identification", description: "Identify the source and target of brute force attempts",
        checklist: ["Identify attacking IPs", "Determine targeted accounts", "Check for successful logins", "Review authentication logs"],
        data_queries: [{ label: "Failed Login Events", entity: "SecurityEvent", filter_template: "event_type:auth_failure" }, { label: "Blocked IPs", entity: "BlockedIP", filter_template: "active:true" }],
        recommended_actions: ["Block attacking IPs immediately", "Enable account lockout"], mitre_techniques: ["T1110"] },
      { id: "2", title: "Containment", category: "containment", description: "Stop ongoing attacks and protect accounts",
        checklist: ["Block source IPs", "Lock targeted accounts temporarily", "Enable CAPTCHA if available", "Review firewall rules"],
        data_queries: [{ label: "Correlated Incidents", entity: "CorrelatedIncident", filter_template: "severity:high,critical" }],
        recommended_actions: ["Implement rate limiting", "Consider geo-blocking"] },
      { id: "3", title: "Account Security", category: "eradication", description: "Secure potentially compromised accounts",
        checklist: ["Force password reset for targeted accounts", "Review account permissions", "Enable MFA", "Check for unauthorized access"],
        recommended_actions: ["Review password policy", "Implement password complexity requirements"] },
      { id: "4", title: "Monitoring Enhancement", category: "recovery", description: "Improve detection capabilities",
        checklist: ["Update alert thresholds", "Add source IPs to watchlist", "Enable enhanced logging", "Verify alerts are working"],
        recommended_actions: ["Create automated response rules", "Set up recurring threat hunts"] }
    ],
    required_data_sources: ["SecurityEvent", "BlockedIP", "CorrelatedIncident"], tags: ["brute_force", "authentication"], is_template: true
  },
  {
    name: "Data Exfiltration Investigation",
    scenario_type: "data_exfiltration",
    severity: "critical",
    estimated_duration_minutes: 180,
    description: "Investigate potential data theft or unauthorized data transfer",
    steps: [
      { id: "1", title: "Alert Triage", category: "identification", description: "Assess the data exfiltration alert",
        checklist: ["Review triggering alert details", "Identify source endpoint/user", "Determine data type involved", "Check transfer destination"],
        data_queries: [{ label: "Network Events", entity: "EndpointEvent", filter_template: "type:network_connection" }, { label: "Related Incidents", entity: "CorrelatedIncident", filter_template: "" }],
        recommended_actions: ["Preserve network logs", "Document initial timeline"], mitre_techniques: ["T1041", "T1048"] },
      { id: "2", title: "Scope Analysis", category: "identification", description: "Determine the extent of potential data loss",
        checklist: ["Identify all data accessed", "Review file access logs", "Check cloud storage activity", "Map data flow"],
        data_queries: [{ label: "File Events", entity: "EndpointEvent", filter_template: "type:file_modification" }],
        recommended_actions: ["Engage legal/compliance team", "Prepare for potential breach notification"] },
      { id: "3", title: "Containment", category: "containment", description: "Stop ongoing data loss",
        checklist: ["Block destination IPs/domains", "Disable suspected user accounts", "Isolate source endpoints", "Revoke API keys if applicable"],
        recommended_actions: ["Enable DLP blocking mode", "Review cloud sharing permissions"], mitre_techniques: ["T1567"] },
      { id: "4", title: "Forensic Analysis", category: "eradication", description: "Conduct detailed forensic investigation",
        checklist: ["Create forensic images", "Analyze malware if present", "Review command history", "Check for persistence mechanisms"],
        recommended_actions: ["Engage incident response firm if needed", "Preserve chain of custody"] },
      { id: "5", title: "Recovery & Reporting", category: "recovery", description: "Recover and report on the incident",
        checklist: ["Assess regulatory reporting requirements", "Prepare executive summary", "Implement additional controls", "Monitor for continued activity"],
        recommended_actions: ["Review data classification", "Update DLP policies"] },
      { id: "6", title: "Post-Incident Review", category: "lessons_learned", description: "Learn from the incident",
        checklist: ["Complete detailed incident report", "Identify detection gaps", "Update monitoring rules", "Brief leadership"],
        recommended_actions: ["Conduct tabletop exercise", "Review data handling policies"] }
    ],
    required_data_sources: ["SecurityEvent", "EndpointEvent", "Endpoint", "CorrelatedIncident"], tags: ["data_loss", "exfiltration", "insider_threat"], is_template: true
  }
];

// Playbook Card
const PlaybookCard = memo(function PlaybookCard({ playbook, onStart, onView, onDelete }) {
  const Icon = SCENARIO_ICONS[playbook.scenario_type] || FileText;
  return (
    <div className="p-3 border rounded-lg bg-white hover:border-teal-300 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Icon className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="font-medium text-sm">{playbook.name}</span>
            <Badge className={`${SEV_COLORS[playbook.severity]} text-[9px]`}>{playbook.severity}</Badge>
            {playbook.is_template && <Badge variant="outline" className="text-[9px]">Template</Badge>}
          </div>
          <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-2">{playbook.description}</p>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-stone-400">
            <span>{playbook.steps?.length || 0} steps</span>
            <span>•</span>
            <span>~{playbook.estimated_duration_minutes || 60} min</span>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="outline" size="icon" onClick={() => onView(playbook)} className="h-7 w-7"><Eye className="w-3.5 h-3.5" /></Button>
          <Button size="icon" onClick={() => onStart(playbook)} className="h-7 w-7"><Play className="w-3.5 h-3.5" /></Button>
          {!playbook.is_template && <Button variant="ghost" size="icon" onClick={() => onDelete(playbook)} className="h-7 w-7 text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>}
        </div>
      </div>
    </div>
  );
});

// Active Investigation Card
const InvestigationCard = memo(function InvestigationCard({ investigation, onOpen }) {
  const completedSteps = investigation.step_progress?.filter(s => s.status === 'completed').length || 0;
  const totalSteps = investigation.step_progress?.length || 1;
  const progress = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div className={`p-3 border rounded-lg ${investigation.status === 'in_progress' ? 'border-blue-300 bg-blue-50' : 'bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{investigation.title}</span>
            <Badge className={`${STATUS_COLORS[investigation.status]} text-[9px]`}>{investigation.status?.replace('_', ' ')}</Badge>
            <Badge className={`${SEV_COLORS[investigation.severity]} text-[9px]`}>{investigation.severity}</Badge>
          </div>
          <p className="text-[10px] text-stone-500">{investigation.playbook_name}</p>
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span>Step {investigation.current_step_index + 1} of {totalSteps}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
          {investigation.assigned_to && <p className="text-[9px] text-stone-400 mt-1">Assigned: {investigation.assigned_to}</p>}
        </div>
        <Button onClick={() => onOpen(investigation)} className="h-8 text-xs shrink-0">Continue</Button>
      </div>
    </div>
  );
});

// Step Component in Investigation
const InvestigationStep = memo(function InvestigationStep({ step, stepProgress, isActive, isCurrent, onToggleChecklist, onUpdateNotes, linkedData }) {
  const [expanded, setExpanded] = useState(isCurrent);
  const Icon = CATEGORY_ICONS[step.category] || Circle;
  const checklistComplete = stepProgress?.checklist_completed || [];

  useEffect(() => { if (isCurrent) setExpanded(true); }, [isCurrent]);

  return (
    <div className={`border rounded-lg overflow-hidden ${isCurrent ? 'border-blue-400 ring-1 ring-blue-200' : ''}`}>
      <button onClick={() => setExpanded(!expanded)} className={`w-full p-3 flex items-center gap-2 text-left ${STEP_COLORS[stepProgress?.status || 'pending']} hover:opacity-90`}>
        {stepProgress?.status === 'completed' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Icon className="w-4 h-4" />}
        <span className="font-medium text-sm flex-1">{step.title}</span>
        <Badge variant="outline" className="text-[9px] capitalize">{step.category?.replace('_', ' ')}</Badge>
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="p-3 bg-white border-t space-y-3">
          <p className="text-xs text-stone-600">{step.description}</p>

          {/* Checklist */}
          {step.checklist?.length > 0 && (
            <div>
              <h5 className="text-[10px] font-medium text-stone-500 mb-1.5">CHECKLIST</h5>
              <div className="space-y-1.5">
                {step.checklist.map((item, i) => (
                  <label key={i} className="flex items-start gap-2 cursor-pointer group">
                    <Checkbox checked={checklistComplete[i] || false} onCheckedChange={() => onToggleChecklist(i)} disabled={!isActive} className="mt-0.5" />
                    <span className={`text-xs ${checklistComplete[i] ? 'text-stone-400 line-through' : 'text-stone-700'}`}>{item}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Actions */}
          {step.recommended_actions?.length > 0 && (
            <div>
              <h5 className="text-[10px] font-medium text-stone-500 mb-1">RECOMMENDED ACTIONS</h5>
              <ul className="text-xs text-stone-600 space-y-0.5">
                {step.recommended_actions.map((a, i) => <li key={i} className="flex items-start gap-1"><ArrowRight className="w-3 h-3 mt-0.5 text-teal-500 shrink-0" />{a}</li>)}
              </ul>
            </div>
          )}

          {/* MITRE */}
          {step.mitre_techniques?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-[10px] text-stone-500">MITRE:</span>
              {step.mitre_techniques.map((t, i) => (
                <a key={i} href={`https://attack.mitre.org/techniques/${t.replace('.', '/')}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-600 hover:underline flex items-center gap-0.5">{t}<ExternalLink className="w-2 h-2" /></a>
              ))}
            </div>
          )}

          {/* Linked Data */}
          {linkedData && (
            <div>
              <h5 className="text-[10px] font-medium text-stone-500 mb-1">RELEVANT DATA</h5>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {linkedData.map((d, i) => (
                  <div key={i} className="text-[10px] p-1.5 bg-stone-50 rounded flex items-center gap-2">
                    <Link2 className="w-3 h-3 text-stone-400" />
                    <span className="font-medium">{d.type}</span>
                    <span className="text-stone-500 truncate flex-1">{d.summary}</span>
                    <Badge className={`${SEV_COLORS[d.severity]} text-[8px]`}>{d.severity}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {isActive && (
            <div>
              <h5 className="text-[10px] font-medium text-stone-500 mb-1">NOTES</h5>
              <Textarea value={stepProgress?.notes || ''} onChange={e => onUpdateNotes(e.target.value)} placeholder="Add investigation notes..." className="h-16 text-xs" />
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Start Investigation Dialog
function StartInvestigationDialog({ playbook, open, onOpenChange, onStart, linkedIncident, linkedFinding }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (playbook && open) {
      const suffix = linkedIncident ? ` - ${linkedIncident.title}` : linkedFinding ? ` - ${linkedFinding.title}` : '';
      setTitle(`${playbook.name}${suffix}`);
      setDescription(linkedIncident?.description || linkedFinding?.description || '');
    }
  }, [playbook, open, linkedIncident, linkedFinding]);

  if (!playbook) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="text-sm">Start Investigation</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Investigation Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} className="h-20 text-sm" /></div>
          <div className="p-2 bg-stone-50 rounded text-xs">
            <div className="font-medium">{playbook.name}</div>
            <div className="text-stone-500">{playbook.steps?.length} steps • ~{playbook.estimated_duration_minutes} min</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs">Cancel</Button>
          <Button onClick={() => onStart({ title, description })} disabled={!title.trim()} className="h-8 text-xs"><Play className="w-3.5 h-3.5 mr-1" /> Start</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Active Investigation View
function ActiveInvestigationView({ investigation, playbook, onClose, onUpdate }) {
  const qc = useQueryClient();
  const [stepProgress, setStepProgress] = useState(investigation.step_progress || []);
  const [currentStep, setCurrentStep] = useState(investigation.current_step_index || 0);

  const { data: correlatedIncidents = [] } = useQuery({
    queryKey: ['correlated-incidents-inv', investigation.linked_incidents],
    queryFn: () => investigation.linked_incidents?.length ? base44.entities.CorrelatedIncident.filter({ id: { $in: investigation.linked_incidents } }) : Promise.resolve([]),
    enabled: investigation.linked_incidents?.length > 0
  });

  const { data: huntFindings = [] } = useQuery({
    queryKey: ['hunt-findings-inv', investigation.linked_findings],
    queryFn: () => investigation.linked_findings?.length ? base44.entities.HuntFinding.filter({ id: { $in: investigation.linked_findings } }) : Promise.resolve([]),
    enabled: investigation.linked_findings?.length > 0
  });

  const steps = playbook?.steps || [];
  const progress = stepProgress.filter(s => s.status === 'completed').length / (steps.length || 1) * 100;

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.ActiveInvestigation.update(investigation.id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['active-investigations'] })
  });

  const handleToggleChecklist = useCallback((stepIdx, checkIdx) => {
    setStepProgress(prev => {
      const updated = [...prev];
      if (!updated[stepIdx]) updated[stepIdx] = { step_id: steps[stepIdx]?.id, status: 'in_progress', checklist_completed: [] };
      const checklist = [...(updated[stepIdx].checklist_completed || [])];
      checklist[checkIdx] = !checklist[checkIdx];
      updated[stepIdx] = { ...updated[stepIdx], checklist_completed: checklist, status: 'in_progress' };
      updateMutation.mutate({ step_progress: updated, current_step_index: stepIdx });
      return updated;
    });
  }, [steps, updateMutation]);

  const handleUpdateNotes = useCallback((stepIdx, notes) => {
    setStepProgress(prev => {
      const updated = [...prev];
      if (!updated[stepIdx]) updated[stepIdx] = { step_id: steps[stepIdx]?.id, status: 'in_progress', checklist_completed: [] };
      updated[stepIdx] = { ...updated[stepIdx], notes };
      return updated;
    });
  }, [steps]);

  const handleCompleteStep = useCallback((stepIdx) => {
    setStepProgress(prev => {
      const updated = [...prev];
      updated[stepIdx] = { ...updated[stepIdx], status: 'completed', completed_at: new Date().toISOString() };
      const nextStep = Math.min(stepIdx + 1, steps.length - 1);
      setCurrentStep(nextStep);
      updateMutation.mutate({ step_progress: updated, current_step_index: nextStep });
      return updated;
    });
  }, [steps, updateMutation]);

  const handleSaveNotes = useCallback(() => {
    updateMutation.mutate({ step_progress: stepProgress });
    toast.success('Notes saved');
  }, [stepProgress, updateMutation]);

  const handleComplete = useCallback(() => {
    updateMutation.mutate({ status: 'completed', completed_at: new Date().toISOString() });
    toast.success('Investigation completed');
    onClose();
  }, [updateMutation, onClose]);

  const linkedDataForStep = useMemo(() => {
    const data = [];
    correlatedIncidents.forEach(i => data.push({ type: 'Correlated Incident', summary: i.title, severity: i.severity }));
    huntFindings.forEach(f => data.push({ type: 'Hunt Finding', summary: f.title, severity: f.severity }));
    return data;
  }, [correlatedIncidents, huntFindings]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="font-medium text-base">{investigation.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`${STATUS_COLORS[investigation.status]} text-[9px]`}>{investigation.status?.replace('_', ' ')}</Badge>
              <span className="text-xs text-stone-500">{playbook?.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right mr-2">
              <div className="text-xs text-stone-500">Progress</div>
              <div className="text-sm font-medium">{Math.round(progress)}%</div>
            </div>
            <Button variant="outline" size="sm" onClick={handleSaveNotes} className="h-7 text-xs">Save</Button>
            {progress >= 100 && <Button size="sm" onClick={handleComplete} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"><CheckCircle className="w-3.5 h-3.5 mr-1" /> Complete</Button>}
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7"><X className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Steps Sidebar */}
          <div className="w-56 border-r bg-stone-50 p-3">
            <h3 className="text-xs font-medium text-stone-500 mb-2">STEPS</h3>
            <div className="space-y-1">
              {steps.map((step, i) => (
                <button key={i} onClick={() => setCurrentStep(i)} className={`w-full text-left p-2 rounded text-xs flex items-center gap-2 ${i === currentStep ? 'bg-white border shadow-sm' : 'hover:bg-white'}`}>
                  {stepProgress[i]?.status === 'completed' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-stone-300" />}
                  <span className={stepProgress[i]?.status === 'completed' ? 'text-stone-400' : ''}>{step.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {steps.map((step, i) => (
                <InvestigationStep
                  key={i}
                  step={step}
                  stepProgress={stepProgress[i]}
                  isActive={i === currentStep}
                  isCurrent={i === currentStep}
                  onToggleChecklist={(checkIdx) => handleToggleChecklist(i, checkIdx)}
                  onUpdateNotes={(notes) => handleUpdateNotes(i, notes)}
                  linkedData={i === currentStep ? linkedDataForStep : null}
                />
              ))}

              {currentStep < steps.length && (
                <div className="flex justify-end">
                  <Button onClick={() => handleCompleteStep(currentStep)} className="h-8 text-xs">
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Complete Step & Continue
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

// Main Component
function InvestigationPlaybooks() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('active');
  const [startPlaybook, setStartPlaybook] = useState(null);
  const [viewPlaybook, setViewPlaybook] = useState(null);
  const [activeInvestigation, setActiveInvestigation] = useState(null);

  const { data: playbooks = [], isLoading: playbooksLoading } = useQuery({
    queryKey: ['investigation-playbooks'],
    queryFn: () => base44.entities.InvestigationPlaybook.list('-created_date', 50),
    staleTime: 60_000
  });

  const { data: investigations = [], isLoading: investigationsLoading } = useQuery({
    queryKey: ['active-investigations'],
    queryFn: () => base44.entities.ActiveInvestigation.list('-created_date', 50),
    staleTime: 30_000
  });

  // Seed templates if none exist
  useEffect(() => {
    if (!playbooksLoading && playbooks.length === 0) {
      Promise.all(PLAYBOOK_TEMPLATES.map(t => base44.entities.InvestigationPlaybook.create(t)))
        .then(() => qc.invalidateQueries({ queryKey: ['investigation-playbooks'] }));
    }
  }, [playbooksLoading, playbooks.length, qc]);

  const activeInvestigations = investigations.filter(i => i.status === 'in_progress');
  const templates = playbooks.filter(p => p.is_template);
  const customPlaybooks = playbooks.filter(p => !p.is_template);

  const startInvestigationMutation = useMutation({
    mutationFn: async ({ playbook, title, description }) => {
      const stepProgress = playbook.steps?.map(s => ({ step_id: s.id, status: 'pending', checklist_completed: s.checklist?.map(() => false) || [] })) || [];
      return base44.entities.ActiveInvestigation.create({
        playbook_id: playbook.id, playbook_name: playbook.name, title, description,
        severity: playbook.severity, step_progress: stepProgress, started_at: new Date().toISOString(),
        timeline: [{ timestamp: new Date().toISOString(), action: 'Investigation started', details: title }]
      });
    },
    onSuccess: (data) => {
      toast.success('Investigation started');
      qc.invalidateQueries({ queryKey: ['active-investigations'] });
      setStartPlaybook(null);
      setActiveInvestigation(data);
    }
  });

  const deletePlaybookMutation = useMutation({
    mutationFn: (id) => base44.entities.InvestigationPlaybook.delete(id),
    onSuccess: () => { toast.success('Playbook deleted'); qc.invalidateQueries({ queryKey: ['investigation-playbooks'] }); }
  });

  const handleStart = useCallback((formData) => {
    startInvestigationMutation.mutate({ playbook: startPlaybook, ...formData });
  }, [startPlaybook, startInvestigationMutation]);

  const handleOpenInvestigation = useCallback((inv) => {
    const pb = playbooks.find(p => p.id === inv.playbook_id);
    if (pb) setActiveInvestigation({ ...inv, _playbook: pb });
  }, [playbooks]);

  return (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Book className="w-4 h-4 text-teal-600" />
            Investigation Playbooks
          </CardTitle>
          {activeInvestigations.length > 0 && (
            <Badge className="bg-blue-100 text-blue-700 text-[10px]">{activeInvestigations.length} active</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-8 mb-3">
            <TabsTrigger value="active" className="text-xs">Active ({activeInvestigations.length})</TabsTrigger>
            <TabsTrigger value="templates" className="text-xs">Templates ({templates.length})</TabsTrigger>
            <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-2">
            {investigationsLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : activeInvestigations.length === 0 ? (
              <div className="text-center py-6">
                <Book className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                <p className="text-stone-500 text-sm">No active investigations</p>
                <Button onClick={() => setActiveTab('templates')} className="mt-2 h-8 text-xs">Start from Template</Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {activeInvestigations.map(inv => <InvestigationCard key={inv.id} investigation={inv} onOpen={handleOpenInvestigation} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-2">
            {playbooksLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {templates.map(pb => <PlaybookCard key={pb.id} playbook={pb} onStart={setStartPlaybook} onView={setViewPlaybook} onDelete={() => {}} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-2">
            {investigations.filter(i => i.status !== 'in_progress').length === 0 ? (
              <p className="text-center py-6 text-stone-500 text-sm">No completed investigations</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {investigations.filter(i => i.status !== 'in_progress').map(inv => (
                  <div key={inv.id} className="p-2 border rounded-lg bg-white">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{inv.title}</span>
                      <Badge className={`${STATUS_COLORS[inv.status]} text-[9px]`}>{inv.status}</Badge>
                    </div>
                    <p className="text-[10px] text-stone-500">{inv.completed_at ? format(new Date(inv.completed_at), 'PPp') : ''}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <StartInvestigationDialog playbook={startPlaybook} open={!!startPlaybook} onOpenChange={() => setStartPlaybook(null)} onStart={handleStart} />

      {activeInvestigation && (
        <ActiveInvestigationView
          investigation={activeInvestigation}
          playbook={activeInvestigation._playbook || playbooks.find(p => p.id === activeInvestigation.playbook_id)}
          onClose={() => setActiveInvestigation(null)}
          onUpdate={() => qc.invalidateQueries({ queryKey: ['active-investigations'] })}
        />
      )}
    </Card>
  );
}

export default memo(InvestigationPlaybooks);