import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Image as ImageIcon, Filter, ArrowUpDown } from 'lucide-react';
import ImageDetailDialog from '@/components/images/ImageDetailDialog';
import { toast } from 'sonner';

export default function ImageGallery() {
  const qc = useQueryClient();

  const { data: images = [], isLoading, isFetching } = useQuery({
    queryKey: ['images'],
    queryFn: () => base44.entities.Image.list('-updated_date', 500),
    staleTime: 60_000,
  });

  const [search, setSearch] = React.useState('');
  const [sortBy, setSortBy] = React.useState('date'); // 'name' | 'size'
  const [sortDir, setSortDir] = React.useState('desc');
  const [type, setType] = React.useState('all'); // jpeg|png|webp|gif|other
  const [selected, setSelected] = React.useState(null);
  const [open, setOpen] = React.useState(false);

  const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const val = bytes / Math.pow(1024, i);
    return `${val.toFixed(val >= 10 ? 0 : 1)} ${sizes[i]}`;
  };

  const filtered = React.useMemo(() => {
    const getExt = (url) => {
      try {
        const u = String(url || '').toLowerCase();
        const q = u.split('?')[0];
        const ext = q.substring(q.lastIndexOf('.') + 1);
        return ext || '';
      } catch { return ''; }
    };

    let arr = Array.isArray(images) ? [...images] : [];

    if (search) {
      const term = search.toLowerCase();
      arr = arr.filter(img => {
        const fn = (() => {
          try { return decodeURIComponent(new URL(img.original_url).pathname.split('/').pop() || ''); } catch { return ''; }
        })().toLowerCase();
        return fn.includes(term) || (img.alt_text || '').toLowerCase().includes(term);
      });
    }

    if (type !== 'all') {
      arr = arr.filter(img => {
        const ext = getExt(img.original_url);
        const map = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', webp: 'webp', gif: 'gif' };
        const norm = map[ext] || 'other';
        return type === norm || (type === 'other' && !(norm in { jpeg:1,png:1,webp:1,gif:1 }));
      });
    }

    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a,b)=>{
      if (sortBy === 'name') {
        const na = (()=>{try{return decodeURIComponent(new URL(a.original_url).pathname.split('/').pop()||'');}catch{return''}})();
        const nb = (()=>{try{return decodeURIComponent(new URL(b.original_url).pathname.split('/').pop()||'');}catch{return''}})();
        return na.localeCompare(nb) * dir;
      }
      if (sortBy === 'size') {
        const va = Number(a.original_size ?? a.webp_size ?? a.jpeg_size ?? 0);
        const vb = Number(b.original_size ?? b.webp_size ?? b.jpeg_size ?? 0);
        return (va - vb) * dir;
      }
      // date
      const va = new Date(a.updated_date || a.created_date || 0).getTime();
      const vb = new Date(b.updated_date || b.created_date || 0).getTime();
      return (va - vb) * dir;
    });

    return arr;
  }, [images, search, sortBy, sortDir, type]);

  const openDetails = (img) => {
    setSelected(img);
    setOpen(true);
  };

  const onOptimized = () => {
    toast.success('Refreshing gallery…');
    qc.invalidateQueries({ queryKey: ['images'] });
  };

  return (
    <div className="min-h-screen p-6 bg-stone-100">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold flex items-center gap-2"><ImageIcon className="w-5 h-5"/> Image Gallery</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters & Sorting</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Search filename/alt</Label>
              <Input value={search} onChange={(e)=> setSearch(e.target.value)} placeholder="Type to filter…" className="w-56"/>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-40"><SelectValue placeholder="All"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="jpeg">JPEG</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="webp">WEBP</SelectItem>
                  <SelectItem value="gif">GIF</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sort by</Label>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Upload date</SelectItem>
                    <SelectItem value="name">Filename</SelectItem>
                    <SelectItem value="size">File size</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortDir} onValueChange={setSortDir}>
                  <SelectTrigger className="w-28"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Desc</SelectItem>
                    <SelectItem value="asc">Asc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {isFetching && <div className="text-stone-500 flex items-center text-sm"><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Updating…</div>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-stone-500"><Loader2 className="w-5 h-5 mr-2 animate-spin"/> Loading images…</div>
            ) : filtered.length === 0 ? (
              <div className="text-stone-500">No images match your filters.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filtered.map(img => {
                  const name = (()=>{try{return decodeURIComponent(new URL(img.original_url).pathname.split('/').pop()||'');}catch{return''}})();
                  const size = formatBytes(img.original_size ?? img.webp_size ?? img.jpeg_size ?? 0);
                  return (
                    <button key={img.id} onClick={() => openDetails(img)} className="group text-left">
                      <div className="aspect-square w-full overflow-hidden rounded-md border bg-stone-50">
                        <picture>
                          <source srcSet={img.webp_url} type="image/webp" />
                          <img src={img.jpeg_url} alt={img.alt_text || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" loading="lazy"/>
                        </picture>
                      </div>
                      <div className="mt-2 text-xs text-stone-700 truncate" title={name}>{name || 'image'}</div>
                      <div className="text-[11px] text-stone-500">{size}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ImageDetailDialog image={selected} open={open} onOpenChange={setOpen} onOptimized={onOptimized} />
    </div>
  );
}