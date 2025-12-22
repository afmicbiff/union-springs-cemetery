import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Proceed regardless of auth to support system-triggered emails (admin UI already gated)

    const { to, subject, body } = await req.json();
    if (!to || !subject || !body) {
      return Response.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    const apiKey = Deno.env.get('SENDGRID_API_KEY');
    const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL');
    const fromName = Deno.env.get('SENDGRID_FROM_NAME') || 'Union Springs';

    if (!apiKey || !fromEmail) {
      return Response.json({ error: 'SendGrid not configured' }, { status: 500 });
    }

    const payload = {
      personalizations: [
        {
          to: [{ email: String(to).trim() }],
        },
      ],
      from: { email: fromEmail, name: fromName },
      subject: String(subject),
      content: [
        {
          type: 'text/plain',
          value: String(body),
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