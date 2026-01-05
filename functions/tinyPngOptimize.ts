import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) { return Response.json({ error: 'Unauthorized' }, { status: 401 }); }
    if (user.role !== 'admin') { return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 }); }

    const { file_url, alt_text = '', quality_jpeg = 85, quality_webp = 80, mode = 'new' } = await req.json();
    if (!file_url) {
      return Response.json({ error: 'Missing file_url' }, { status: 400 });
    }

    const apiKey = Deno.env.get('TINYPNG_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'TinyPNG API key not configured' }, { status: 500 });
    }

    // Proactive virus scan using Cloudmersive before processing
    const cmKey = Deno.env.get('CLOUDMERSIVE_API_KEY');
    if (cmKey) {
      const fileRes = await fetch(file_url);
      if (!fileRes.ok) {
        return Response.json({ error: `Failed to fetch file for scanning (${fileRes.status})` }, { status: 400 });
      }
      const buf = new Uint8Array(await fileRes.arrayBuffer());
      const fd = new FormData();
      fd.append('inputFile', new Blob([buf], { type: 'application/octet-stream' }), 'upload.bin');
      const scanRes = await fetch('https://api.cloudmersive.com/virus/scan/file', {
        method: 'POST',
        headers: { 'Apikey': cmKey },
        body: fd
      });
      const scanJson = await scanRes.json().catch(() => ({}));
      const clean = !!scanJson.CleanResult || (scanJson.FoundViruses == null || (Array.isArray(scanJson.FoundViruses) && scanJson.FoundViruses.length === 0));
      if (!clean) {
        const threats = Array.isArray(scanJson.FoundViruses) ? scanJson.FoundViruses.map(v => v.VirusName || v.Name || JSON.stringify(v)) : [];
        try {
          const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || '';
          const ua = req.headers.get('user-agent') || '';
          await base44.asServiceRole.entities.SecurityEvent.create({
            event_type: 'file_upload_blocked',
            severity: 'critical',
            message: `Blocked upload due to threats: ${threats.join(', ')}`,
            ip_address: ip,
            user_agent: ua,
            user_email: user.email,
            route: 'functions/tinyPngOptimize',
            details: { file_url, cloudmersive: scanJson, threats }
          });
          await base44.asServiceRole.entities.Notification.create({
            message: `Security Alert: Blocked infected file upload for user ${user.email}`,
            type: 'alert',
            is_read: false,
            user_email: null,
            related_entity_type: 'document'
          });
        } catch (_e) {}
        return Response.json({ error: 'File blocked due to detected threats', threats }, { status: 403 });
      }
    }

    // 1) Ask TinyPNG to shrink the uploaded file by URL
    const auth = 'Basic ' + btoa(`api:${apiKey}`);
    const shrinkRes = await fetch('https://api.tinify.com/shrink', {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ source: { url: file_url } })
    });

    if (!shrinkRes.ok) {
      // Fallback: TinyPNG couldn't process (unsupported type, etc.) → run our optimizer directly
      const optimizeResp = await base44.functions.invoke('optimizeImage', {
        file_url,
        alt_text,
        quality_jpeg,
        quality_webp,
        mode
      });
      return Response.json({ ...optimizeResp.data, fallback: 'direct_optimize' });
    }

    const shrinkJson = await shrinkRes.json().catch(() => null);
    const headerUrl = shrinkRes.headers.get('Location') || shrinkRes.headers.get('location');
    const compressedUrl = headerUrl || shrinkJson?.output?.url;
    const compressedMime = shrinkJson?.output?.type || 'application/octet-stream';

    if (!compressedUrl) {
      return Response.json({ error: 'TinyPNG did not return a Location header' }, { status: 502 });
    }

    // 2) Download TinyPNG output (requires Authorization) and upload to storage
    const compFetch = await fetch(compressedUrl, { headers: { Authorization: auth } });
    if (!compFetch.ok) {
      const t = await compFetch.text();
      return Response.json({ error: 'Failed to download TinyPNG output', details: t }, { status: 502 });
    }
    const compBuf = new Uint8Array(await compFetch.arrayBuffer());

    const ext = compressedMime.includes('png') ? '.png' : (compressedMime.includes('jpeg') ? '.jpg' : '.img');
    const filename = `compressed-${Date.now()}${ext}`;
    const compressedFile = new File([compBuf], filename, { type: compressedMime });
    const upload = await base44.integrations.Core.UploadFile({ file: compressedFile });
    const compressedFileUrl = upload?.file_url;
    if (!compressedFileUrl) {
      return Response.json({ error: 'Failed to upload compressed file' }, { status: 500 });
    }

    // 3) Optimize variants using our existing function with a public URL
    const optimizeResp = await base44.functions.invoke('optimizeImage', {
      file_url: compressedFileUrl,
      alt_text,
      quality_jpeg,
      quality_webp,
      mode
    });

    return Response.json({
      ...optimizeResp.data,
      tiny_png_output_url: compressedUrl,
      compressed_file_url: compressedFileUrl,
      source_file_url: file_url
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});