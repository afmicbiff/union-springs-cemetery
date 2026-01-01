import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, alt_text = '', quality_jpeg = 85, quality_webp = 80, mode = 'new' } = await req.json();
    if (!file_url) {
      return Response.json({ error: 'Missing file_url' }, { status: 400 });
    }

    const apiKey = Deno.env.get('TINYPNG_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'TinyPNG API key not configured' }, { status: 500 });
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
      const details = await shrinkRes.text();
      return Response.json({ error: 'TinyPNG shrink failed', details }, { status: 502 });
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
      compressed_source_url: compressedUrl,
      source_file_url: file_url
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});