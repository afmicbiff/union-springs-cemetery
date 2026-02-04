import React, { useState, useMemo, useCallback, memo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Image as ImageIcon, RefreshCw, AlertCircle, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import ImageDetailDialog from '@/components/images/ImageDetailDialog';
import { toast } from 'sonner';

// Utility: format bytes - hoisted outside component
const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(val >= 10 ? 0 : 1)} ${sizes[i]}`;
};

// Utility: extract filename from URL
const getFilename = (url) => {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
  } catch {
    return '';
  }
};

// Memoized Gallery Image Thumbnail
const GalleryThumbnail = memo(function GalleryThumbnail({ img, onClick }) {
  const name = useMemo(() => getFilename(img.original_url), [img.original_url]);
  const size = useMemo(() => formatBytes(img.original_size ?? img.webp_size ?? img.jpeg_size ?? 0), [img.original_size, img.webp_size, img.jpeg_size]);
  const handleClick = useCallback(() => onClick(img), [img, onClick]);

  return (
    <button onClick={handleClick} className="group text-left w-full focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded-md">
      <div className="aspect-square w-full overflow-hidden rounded-md border bg-stone-50">
        <picture>
          <source srcSet={img.webp_url} type="image/webp" />
          <img 
            src={img.jpeg_url} 
            alt={img.alt_text || name || 'Gallery image'} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
            loading="lazy"
            decoding="async"
            width={img.width || 200}
            height={img.height || 200}
          />
        </picture>
      </div>
      <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-stone-700 truncate" title={name}>{name || 'image'}</div>
      <div className="text-[9px] sm:text-[11px] text-stone-500">{size}</div>
    </button>
  );
});

function ImageGallery() {
  const qc = useQueryClient();

  const { data: images = [], isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['images'],
    queryFn: () => base44.entities.Image.list('-updated_date', 500),
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [type, setType] = useState('all');
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    const getExt = (url) => {
      try {
        const u = String(url || '').toLowerCase().split('?')[0];
        return u.substring(u.lastIndexOf('.') + 1) || '';
      } catch { return ''; }
    };

    let arr = Array.isArray(images) ? [...images] : [];

    if (search) {
      const term = search.toLowerCase();
      arr = arr.filter(img => {
        const fn = getFilename(img.original_url).toLowerCase();
        return fn.includes(term) || (img.alt_text || '').toLowerCase().includes(term);
      });
    }

    if (type !== 'all') {
      arr = arr.filter(img => {
        const ext = getExt(img.original_url);
        const map = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', webp: 'webp', gif: 'gif' };
        const norm = map[ext] || 'other';
        return type === norm || (type === 'other' && !(norm in { jpeg:1, png:1, webp:1, gif:1 }));
      });
    }

    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      if (sortBy === 'name') {
        return getFilename(a.original_url).localeCompare(getFilename(b.original_url)) * dir;
      }
      if (sortBy === 'size') {
        const va = Number(a.original_size ?? a.webp_size ?? a.jpeg_size ?? 0);
        const vb = Number(b.original_size ?? b.webp_size ?? b.jpeg_size ?? 0);
        return (va - vb) * dir;
      }
      const va = new Date(a.updated_date || a.created_date || 0).getTime();
      const vb = new Date(b.updated_date || b.created_date || 0).getTime();
      return (va - vb) * dir;
    });

    return arr;
  }, [images, search, sortBy, sortDir, type]);

  const hasActiveFilters = useMemo(() => search || type !== 'all', [search, type]);

  const openDetails = useCallback((img) => {
    setSelected(img);
    setOpen(true);
  }, []);

  const onOptimized = useCallback(() => {
    toast.success('Refreshing gallery…');
    qc.invalidateQueries({ queryKey: ['images'] });
  }, [qc]);

  const handleSearchChange = useCallback((e) => setSearch(e.target.value), []);
  const clearFilters = useCallback(() => {
    setSearch('');
    setType('all');
  }, []);

  return (
    <div className="min-h-screen p-3 sm:p-4 lg:p-6 bg-stone-100">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold flex items-center gap-2">
            <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5"/> Image Gallery
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching} className="h-8 w-8">
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
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
        </div>

        {showFilters && (
          <Card className="animate-in fade-in slide-in-from-top-2">
            <CardContent className="p-3 sm:p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <Label className="text-[10px] sm:text-xs">Search</Label>
                  <Input 
                    value={search} 
                    onChange={handleSearchChange} 
                    placeholder="Filename or alt…" 
                    className="h-7 sm:h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] sm:text-xs">Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="h-7 sm:h-8 text-xs"><SelectValue placeholder="All"/></SelectTrigger>
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
                  <Label className="text-[10px] sm:text-xs">Sort by</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-7 sm:h-8 text-xs"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="size">Size</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] sm:text-xs">Order</Label>
                  <div className="flex gap-1.5">
                    <Select value={sortDir} onValueChange={setSortDir}>
                      <SelectTrigger className="h-7 sm:h-8 text-xs flex-1"><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Desc</SelectItem>
                        <SelectItem value="asc">Asc</SelectItem>
                      </SelectContent>
                    </Select>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 sm:h-8 px-2 text-xs text-red-600">
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-base">
              {filtered.length} image{filtered.length !== 1 ? 's' : ''}
              {hasActiveFilters && ` (filtered from ${images.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6">
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
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 text-stone-200" />
                <p className="text-stone-500 text-sm">
                  {images.length === 0 ? 'No images in gallery yet.' : 'No images match your filters.'}
                </p>
              </div>
            ) : (
              <div 
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 lg:gap-4"
                style={{ contentVisibility: 'auto', containIntrinsicSize: '0 500px' }}
              >
                {filtered.map(img => (
                  <GalleryThumbnail key={img.id} img={img} onClick={openDetails} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ImageDetailDialog image={selected} open={open} onOpenChange={setOpen} onOptimized={onOptimized} />
    </div>
  );
}

export default ImageGallery;