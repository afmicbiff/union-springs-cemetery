import React, { useState, useMemo, useCallback, memo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Image as ImageIcon, Loader2, Download, Copy, Trash2, RefreshCw, AlertCircle, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import ImageDetailDialog from '@/components/images/ImageDetailDialog';
import SVGCard from '@/components/images/SVGCard';

// Utility: format bytes
const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(val >= 10 ? 0 : 1)} ${sizes[i]}`;
};

// Memoized Image Card - optimized for mobile performance
const ImageCard = memo(function ImageCard({ 
  img, altEdit, onAltChange, onSaveAlt, quality, onQualityChange, 
  reoptLoading, onReOptimize, onDownload, onCopy, onDelete, onOpenDetails 
}) {
  // Memoize handlers to prevent re-renders
  const handleAltChange = useCallback((e) => onAltChange(img.id, e.target.value), [img.id, onAltChange]);
  const handleSaveAlt = useCallback(() => onSaveAlt(img.id, altEdit), [img.id, altEdit, onSaveAlt]);
  const handleQualityChange = useCallback((v) => onQualityChange(img.id, v[0]), [img.id, onQualityChange]);
  const handleReOptimize = useCallback(() => onReOptimize(img, 'overwrite'), [img, onReOptimize]);
  const handleOpenDetails = useCallback(() => onOpenDetails(img), [img, onOpenDetails]);
  const handleDownload = useCallback(() => onDownload(img.webp_url, `image-${img.id}.webp`), [img.webp_url, img.id, onDownload]);
  const handleCopyUrl = useCallback(() => onCopy(img.webp_url, img.id), [img.webp_url, img.id, onCopy]);
  const handleDelete = useCallback(() => onDelete(img.id), [img.id, onDelete]);

  // Compute aspect ratio for CLS prevention
  const aspectRatio = (img.width > 0 && img.height > 0) 
    ? `${img.width} / ${img.height}` 
    : '4 / 3';

  return (
    <div className="border rounded-md bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="bg-stone-50 p-1.5 sm:p-2">
        <picture>
          <source srcSet={img.webp_url} type="image/webp" />
          <img 
            src={img.jpeg_url} 
            alt={img.alt_text || 'Image'} 
            className="w-full h-32 sm:h-40 lg:h-48 object-cover rounded" 
            loading="lazy"
            decoding="async"
            width={img.width || 320}
            height={img.height || 240}
            style={{ aspectRatio, contentVisibility: 'auto' }}
          />
        </picture>
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
          <div className="text-stone-500 text-[10px] sm:text-xs">{img.width}×{img.height}px</div>
        )}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-stone-600">
          <div><span className="font-medium text-stone-700">Orig:</span> {formatBytes(img.original_size) || '—'}</div>
          <div><span className="font-medium text-stone-700">WebP:</span> {formatBytes(img.webp_size) || '—'}</div>
          <div><span className="font-medium text-stone-700">JPEG:</span> {formatBytes(img.jpeg_size) || '—'}</div>
        </div>
        <div className="pt-1">
          <Label className="text-[10px] sm:text-xs text-stone-500">Quality</Label>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Slider 
              value={[quality]} 
              onValueChange={handleQualityChange} 
              min={1} max={100} step={1} 
              className="w-20 sm:w-32 lg:w-40 touch-pan-x" 
              aria-label="Compression quality"
            />
            <span className="text-[10px] sm:text-xs text-stone-600 w-6 tabular-nums">{quality}</span>
            <Button 
              size="sm" 
              className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs min-w-[52px]" 
              disabled={reoptLoading} 
              onClick={handleReOptimize}
            >
              {reoptLoading ? <Loader2 className="w-3 h-3 animate-spin"/> : 'Re-opt'}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 sm:gap-1.5 pt-1 sm:pt-2">
          <Button variant="outline" size="sm" onClick={handleOpenDetails} className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs">Details</Button>
          <Button variant="outline" size="sm" onClick={handleDownload} className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs">
            <Download className="w-3 h-3 mr-0.5"/> WebP
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyUrl} className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs">
            <Copy className="w-3 h-3 mr-0.5"/> URL
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs">
            <Trash2 className="w-3 h-3"/>
          </Button>
        </div>
      </div>
    </div>
  );
});

function ImageManager() {
  const qc = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me().catch(() => null),
    staleTime: 5 * 60_000,
  });

  const { data: images = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['images'],
    queryFn: () => base44.entities.Image.list('-updated_date', 200),
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const [file, setFile] = useState(null);
  const [alt, setAlt] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [qualityJpeg, setQualityJpeg] = useState(85);
  const [qualityWebp, setQualityWebp] = useState(80);

  const [filters, setFilters] = useState({
    originalType: 'all',
    sizeMinKB: '',
    sizeMaxKB: '',
    widthMin: '',
    widthMax: '',
    heightMin: '',
    heightMax: ''
  });
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  const [altEdits, setAltEdits] = useState({});
  const [perImageQuality, setPerImageQuality] = useState({});
  const [reoptLoading, setReoptLoading] = useState({});
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const uploaded = await base44.integrations.Core.UploadFile({ file });
      const file_url = uploaded?.file_url;
      if (!file_url) throw new Error('Upload failed');
      await base44.functions.invoke('tinyPngOptimize', { file_url, alt_text: alt, quality_jpeg: qualityJpeg, quality_webp: qualityWebp, mode: 'new' });
      setFile(null);
      setAlt('');
      toast.success('Image uploaded & optimized');
      qc.invalidateQueries({ queryKey: ['images'] });
    } catch (err) {
      toast.error('Upload failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
    }
  }, [file, alt, qualityJpeg, qualityWebp, qc]);

  const handleDownload = useCallback(async (url, filename) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error('Download failed');
    }
  }, []);

  const handleCopy = useCallback(async (text, imageId) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
      if (imageId) {
        base44.entities.ImageUsage.create({
          image_id: imageId,
          source: 'ImageManager',
          action: 'copy_url',
          page_or_component: 'ImageManager',
          referrer: window.location.pathname,
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      }
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
      } catch {
        toast.error('Copy failed');
      }
    }
  }, []);

  const updateAlt = useCallback(async (id, newAlt) => {
    try {
      await base44.entities.Image.update(id, { alt_text: newAlt || '' });
      toast.success('Alt text saved');
      qc.invalidateQueries({ queryKey: ['images'] });
    } catch {
      toast.error('Failed to save alt text');
    }
  }, [qc]);

  const handleAltChange = useCallback((id, value) => {
    setAltEdits(prev => ({ ...prev, [id]: value }));
  }, []);

  const handleQualityChange = useCallback((id, value) => {
    setPerImageQuality(prev => ({ ...prev, [id]: value }));
  }, []);

  const reOptimize = useCallback(async (img, mode) => {
    const q = perImageQuality[img.id] ?? 80;
    setReoptLoading(prev => ({ ...prev, [img.id]: true }));
    try {
      const res = await base44.functions.invoke('optimizeImage', {
        file_url: img.original_url,
        alt_text: img.alt_text || '',
        quality_jpeg: q,
        quality_webp: q,
        mode,
        image_id: img.id
      });
      if (res?.data?.error) throw new Error(res.data.error);
      toast.success('Image re-optimized');
      qc.invalidateQueries({ queryKey: ['images'] });
    } catch (err) {
      toast.error(`Re-optimization failed${err?.message ? `: ${err.message}` : ''}`);
    } finally {
      setReoptLoading(prev => ({ ...prev, [img.id]: false }));
    }
  }, [perImageQuality, qc]);

  const deleteImage = useCallback(async (id) => {
    if (!window.confirm('Delete this image from the library?')) return;
    try {
      await base44.entities.Image.delete(id);
      toast.success('Image deleted');
      qc.invalidateQueries({ queryKey: ['images'] });
    } catch {
      toast.error('Failed to delete image');
    }
  }, [qc]);

  const openDetails = useCallback((img) => {
    setSelectedImage(img);
    setDetailOpen(true);
  }, []);

  const displayed = useMemo(() => {
    const getExt = (url) => {
      try {
        const u = String(url || '').toLowerCase();
        const q = u.split('?')[0];
        return q.substring(q.lastIndexOf('.') + 1) || '';
      } catch { return ''; }
    };
    const within = (val, min, max) => {
      if (min !== '' && val < Number(min)) return false;
      if (max !== '' && val > Number(max)) return false;
      return true;
    };

    let arr = Array.isArray(images) ? [...images] : [];

    if (filters.originalType !== 'all') {
      arr = arr.filter(img => {
        const ext = getExt(img.original_url);
        const map = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', webp: 'webp', gif: 'gif' };
        const norm = map[ext] || 'other';
        return filters.originalType === norm || (filters.originalType === 'other' && !(norm in { jpeg:1,png:1,webp:1,gif:1 }));
      });
    }

    arr = arr.filter(img => {
      const size = Number(img.original_size ?? img.webp_size ?? img.jpeg_size ?? 0) / 1024;
      return within(size, filters.sizeMinKB, filters.sizeMaxKB);
    });

    arr = arr.filter(img => {
      const w = Number(img.width || 0);
      const h = Number(img.height || 0);
      return within(w, filters.widthMin, filters.widthMax) && within(h, filters.heightMin, filters.heightMax);
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let va = 0, vb = 0;
      if (sortBy === 'date') {
        va = new Date(a.updated_date || a.created_date || 0).getTime();
        vb = new Date(b.updated_date || b.created_date || 0).getTime();
      } else if (sortBy === 'size') {
        va = Number(a.original_size ?? a.webp_size ?? a.jpeg_size ?? 0);
        vb = Number(b.original_size ?? b.webp_size ?? b.jpeg_size ?? 0);
      } else if (sortBy === 'area') {
        va = Number(a.width || 0) * Number(a.height || 0);
        vb = Number(b.width || 0) * Number(b.height || 0);
      } else if (sortBy === 'width') {
        va = Number(a.width || 0);
        vb = Number(b.width || 0);
      } else if (sortBy === 'height') {
        va = Number(a.height || 0);
        vb = Number(b.height || 0);
      }
      return (va - vb) * dir;
    });

    return arr;
  }, [images, filters, sortBy, sortDir]);

  const hasActiveFilters = useMemo(() => 
    filters.originalType !== 'all' || filters.sizeMinKB || filters.sizeMaxKB || 
    filters.widthMin || filters.widthMax || filters.heightMin || filters.heightMax,
  [filters]);

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <Card>
          <CardHeader><CardTitle className="text-base sm:text-lg">Sign in required</CardTitle></CardHeader>
          <CardContent className="text-sm">Please log in to manage images.</CardContent>
        </Card>
      </div>
    );
  }
  
  // Board member roles that have admin-level access
  const ADMIN_ROLES = ['admin', 'President', 'Vice President', 'Legal', 'Treasurer', 'Secretary', 'Caretaker', 'Administrator'];
  
  if (!ADMIN_ROLES.includes(user.role)) {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <Card>
          <CardHeader><CardTitle className="text-base sm:text-lg">Not authorized</CardTitle></CardHeader>
          <CardContent className="text-sm">Only administrators and board members can access Image Management.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-4 lg:p-6 bg-stone-100">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold flex items-center gap-2">
            <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5"/> Image Management
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching} className="h-8 w-8">
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            <Link to={createPageUrl('ImageGallery')}>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white h-8 sm:h-9 text-xs sm:text-sm">Gallery</Button>
            </Link>
            <Link to={createPageUrl('Admin')}>
              <Button variant="outline" className="h-8 sm:h-9 text-xs sm:text-sm">Admin</Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-base lg:text-lg">Upload & Optimize</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Input 
                type="file" 
                accept="image/*" 
                onChange={(e) => setFile(e.target.files?.[0] || null)} 
                className="h-8 sm:h-9 text-sm flex-1"
              />
              <Input 
                placeholder="Alt text (optional)" 
                value={alt} 
                onChange={(e) => setAlt(e.target.value)} 
                className="h-8 sm:h-9 text-sm sm:w-48"
                maxLength={200}
              />
              <Button onClick={handleUpload} disabled={!file || isUploading} className="h-8 sm:h-9 text-xs sm:text-sm min-w-[100px] sm:min-w-[120px]">
                {isUploading ? (<><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin"/> Processing...</>) : (<><Upload className="w-3.5 h-3.5 mr-1.5"/> Upload</>)}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base lg:text-lg">Library ({displayed.length})</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowFilters(!showFilters)} 
                className={`h-7 sm:h-8 text-xs gap-1 ${hasActiveFilters ? 'bg-teal-50 border-teal-200' : ''}`}
              >
                <Filter className="w-3 h-3"/> 
                <span className="hidden sm:inline">Filters</span>
                {showFilters ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {isError ? (
              <div className="text-center py-8 sm:py-12">
                <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-400 mx-auto mb-2" />
                <p className="text-xs sm:text-sm text-stone-500 mb-2">Failed to load images</p>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
                  <RefreshCw className="w-3 h-3 mr-1" /> Retry
                </Button>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-8 sm:py-12 text-stone-500 text-sm">
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin"/> Loading images…
              </div>
            ) : images.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 text-stone-200" />
                <p className="text-stone-500 text-sm">No images yet. Upload your first image above.</p>
              </div>
            ) : (
              <>
                {showFilters && (
                  <div className="mb-4 p-3 bg-stone-50 rounded-lg border border-stone-200 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] sm:text-xs">Type</Label>
                        <Select value={filters.originalType} onValueChange={(v) => setFilters(f => ({ ...f, originalType: v }))}>
                          <SelectTrigger className="h-7 sm:h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="jpeg">JPEG</SelectItem>
                            <SelectItem value="png">PNG</SelectItem>
                            <SelectItem value="webp">WEBP</SelectItem>
                            <SelectItem value="gif">GIF</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] sm:text-xs">Size KB (min)</Label>
                        <Input type="number" placeholder="Min" value={filters.sizeMinKB} onChange={(e) => setFilters(f => ({ ...f, sizeMinKB: e.target.value }))} className="h-7 sm:h-8 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] sm:text-xs">Size KB (max)</Label>
                        <Input type="number" placeholder="Max" value={filters.sizeMaxKB} onChange={(e) => setFilters(f => ({ ...f, sizeMaxKB: e.target.value }))} className="h-7 sm:h-8 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] sm:text-xs">Sort by</Label>
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger className="h-7 sm:h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="size">Size</SelectItem>
                            <SelectItem value="area">Area</SelectItem>
                            <SelectItem value="width">Width</SelectItem>
                            <SelectItem value="height">Height</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] sm:text-xs">Order</Label>
                        <Select value={sortDir} onValueChange={setSortDir}>
                          <SelectTrigger className="h-7 sm:h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="desc">Desc</SelectItem>
                            <SelectItem value="asc">Asc</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {hasActiveFilters && (
                        <div className="flex items-end">
                          <Button variant="ghost" size="sm" onClick={() => setFilters({ originalType: 'all', sizeMinKB: '', sizeMaxKB: '', widthMin: '', widthMax: '', heightMin: '', heightMax: '' })} className="h-7 sm:h-8 text-xs text-red-600">
                            Clear
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div 
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
                  style={{ contentVisibility: 'auto', containIntrinsicSize: '0 500px' }}
                >
                  {displayed.map(img => (
                    <ImageCard
                      key={img.id}
                      img={img}
                      altEdit={altEdits[img.id] ?? (img.alt_text || '')}
                      onAltChange={handleAltChange}
                      onSaveAlt={updateAlt}
                      quality={perImageQuality[img.id] ?? 80}
                      onQualityChange={handleQualityChange}
                      reoptLoading={!!reoptLoading[img.id]}
                      onReOptimize={reOptimize}
                      onDownload={handleDownload}
                      onCopy={handleCopy}
                      onDelete={deleteImage}
                      onOpenDetails={openDetails}
                    />
                  ))}
                </div>

                {displayed.length === 0 && images.length > 0 && (
                  <div className="text-center py-8 text-stone-500 text-sm">
                    No images match your filters.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <ImageDetailDialog 
          image={selectedImage} 
          open={detailOpen} 
          onOpenChange={setDetailOpen} 
          onOptimized={() => qc.invalidateQueries({ queryKey: ['images'] })} 
        />
      </div>
    </div>
  );
}

export default ImageManager;