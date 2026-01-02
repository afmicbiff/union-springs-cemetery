import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Pencil, Trash2, FileText, Sparkles } from "lucide-react";
import TemplateForm from "./TemplateForm";

export default function TemplatesManager() {
  const qc = useQueryClient();
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => base44.entities.EmailTemplate.list("-updated_date", 200)
  });

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const seededRef = React.useRef(false);
  const seededCoreRef = React.useRef(false);

  const createMut = useMutation({
    mutationFn: async (payload) => base44.entities.EmailTemplate.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-templates"] })
  });
  const updateMut = useMutation({
    mutationFn: async ({ id, payload }) => base44.entities.EmailTemplate.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-templates"] })
  });
  const deleteMut = useMutation({
    mutationFn: async (id) => base44.entities.EmailTemplate.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-templates"] })
  });
  const bulkCreateMut = useMutation({
    mutationFn: async () => base44.entities.EmailTemplate.bulkCreate(getStarterTemplates()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-templates"] })
  });
  const bulkCreateCoreMut = useMutation({
    mutationFn: async (payload) => base44.entities.EmailTemplate.bulkCreate(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-templates"] })
  });

  React.useEffect(() => {
    if (!isLoading && templates.length === 0 && !seededRef.current && !bulkCreateMut.isPending) {
      seededRef.current = true;
      bulkCreateMut.mutate();
    }
  }, [isLoading, templates.length]);

  React.useEffect(() => {
    if (isLoading) return;
    if (seededCoreRef.current || bulkCreateCoreMut.isPending) return;
    const keys = new Set((templates || []).map(t => t.key));
    const coreMissing = getCoreMemberTemplates().filter(t => !keys.has(t.key));
    if (coreMissing.length) {
      seededCoreRef.current = true;
      bulkCreateCoreMut.mutate(coreMissing);
    }
  }, [isLoading, templates]);

  const filtered = templates.filter(t => !search || (t.name || "").toLowerCase().includes(search.toLowerCase()) || (t.key || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <Card className="p-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-teal-700" />
          <h2 className="font-semibold">Email Templates</h2>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Search templates" value={search} onChange={(e)=>setSearch(e.target.value)} className="h-8 w-40" />
          {templates.length === 0 && (
            <Button size="sm" variant="outline" onClick={()=>bulkCreateMut.mutate()} disabled={bulkCreateMut.isPending} className="gap-1">
              {bulkCreateMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Sparkles className="h-3.5 w-3.5"/>}
              Seed starter
            </Button>
          )}
          <Button size="sm" onClick={()=>{ setEditing(null); setDialogOpen(true); }} className="bg-teal-700 hover:bg-teal-800 text-white gap-1">
            <Plus className="w-4 h-4" /> New
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Loading…</div>
      ) : (
        <div className="divide-y">
          {filtered.map(t => (
            <div key={t.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{t.name} <span className="text-xs text-gray-400">{t.key ? `(${t.key})` : ""}</span></div>
                <div className="text-xs text-gray-500">{t.category || 'general'} {t.description ? `• ${t.description}` : ''}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={()=>{ setEditing(t); setDialogOpen(true); }} className="gap-1">
                  <Pencil className="w-3.5 h-3.5"/> Edit
                </Button>
                <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={()=>{ if (confirm('Delete this template?')) deleteMut.mutate(t.id); }}>
                  <Trash2 className="w-3.5 h-3.5"/>
                </Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-sm text-gray-500 py-6 text-center">No templates yet.</div>
          )}
        </div>
      )}

      <TemplateForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSave={(form)=>{
          if (editing) updateMut.mutate({ id: editing.id, payload: form });
          else createMut.mutate(form);
          setDialogOpen(false);
        }}
      />
    </Card>
  );
}

function getCoreMemberTemplates() {
  return [
    {
      name: "New Member Welcome",
      key: "member_welcome",
      category: "member",
      description: "Sent when a new member is created",
      subject: "Welcome to Union Springs, {{first_name}}",
      body: "Dear {{first_name}},\n\nWelcome to the Union Springs Cemetery Association. We're glad to have you in our community.\n\nSincerely,\nUnion Springs Cemetery",
      placeholders: ["first_name","last_name"],
      is_active: true
    },
    {
      name: "Donation Thank You",
      key: "donation_thank_you",
      category: "member",
      description: "Sent when a member makes a new donation",
      subject: "Thank you for your donation, {{first_name}}",
      body: "Dear {{first_name}},\n\nWe gratefully acknowledge your donation of {{donation}}.\nYour support helps us maintain and improve the cemetery.\n\nSincerely,\nUnion Springs Cemetery",
      placeholders: ["first_name","donation"],
      is_active: true
    }
  ];
}

function getStarterTemplates() {
  return [
    {
      name: "Reservation Acknowledgment",
      key: "reservation_ack",
      category: "reservation",
      description: "Sent after a new reservation request is created",
      subject: "We received your reservation request for plot {{plot_number}}",
      body: "Hello {{requester_name}},\n\nThank you for submitting a reservation request for plot {{plot_number}} in Section {{section}}. Our administrator will review your request and get back to you within 24 hours.\n\nIf you have any questions, reply to this email.\n\nUnion Springs Cemetery",
      placeholders: ["requester_name","plot_number","section"],
      is_active: true
    },
    {
      name: "Reservation Confirmed",
      key: "reservation_confirmed",
      category: "reservation",
      description: "Sent when a reservation is confirmed",
      subject: "Reservation confirmed for plot {{plot_number}}",
      body: "Hello {{requester_name}},\n\nYour reservation for plot {{plot_number}} (Section {{section}}) has been confirmed.{{donation_amount?}} The requested donation amount is ${{donation_amount}}.{{/donation_amount?}}\n\nThank you,\nUnion Springs Cemetery",
      placeholders: ["requester_name","plot_number","section","donation_amount"],
      is_active: true
    },
    {
      name: "Reservation Rejected",
      key: "reservation_rejected",
      category: "reservation",
      description: "Sent when a reservation is rejected",
      subject: "Reservation update for plot {{plot_number}}",
      body: "Hello {{requester_name}},\n\nWe’re sorry to inform you that your reservation for plot {{plot_number}} (Section {{section}}) was rejected.\nReason: {{rejection_reason}}.\n\nIf you have questions, please reply to this email.",
      placeholders: ["requester_name","plot_number","section","rejection_reason"],
      is_active: true
    },
    {
      name: "Contact Inquiry Acknowledgment",
      key: "inquiry_ack",
      category: "inquiry",
      description: "Auto-reply to website contact form",
      subject: "We received your message",
      body: "Hello {{name}},\n\nThanks for contacting Union Springs. We received your message about '{{subject}}' and will respond as soon as possible.\n\nBest regards,\nUnion Springs Cemetery",
      placeholders: ["name","subject"],
      is_active: true
    },
    {
      name: "Invoice Reminder",
      key: "invoice_reminder",
      category: "invoice",
      description: "Reminder for unpaid invoices",
      subject: "Invoice {{invoice_number}} is due {{due_date}}",
      body: "Hello {{member_name}},\n\nThis is a friendly reminder that invoice {{invoice_number}} (amount ${{amount}}) is due on {{due_date}}.\nYou can reply to this email if you need assistance.\n\nThank you,\nUnion Springs Cemetery",
      placeholders: ["member_name","invoice_number","amount","due_date"],
      is_active: true
    },
    {
      name: "Reservation Hold Expiring",
      key: "reservation_hold_expiring",
      category: "reservation",
      description: "Warns a requester that a temporary hold is expiring",
      subject: "Reminder: Your reservation hold for plot {{plot_number}} expires on {{expiry_date}}",
      body: "Hello {{requester_name}},\n\nYour temporary hold for plot {{plot_number}} (Section {{section}}) will expire on {{expiry_date}}.\nIf you need more time or have questions, please reply to this email.\n\nUnion Springs Cemetery",
      placeholders: ["requester_name","plot_number","section","expiry_date"],
      is_active: true
    },
    {
      name: "Forward Inquiry to Admin",
      key: "inquiry_forward_admin",
      category: "inquiry",
      description: "Sends a copy of an inquiry to administrators",
      subject: "New website inquiry from {{name}}",
      body: "New inquiry received.\n\nFrom: {{name}} <{{email}}>\nSubject: {{subject}}\n\nMessage:\n{{message}}",
      placeholders: ["name","email","subject","message"],
      is_active: true
    },
    {
      name: "Invoice Created",
      key: "invoice_created",
      category: "invoice",
      description: "Notifies a member a new invoice was issued",
      subject: "Invoice {{invoice_number}} issued (Due {{due_date}})",
      body: "Hello {{member_name}},\n\nAn invoice has been issued: {{invoice_number}} for ${{amount}}.\nDue date: {{due_date}}.\n\nIf you have any questions, reply to this email.\n\nThank you,\nUnion Springs Cemetery",
      placeholders: ["member_name","invoice_number","amount","due_date"],
      is_active: true
    },
    {
      name: "Invoice Overdue",
      key: "invoice_overdue",
      category: "invoice",
      description: "Notifies when an invoice is overdue",
      subject: "Overdue notice: Invoice {{invoice_number}}",
      body: "Hello {{member_name}},\n\nOur records indicate that invoice {{invoice_number}} (amount ${{amount}}) is now overdue.\nPlease let us know if you need any assistance.\n\nThank you,\nUnion Springs Cemetery",
      placeholders: ["member_name","invoice_number","amount"],
      is_active: true
    },
    {
      name: "Event Invitation",
      key: "event_invite",
      category: "general",
      description: "Invite members to an event",
      subject: "You're invited: {{event_title}} on {{event_date}}",
      body: "Hello {{name}},\n\nWe'd love to see you at {{event_title}} on {{event_date}} at {{event_location}}.\n{{description?}}Details: {{description}}{{/description?}}\n\nPlease reply if you have questions.\n\nUnion Springs Cemetery",
      placeholders: ["name","event_title","event_date","event_location","description"],
      is_active: true
    },
    {
      name: "Event Reminder",
      key: "event_reminder",
      category: "general",
      description: "Reminder for upcoming events",
      subject: "Reminder: {{event_title}} on {{event_date}}",
      body: "Hello {{name}},\n\nJust a reminder about {{event_title}} on {{event_date}} at {{event_location}}.\nWe look forward to seeing you.\n\nUnion Springs Cemetery",
      placeholders: ["name","event_title","event_date","event_location"],
      is_active: true
    },
    {
      name: "Employee Onboarding Reminder",
      key: "employee_onboarding_reminder",
      category: "general",
      description: "Reminds employees to complete onboarding docs",
      subject: "Action needed: Complete onboarding documents",
      body: "Hello {{employee_name}},\n\nThis is a reminder to complete your onboarding documents by {{due_date}}.\nIf you need assistance, reply to this email.\n\nThank you,\nUnion Springs Cemetery",
      placeholders: ["employee_name","due_date"],
      is_active: true
    },
    {
      name: "Document Expiration Notice",
      key: "document_expiration_notice",
      category: "general",
      description: "Notifies about upcoming document expiration",
      subject: "Document expiring: {{document_name}} on {{expiration_date}}",
      body: "Hello {{name}},\n\nThe document '{{document_name}}' is set to expire on {{expiration_date}}.\nPlease update it at your earliest convenience.\n\nThank you,\nUnion Springs Cemetery",
      placeholders: ["name","document_name","expiration_date"],
      is_active: true
    },
    {
      name: "Task Due Soon",
      key: "task_due_soon",
      category: "general",
      description: "Notifies an assignee a task is due soon",
      subject: "Task due soon: {{task_title}} (due {{due_date}})",
      body: "Hello {{assignee_name}},\n\nThe task '{{task_title}}' is due on {{due_date}}.\n{{notes?}}Notes: {{notes}}{{/notes?}}\n\nThank you,\nUnion Springs Cemetery",
      placeholders: ["assignee_name","task_title","due_date","notes"],
      is_active: true
    }
  ];
}