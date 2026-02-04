import React, { useState, useEffect, useCallback, memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Download, Copy, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

// Utility: format bytes
const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return '—';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(val >= 10 ? 0 : 1)} ${sizes[i]}`;
};

function ImageDetailDialog({ image, open, onOpenChange, onOptimized }) {
  const [quality, setQuality] = useState(80);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && image) {
      setQuality(80);
      setLoading(false);
    }
  }, [open, image]);

  if (!image) return null;

  const filename = React.useMemo(() => {
    try {
      const url = new URL(image.original_url);
      return decodeURIComponent(url.pathname.split('/').pop() || 'image');
    } catch {
      return 'image';
    }
  }, [image.original_url]);

  const logUsage = useCallback(async (action) => {
    base44.entities.ImageUsage.create({
      image_id: image.id,
      source: 'ImageDetailDialog',
      action,
      page_or_component: 'ImageDetailDialog',
      referrer: window.location.pathname,
      timestamp: new Date().toISOString(),
    }).catch(() => {});
  }, [image.id]);

  const handleCopy = useCallback(async (text, action) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
      if (action) logUsage(action);
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
        if (action) logUsage(action);
      } catch {
        toast.error('Copy failed');
      }
    }
  }, [logUsage]);

  const handleDownload = useCallback(async (url, out, action) => {
    try {
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
      if (action) logUsage(action);
    } catch {
      toast.error('Download failed');
    }
  }, [logUsage]);

  const copyHTML = useCallback(() => {
    const html = `<picture>\n  <source srcset='${image.webp_url}' type='image/webp' />\n  <img src='${image.jpeg_url}' alt='${(image.alt_text || '').replace(/'/g, "&#39;")}'${(image.width > 0 && image.height > 0) ? ` width='${image.width}' height='${image.height}'` : ''} />\n</picture>`;
    handleCopy(html, 'copy_html');
  }, [image, handleCopy]);

  const reOptimize = useCallback(async (mode) => {
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
  }, [image, quality, onOptimized]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-sm sm:text-base lg:text-lg truncate">{filename}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">View details, copy embeds, and optimize.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-stone-50 border rounded-md p-1.5 sm:p-2">
            <picture>
              <source srcSet={image.webp_url} type="image/webp" />
              <img 
                src={image.jpeg_url} 
                alt={image.alt_text || ''} 
                className="w-full h-40 sm:h-52 lg:h-64 object-contain"
                loading="lazy"
              />
            </picture>
          </div>
          <div className="space-y-3 sm:space-y-4">
            <div className="text-xs sm:text-sm text-stone-700 grid grid-cols-2 gap-1 sm:gap-2">
              <div><span className="font-medium">Dimensions:</span></div>
              <div>{image.width || 0}×{image.height || 0}px</div>
              <div><span className="font-medium">Original:</span></div>
              <div>{formatBytes(image.original_size)}</div>
              <div><span className="font-medium">WebP:</span></div>
              <div>{formatBytes(image.webp_size)}</div>
              <div><span className="font-medium">JPEG:</span></div>
              <div>{formatBytes(image.jpeg_size)}</div>
            </div>

            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <Button variant="outline" size="sm" onClick={() => handleDownload(image.webp_url, `${filename.replace(/\.[^.]+$/, '')}.webp`, 'download_webp')} className="h-7 sm:h-8 text-[10px] sm:text-xs">
                <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1"/> WebP
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDownload(image.jpeg_url, `${filename.replace(/\.[^.]+$/, '')}.jpg`, 'download_jpeg')} className="h-7 sm:h-8 text-[10px] sm:text-xs">
                <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1"/> JPEG
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleCopy(image.webp_url, 'copy_url')} className="h-7 sm:h-8 text-[10px] sm:text-xs">
                <Copy className="w-3 h-3 sm:w-4 sm:h-4 mr-1"/> URL
              </Button>
              <Button variant="outline" size="sm" onClick={copyHTML} className="h-7 sm:h-8 text-[10px] sm:text-xs">
                <Copy className="w-3 h-3 sm:w-4 sm:h-4 mr-1"/> HTML
              </Button>
            </div>

            <div>
              <Label className="text-[10px] sm:text-xs text-stone-500">Compression quality</Label>
              <div className="flex items-center gap-2 sm:gap-3 mt-1">
                <Slider value={[quality]} onValueChange={(v) => setQuality(v[0])} min={1} max={100} step={1} className="w-24 sm:w-32 lg:w-40" />
                <span className="text-[10px] sm:text-xs text-stone-600 w-6">{quality}</span>
              </div>
              <div className="flex gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                <Button size="sm" disabled={loading} onClick={() => reOptimize('overwrite')} className="h-7 sm:h-8 text-[10px] sm:text-xs">
                  {loading ? <Loader2 className="w-3 h-3 animate-spin"/> : 'Re-opt (overwrite)'}
                </Button>
                <Button size="sm" variant="outline" disabled={loading} onClick={() => reOptimize('new')} className="h-7 sm:h-8 text-[10px] sm:text-xs">
                  {loading ? <Loader2 className="w-3 h-3 animate-spin"/> : 'Re-opt as new'}
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

export default memo(ImageDetailDialog);

const UsageSection = memo(function UsageSection({ image, open }) {
  const { data: matches = [], isLoading: scanning } = useQuery({
    queryKey: ['scan-usage', image?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('scanImageUsage', { image_id: image.id });
      return res.data?.matches || [];
    },
    enabled: !!image?.id && open,
    staleTime: 2 * 60_000,
    retry: 1,
  });

  const { data: activity = [] } = useQuery({
    queryKey: ['image-activity', image?.id],
    queryFn: () => base44.entities.ImageUsage.filter({ image_id: image.id }, '-timestamp', 10),
    enabled: !!image?.id && open,
    staleTime: 60_000,
    retry: 1,
  });

  return (
    <div className="mt-2 space-y-2 sm:space-y-3">
      <div>
        <h4 className="text-xs sm:text-sm font-medium">Usage across site</h4>
        {scanning ? (
          <div className="text-[10px] sm:text-xs text-stone-500 mt-1 flex items-center">
            <Loader2 className="w-3 h-3 mr-1 animate-spin"/>Scanning…
          </div>
        ) : matches.length === 0 ? (
          <div className="text-[10px] sm:text-xs text-stone-500 mt-1">No direct references found.</div>
        ) : (
          <ul className="mt-1 space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs max-h-20 overflow-y-auto">
            {matches.slice(0, 5).map((m, i) => (
              <li key={i} className="text-stone-700 truncate">
                <span className="font-medium">{m.entity}</span> #{m.id} {m.label ? `(${m.label})` : ''}
              </li>
            ))}
            {matches.length > 5 && <li className="text-stone-400">+{matches.length - 5} more</li>}
          </ul>
        )}
      </div>

      <div>
        <h4 className="text-xs sm:text-sm font-medium">Recent activity</h4>
        {activity.length === 0 ? (
          <div className="text-[10px] sm:text-xs text-stone-500 mt-1">No recent interactions.</div>
        ) : (
          <ul className="mt-1 space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs max-h-20 overflow-y-auto">
            {activity.slice(0, 5).map((a) => (
              <li key={a.id} className="text-stone-700 truncate">
                {new Date(a.timestamp || a.created_date || Date.now()).toLocaleString()} • {a.action}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
});