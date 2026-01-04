import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const fileUrl = payload?.file_url;
    const altText = payload?.alt_text || '';
    const qualityJpeg = Math.min(100, Math.max(1, Number(payload?.quality_jpeg || 85)));
    const qualityWebp = Math.min(100, Math.max(1, Number(payload?.quality_webp || 80)));
    const mode = (payload?.mode === 'overwrite') ? 'overwrite' : 'new';
    const imageId = payload?.image_id || null;
    if (!fileUrl) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    // Download original image
    const res = await fetch(fileUrl);
    if (!res.ok) {
      return Response.json({ error: `Failed to fetch original image (${res.status})` }, { status: 400 });
    }
    const input = new Uint8Array(await res.arrayBuffer());

    // Proactive virus scan using Cloudmersive before processing
    const cmKey = Deno.env.get('CLOUDMERSIVE_API_KEY');
    if (!cmKey) {
      return Response.json({ error: 'Cloudmersive API key not configured' }, { status: 500 });
    }
    const scanForm = new FormData();
    scanForm.append('inputFile', new Blob([input], { type: 'application/octet-stream' }), 'upload.bin');
    const scanRes = await fetch('https://api.cloudmersive.com/virus/scan/file', { method: 'POST', headers: { 'Apikey': cmKey }, body: scanForm });
    const scanJson = await scanRes.json().catch(() => ({}));
    const clean = !!scanJson.CleanResult || (scanJson.FoundViruses == null || (Array.isArray(scanJson.FoundViruses) && scanJson.FoundViruses.length === 0));
    if (!clean) {
      const threats = Array.isArray(scanJson.FoundViruses) ? scanJson.FoundViruses.map(v => v.VirusName || v.Name || JSON.stringify(v)) : [];
      try {
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || '';
        const ua = req.headers.get('user-agent') || '';
        await base44.asServiceRole.entities.SecurityEvent.create({
          event_type: 'image_optimize_blocked',
          severity: 'critical',
          message: `Blocked optimize due to threats: ${threats.join(', ')}`,
          ip_address: ip,
          user_agent: ua,
          user_email: user.email,
          route: 'functions/optimizeImage',
          details: { file_url: fileUrl, cloudmersive: scanJson, threats }
        });
        await base44.asServiceRole.entities.Notification.create({
          message: `Security Alert: Blocked infected image processing for ${user.email}`,
          type: 'alert',
          is_read: false,
          user_email: null,
          related_entity_type: 'document'
        });
      } catch (_e) {}
      return Response.json({ error: 'File blocked due to detected threats', threats }, { status: 403 });
    }

    // Use Cloudmersive API for conversion (works on this platform)
    const apiKey = Deno.env.get('CLOUDMERSIVE_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Cloudmersive API key not configured' }, { status: 500 });
    }

    async function convert(endpointBase, _quality) {
      const form = new FormData();
      form.append('imageFile', new Blob([input], { type: 'application/octet-stream' }), 'upload.bin');
      const endpoint = endpointBase; // Use default quality; some endpoints do not accept path quality
      const r = await fetch(`https://api.cloudmersive.com/image/convert/${endpoint}`, {
        method: 'POST',
        headers: { 'Apikey': apiKey },
        body: form
      });
      if (!r.ok) {
        const text = await r.text().catch(()=> '');
        throw new Error(`Cloudmersive ${endpoint} failed (${r.status}) ${text}`);
      }
      const ab = await r.arrayBuffer();
      return new Uint8Array(ab);
    }

    const [jpegBytes, webpBytes] = await Promise.all([
      convert('to/jpg'),
      convert('to/webp')
    ]);

    const originalSize = input.byteLength;
    const jpegSize = jpegBytes.byteLength;
    const webpSize = webpBytes.byteLength;

    // Upload optimized files back to storage
    const jpegFile = new File([jpegBytes], `img-${Date.now()}.jpg`, { type: 'image/jpeg' });
    const webpFile = new File([webpBytes], `img-${Date.now()}.webp`, { type: 'image/webp' });

    const uploadedJpeg = await base44.integrations.Core.UploadFile({ file: jpegFile });
    const uploadedWebp = await base44.integrations.Core.UploadFile({ file: webpFile });

    const jpeg_url = uploadedJpeg?.file_url;
    const webp_url = uploadedWebp?.file_url;
    if (!jpeg_url || !webp_url) {
      return Response.json({ error: 'Failed to upload optimized images' }, { status: 500 });
    }

    // Attempt to read basic dimensions via browser Image decoder substitute (optional best-effort)
    let width = 0, height = 0;
    try {
      // Use Web Image Decoder in future; for now, keep placeholders
      width = 0; height = 0;
    } catch {}


    // We don't reliably have dimensions here; store 0 as placeholder
    let imageRecord;
    if (mode === 'overwrite' && imageId) {
      imageRecord = await base44.entities.Image.update(imageId, {
        original_url: fileUrl,
        jpeg_url,
        webp_url,
        alt_text: altText,
        width,
        height,
        original_size: originalSize,
        jpeg_size: jpegSize,
        webp_size: webpSize,
      });
    } else {
      imageRecord = await base44.entities.Image.create({
        original_url: fileUrl,
        jpeg_url,
        webp_url,
        alt_text: altText,
        width,
        height,
        original_size: originalSize,
        jpeg_size: jpegSize,
        webp_size: webpSize,
      });
    }

    return Response.json({
      message: 'Image optimized successfully',
      image: imageRecord,
    });
  } catch (error) {
    return Response.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
});