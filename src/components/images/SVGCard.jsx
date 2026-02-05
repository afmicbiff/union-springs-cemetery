import React, { memo, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Copy, Trash2, ExternalLink, Code } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Utility: format bytes
const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(val >= 10 ? 0 : 1)} ${sizes[i]}`;
};

const SVGCard = memo(function SVGCard({ 
  img, 
  altEdit, 
  onAltChange, 
  onSaveAlt, 
  onCopy, 
  onDelete 
}) {
  const [showCode, setShowCode] = useState(false);
  const [svgCode, setSvgCode] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);

  const handleAltChange = useCallback((e) => onAltChange(img.id, e.target.value), [img.id, onAltChange]);
  const handleSaveAlt = useCallback(() => onSaveAlt(img.id, altEdit), [img.id, altEdit, onSaveAlt]);
  const handleCopyUrl = useCallback(() => onCopy(img.svg_url || img.original_url, img.id), [img.svg_url, img.original_url, img.id, onCopy]);
  const handleDelete = useCallback(() => onDelete(img.id), [img.id, onDelete]);

  const svgUrl = img.svg_url || img.original_url;

  const handleDownload = useCallback(async () => {
    try {
      const res = await fetch(svgUrl);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `image-${img.id}.svg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error('Download failed');
    }
  }, [svgUrl, img.id]);

  const handleViewCode = useCallback(async () => {
    setLoadingCode(true);
    try {
      const res = await fetch(svgUrl);
      const text = await res.text();
      setSvgCode(text);
      setShowCode(true);
    } catch {
      toast.error('Failed to load SVG code');
    } finally {
      setLoadingCode(false);
    }
  }, [svgUrl]);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(svgCode);
      toast.success('SVG code copied');
    } catch {
      toast.error('Copy failed');
    }
  }, [svgCode]);

  return (
    <>
      <div className="border rounded-md bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="bg-stone-50 p-1.5 sm:p-2 relative">
          {/* SVG badge */}
          <div className="absolute top-2 right-2 bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
            SVG
          </div>
          <img 
            src={svgUrl} 
            alt={img.alt_text || 'SVG Image'} 
            className="w-full h-32 sm:h-40 lg:h-48 object-contain rounded bg-white" 
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="p-2 sm:p-3 space-y-2 sm:space-y-3 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Input 
              value={altEdit} 
              onChange={handleAltChange} 
              placeholder="Alt text" 
              className="h-7 sm:h-8 text-xs sm:text-sm flex-1" 
              maxLength={200}
              aria-label="Image alt text"
            />
            <Button size="sm" variant="secondary" className="h-7 sm:h-8 px-2 text-xs" onClick={handleSaveAlt}>Save</Button>
          </div>
          
          {(img.width > 0 && img.height > 0) && (
            <div className="text-stone-500 text-[10px] sm:text-xs">
              ViewBox: {img.width}×{img.height}
            </div>
          )}
          
          <div className="text-[10px] sm:text-xs text-stone-600">
            <span className="font-medium text-stone-700">Size:</span> {formatBytes(img.original_size) || '—'}
          </div>

          <div className="flex flex-wrap gap-1 sm:gap-1.5 pt-1 sm:pt-2">
            <Button variant="outline" size="sm" onClick={handleViewCode} disabled={loadingCode} className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs">
              <Code className="w-3 h-3 mr-0.5"/> Code
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs">
              <Download className="w-3 h-3 mr-0.5"/> SVG
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyUrl} className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs">
              <Copy className="w-3 h-3 mr-0.5"/> URL
            </Button>
            <Button variant="outline" size="sm" asChild className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs">
              <a href={svgUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3 h-3 mr-0.5"/> Open
              </a>
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs">
              <Trash2 className="w-3 h-3"/>
            </Button>
          </div>
        </div>
      </div>

      {/* SVG Code Dialog */}
      <Dialog open={showCode} onOpenChange={setShowCode}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="w-4 h-4" /> SVG Code
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={handleCopyCode} className="h-7 text-xs">
                <Copy className="w-3 h-3 mr-1" /> Copy Code
              </Button>
            </div>
            <pre className="bg-stone-900 text-stone-100 p-3 rounded-md text-xs overflow-auto max-h-[50vh] whitespace-pre-wrap break-all">
              {svgCode}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

export default SVGCard;