import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Download, Copy, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

export default function ImageDetailDialog({ image, open, onOpenChange, onOptimized }) {
  const [quality, setQuality] = React.useState(80);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open && image) {
      setQuality(80);
      setLoading(false);
    }
  }, [open, image]);

  if (!image) return null;

  const filename = (() => {
    try {
      const url = new URL(image.original_url);
      return decodeURIComponent(url.pathname.split('/').pop() || 'image');
    } catch {
      return 'image';
    }
  })();

  const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return '—';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const val = bytes / Math.pow(1024, i);
    return `${val.toFixed(val >= 10 ? 0 : 1)} ${sizes[i]}`;
  };

  const logUsage = async (action, note) => {
    await base44.entities.ImageUsage.create({
      image_id: image.id,
      source: 'ImageDetailDialog',
      action,
      page_or_component: 'ImageDetailDialog',
      referrer: window.location.pathname,
      note: note || null,
      timestamp: new Date().toISOString(),
    });
  };

  const handleCopy = async (text, action) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
      if (action) { try { await logUsage(action); } catch {} }
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        toast.success('Copied to clipboard');
      if (action) { try { await logUsage(action); } catch {} }
      } catch (e) {
        toast.error('Copy failed');
      }
    }
  };

  const handleDownload = async (url, out, action) => {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = out;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
    if (action) { try { await logUsage(action); } catch {} }
  };

  const copyHTML = () => {
    const html = `<picture>\n  <source srcset='${image.webp_url}' type='image/webp' />\n  <img src='${image.jpeg_url}' alt='${(image.alt_text || '').replace(/'/g, "&#39;")}'${(image.width>0&&image.height>0)?` width='${image.width}' height='${image.height}'`:''} />\n</picture>`;
    handleCopy(html, 'copy_html');
  };

  const reOptimize = async (mode) => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('optimizeImage', {
        file_url: image.original_url,
        alt_text: image.alt_text || '',
        quality_jpeg: quality,
        quality_webp: quality,
        mode,
        image_id: image.id,
      });
      if (res?.data?.error) throw new Error(res.data.error);
      toast.success('Image optimized');
      onOptimized?.();
    } catch (e) {
      toast.error(`Optimization failed${e?.message ? `: ${e.message}` : ''}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="truncate">{filename}</span>
          </DialogTitle>
          <DialogDescription>View details, copy embeds, and optimize this image.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-stone-50 border rounded-md p-2">
            <picture>
              <source srcSet={image.webp_url} type="image/webp" />
              <img src={image.jpeg_url} alt={image.alt_text || ''} className="w-full h-64 object-contain"/>
            </picture>
          </div>
          <div className="space-y-4">
            <div className="text-sm text-stone-700">
              <div><span className="font-medium">Dimensions:</span> {image.width || 0}×{image.height || 0}px</div>
              <div><span className="font-medium">Original size:</span> {formatBytes(image.original_size)}</div>
              <div><span className="font-medium">WebP size:</span> {formatBytes(image.webp_size)}</div>
              <div><span className="font-medium">JPEG size:</span> {formatBytes(image.jpeg_size)}</div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => handleDownload(image.webp_url, `${filename.replace(/\.[^.]+$/, '')}.webp`)}>
                <Download className="w-4 h-4 mr-1"/> Download WebP
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDownload(image.jpeg_url, `${filename.replace(/\.[^.]+$/, '')}.jpg`)}>
                <Download className="w-4 h-4 mr-1"/> Download JPEG
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleCopy(image.webp_url)}>
                <Copy className="w-4 h-4 mr-1"/> Copy WebP URL
              </Button>
              <Button variant="outline" size="sm" onClick={copyHTML}>
                <Copy className="w-4 h-4 mr-1"/> Copy HTML
              </Button>
            </div>

            <div>
              <Label className="text-xs text-stone-500">Compression quality</Label>
              <div className="flex items-center gap-3 mt-1">
                <Slider value={[quality]} onValueChange={(v)=> setQuality(v[0])} min={1} max={100} step={1} className="w-40" />
                <span className="text-xs text-stone-600">{quality}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" disabled={loading} onClick={() => reOptimize('overwrite')}>
                  {loading ? (<><Loader2 className="w-4 h-4 mr-1 animate-spin"/> Optimizing…</>) : 'Re‑optimize (overwrite)'}
                </Button>
                <Button size="sm" variant="outline" disabled={loading} onClick={() => reOptimize('new')}>
                  {loading ? (<><Loader2 className="w-4 h-4 mr-1 animate-spin"/> Optimizing…</>) : 'Re‑optimize as new'}
                </Button>
              </div>
            </div>
            <UsageSection image={image} open={open} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}