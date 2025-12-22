import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function renderTemplate(tpl, ctx) {
  if (!tpl) return '';
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (ctx[k] ?? ''));
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Load active rules
    const rules = await base44.entities.CRMAutomationRule.filter({ is_active: true });
    const members = await base44.entities.Member.list({ limit: 1000 });

    const actionsSummary = [];

    for (const rule of rules) {
      const matched = [];
      if (rule.trigger_type === 'interest_match') {
        const keys = (rule.interest_keywords || []).map((s) => String(s).toLowerCase());
        if (keys.length === 0) continue;
        for (const m of members) {
          const interests = (m.interests || []).map((s) => String(s).toLowerCase());
          const hit = interests.find((x) => keys.includes(x));
          if (hit) matched.push({ member: m, interest: hit });
        }
      } else if (rule.trigger_type === 'inactivity') {
        const days = rule.inactivity_days || 30;
        const cutoff = addDays(new Date(), -days);
        for (const m of members) {
          const last = m.last_contact_date ? new Date(m.last_contact_date) : null;
          if (!last || last < cutoff) matched.push({ member: m });
        }
      }

      let emailTpl = null;
      if ((rule.actions || []).includes('send_email') && rule.email_template_id) {
        const arr = await base44.entities.EmailTemplate.filter({ id: rule.email_template_id });
        emailTpl = arr && arr[0] ? arr[0] : null;
      }

      for (const item of matched) {
        const m = item.member;
        const ctx = {
          first_name: m.first_name || '',
          last_name: m.last_name || '',
          member_name: `${m.first_name || ''} ${m.last_name || ''}`.trim(),
          interest: item.interest || '',
          email: (rule.email_recipient === 'secondary' ? m.email_secondary : m.email_primary) || ''
        };

        // Create Task
        if ((rule.actions || []).includes('create_task')) {
          const title = renderTemplate(rule.task_title_template || '', ctx);
          const description = renderTemplate(rule.task_description_template || '', ctx);
          const due = addDays(new Date(), rule.task_due_in_days || 3).toISOString().slice(0, 10);
          await base44.entities.Task.create({
            title,
            description,
            due_date: due,
            assignee_id: rule.task_assignee_id || null,
            status: 'To Do',
            priority: 'Medium'
          });
          actionsSummary.push({ type: 'task', member_id: m.id, title });
        }

        // Send Email
        if ((rule.actions || []).includes('send_email') && emailTpl && ctx.email) {
          const subject = renderTemplate(rule.email_subject_template || emailTpl.subject || 'Follow up', ctx);
          const body = renderTemplate(emailTpl.body || '', ctx);
          await base44.asServiceRole.functions.invoke('sendEmail', {
            to: ctx.email,
            subject,
            body,
            from_name: 'Union Springs CRM'
          });
          actionsSummary.push({ type: 'email', member_id: m.id, to: ctx.email, subject });
        }
      }
    }

    return Response.json({ success: true, actions: actionsSummary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});