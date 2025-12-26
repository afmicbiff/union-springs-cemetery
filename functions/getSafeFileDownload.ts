import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const API_KEY = Deno.env.get('CLOUDMERSIVE_API_KEY');

async function scan(base44, fileUri) {
  // Create short-lived signed URL and stream to Cloudmersive
  const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 120 });
  const fileRes = await fetch(signed_url);
  const fileBuf = new Uint8Array(await fileRes.arrayBuffer());
  const fd = new FormData();
  fd.append('inputFile', new Blob([fileBuf]), 'file.bin');
  const scanRes = await fetch('https://api.cloudmersive.com/virus/scan/file', { method: 'POST', headers: { 'Apikey': API_KEY }, body: fd });
  const scanJson = await scanRes.json().catch(() => ({}));
  const clean = !!scanJson.CleanResult || (scanJson.FoundViruses == null || (Array.isArray(scanJson.FoundViruses) && scanJson.FoundViruses.length === 0));
  const threats = Array.isArray(scanJson.FoundViruses) ? scanJson.FoundViruses.map(v => v.VirusName || v.Name || JSON.stringify(v)) : [];
  return { clean, threats, scanJson };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!API_KEY) return Response.json({ error: 'Cloudmersive API key not configured' }, { status: 500 });

    const { file_uri } = await req.json();
    if (!file_uri) return Response.json({ error: 'file_uri required' }, { status: 400 });

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || '';
    const ua = req.headers.get('user-agent') || '';

    const { clean, threats, scanJson } = await scan(base44, file_uri);

    if (!clean) {
      // Log event
      try {
        await base44.asServiceRole.entities.SecurityEvent.create({
          event_type: 'file_download_blocked',
          severity: 'critical',
          message: `Blocked download due to threats: ${threats.join(', ')}`,
          ip_address: ip,
          user_agent: ua,
          user_email: user.email,
          route: 'functions/getSafeFileDownload',
          details: { file_uri, cloudmersive: scanJson, threats }
        });

        // Notify admins (system-wide notification)
        await base44.asServiceRole.entities.Notification.create({
          message: `Security Alert: Blocked infected file download for user ${user.email}`,
          type: 'alert',
          is_read: false,
          user_email: null,
          related_entity_type: 'document'
        });

        // Optional email to configured recipients in NotificationSettings
        const settings = await base44.asServiceRole.entities.NotificationSettings.list();
        const emails = Array.isArray(settings?.[0]?.email_recipients) ? settings[0].email_recipients : [];
        for (const to of emails) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to,
              subject: 'Security Alert: Infected file download blocked',
              body: `The system blocked a file download.\nUser: ${user.email}\nThreats: ${threats.join(', ')}\nTime: ${new Date().toISOString()}`
            });
          } catch (_) {}
        }
      } catch (_e) {}

      return Response.json({ error: 'File blocked due to detected threats', threats }, { status: 403 });
    }

    // Clean: provide signed URL for the client
    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 300 });
    return Response.json({ signed_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});