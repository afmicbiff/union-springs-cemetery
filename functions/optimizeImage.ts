import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import sharp from 'npm:sharp@0.33.4';

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
    const arrBuf = await res.arrayBuffer();
    const input = new Uint8Array(arrBuf);

    // Read metadata for dimensions
    const meta = await sharp(input).metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;

    // Generate JPEG (quality 80, mozjpeg)
    const jpegBuffer = await sharp(input).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    // Generate WebP (quality 80)
    const webpBuffer = await sharp(input).webp({ quality: 80 }).toBuffer();

    // Upload optimized files back to storage
    const jpegFile = new File([jpegBuffer], `img-${Date.now()}.jpg`, { type: 'image/jpeg' });
    const webpFile = new File([webpBuffer], `img-${Date.now()}.webp`, { type: 'image/webp' });

    const uploadedJpeg = await base44.integrations.Core.UploadFile({ file: jpegFile });
    const uploadedWebp = await base44.integrations.Core.UploadFile({ file: webpFile });

    const jpeg_url = uploadedJpeg?.file_url;
    const webp_url = uploadedWebp?.file_url;
    if (!jpeg_url || !webp_url) {
      return Response.json({ error: 'Failed to upload optimized images' }, { status: 500 });
    }

    // Persist in Image entity
    const imageRecord = await base44.entities.Image.create({
      original_url: fileUrl,
      jpeg_url,
      webp_url,
      alt_text: altText,
      width,
      height,
    });

    return Response.json({
      message: 'Image optimized successfully',
      image: imageRecord,
    });
  } catch (error) {
    return Response.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
});