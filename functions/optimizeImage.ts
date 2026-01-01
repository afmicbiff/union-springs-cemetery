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
    if (!fileUrl) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    // Download original image
    const res = await fetch(fileUrl);
    if (!res.ok) {
      return Response.json({ error: `Failed to fetch original image (${res.status})` }, { status: 400 });
    }
    const input = new Uint8Array(await res.arrayBuffer());

    // Use Cloudmersive API for conversion (works on this platform)
    const apiKey = Deno.env.get('CLOUDMERSIVE_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Cloudmersive API key not configured' }, { status: 500 });
    }

    async function convert(endpoint) {
      const form = new FormData();
      form.append('imageFile', new Blob([input], { type: 'application/octet-stream' }), 'upload.bin');
      const r = await fetch(`https://api.cloudmersive.com/image/convert/${endpoint}`, {
        method: 'POST',
        headers: { 'Apikey': apiKey },
        body: form
      });
      if (!r.ok) {
        throw new Error(`Cloudmersive ${endpoint} failed (${r.status})`);
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

    // We don't reliably have dimensions here; store 0 as placeholder
    const imageRecord = await base44.entities.Image.create({
      original_url: fileUrl,
      jpeg_url,
      webp_url,
      alt_text: altText,
      width: 0,
      height: 0,
      original_size: originalSize,
      jpeg_size: jpegSize,
      webp_size: webpSize,
    });

    return Response.json({
      message: 'Image optimized successfully',
      image: imageRecord,
    });
  } catch (error) {
    return Response.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
});