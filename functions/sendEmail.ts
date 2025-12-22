import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Proceed regardless of auth to support system-triggered emails (admin UI already gated)

    function renderTemplate(str, vars) {
      let s = String(str || '');
      // Conditional blocks: {{var?}}...{{/var?}}
      s = s.replace(/\{\{\s*([a-zA-Z0-9_\.]+)\?\s*\}\}([\s\S]*?)\{\{\/\s*\1\?\s*\}\}/g, (_, k, inner) => (vars && vars[k] ? inner : ''));
      // Simple placeholders: {{var}}
      return s.replace(/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g, (_, k) => (vars && vars[k] != null ? String(vars[k]) : ''));
    }

    const payloadIn = await req.json();
    const { to, subject, body, template_id, template_key, variables, from_name } = payloadIn || {};
    if (!to || ((!subject || !body) && (!template_id && !template_key))) {
      return Response.json({ error: 'Missing fields: provide subject and body, or a template_id/template_key with variables' }, { status: 400 });
    }

    const apiKey = Deno.env.get('SENDGRID_API_KEY');
          const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL');
          const defaultFromName = Deno.env.get('SENDGRID_FROM_NAME') || 'Union Springs';
          const vars = variables || {};
          let finalSubject = subject || '';
          let finalBody = body || '';
          if ((!finalSubject || !finalBody) && (template_id || template_key)) {
            let tpl = null;
            if (template_id) {
              const arr = await base44.asServiceRole.entities.EmailTemplate.filter({ id: template_id });
              tpl = arr?.[0] || null;
            } else if (template_key) {
              const arr = await base44.asServiceRole.entities.EmailTemplate.filter({ key: template_key }, '-updated_date', 1);
              tpl = arr?.[0] || null;
            }
            if (!tpl) {
              return Response.json({ error: 'Template not found' }, { status: 404 });
            }
            if (tpl.is_active === false) {
              return Response.json({ error: 'Template inactive' }, { status: 400 });
            }
            finalSubject = renderTemplate(String(tpl.subject || ''), vars);
            finalBody = renderTemplate(String(tpl.body || ''), vars);
          }
          const effectiveFromName = from_name || defaultFromName;

    if (!apiKey || !fromEmail) {
      return Response.json({ error: 'SendGrid not configured' }, { status: 500 });
    }

    const payload = {
      personalizations: [
        {
          to: [{ email: String(to).trim() }],
        },
      ],
      from: { email: fromEmail, name: effectiveFromName },
      subject: String(finalSubject),
      content: [
        {
          type: 'text/plain',
          value: String(finalBody),
        },
      ],
    };

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json({ success: false, provider: 'sendgrid', status: res.status, details: text });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});