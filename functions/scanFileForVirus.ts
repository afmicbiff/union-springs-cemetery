import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const API_KEY = Deno.env.get('CLOUDMERSIVE_API_KEY');

async function scanFileFromUri(base44, fileUri, context, user, req) {
  if (!API_KEY) throw new Error('Cloudmersive API key not configured');

  // Create short-lived signed URL to fetch the file bytes
  const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 120 });
  if (!signed_url) throw new Error('Failed to generate signed URL for file');

  const fileRes = await fetch(signed_url);
  if (!fileRes.ok) throw new Error(`Failed to fetch file for scanning: ${fileRes.status}`);
  const fileBuf = new Uint8Array(await fileRes.arrayBuffer());

  // Build multipart/form-data payload for Cloudmersive
  const fd = new FormData();
  // Cloudmersive expects parameter name "inputFile"
  fd.append('inputFile', new Blob([fileBuf]), 'file.bin');

  const scanRes = await fetch('https://api.cloudmersive.com/virus/scan/file', {
    method: 'POST',
    headers: { 'Apikey': API_KEY },
    body: fd
  });

  const scanJson = await scanRes.json().catch(() => ({}));
  const clean = !!scanJson.CleanResult || (scanJson.FoundViruses == null || (Array.isArray(scanJson.FoundViruses) && scanJson.FoundViruses.length === 0));
  const threats = Array.isArray(scanJson.FoundViruses) ? scanJson.FoundViruses.map(v => v.VirusName || v.Name || JSON.stringify(v)) : [];

  const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || '';
  const ua = req.headers.get('user-agent') || '';

  // Log SecurityEvent
  try {
    await base44.asServiceRole.entities.SecurityEvent.create({
      event_type: 'file_scan',
      severity: clean ? 'info' : 'critical',
      message: clean ? `File scan clean (${context || 'unspecified'})` : `Threats detected: ${threats.join(', ')}`,
      ip_address: ip,
      user_agent: ua,
      user_email: user?.email || null,
      route: 'functions/scanFileForVirus',
      details: { context, file_uri: fileUri, cloudmersive: scanJson, threats }
    });
  } catch (_e) {}

  return { clean, threats, raw: scanJson };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_uri, context } = await req.json();
    if (!file_uri) return Response.json({ error: 'file_uri required' }, { status: 400 });

    const result = await scanFileFromUri(base44, file_uri, context || 'general', user, req);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});