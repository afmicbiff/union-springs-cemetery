import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Image as ImageIcon, Loader2, Download, Copy, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function ImageManager() {
  const qc = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  const { data: images = [], isLoading } = useQuery({
    queryKey: ['images'],
    queryFn: () => base44.entities.Image.list('-updated_date', 200),
    staleTime: 60_000,
  });

  const [file, setFile] = React.useState(null);
  const [alt, setAlt] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);

  const [qualityJpeg, setQualityJpeg] = React.useState(85);
  const [qualityWebp, setQualityWebp] = React.useState(80);

  const [filters, setFilters] = React.useState({
    originalType: 'all',
    sizeMinKB: '',
    sizeMaxKB: '',
    widthMin: '',
    widthMax: '',
    heightMin: '',
    heightMax: ''
  });
  const [sortBy, setSortBy] = React.useState('date');
  const [sortDir, setSortDir] = React.useState('desc');

  const [altEdits, setAltEdits] = React.useState({});
  const [perImageQuality, setPerImageQuality] = React.useState({});

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      // 1) Upload original
      const uploaded = await base44.integrations.Core.UploadFile({ file });
      const file_url = uploaded?.file_url;
      if (!file_url) throw new Error('Upload failed');
      // 2) Optimize via backend
      await base44.functions.invoke('tinyPngOptimize', { file_url, alt_text: alt, quality_jpeg: qualityJpeg, quality_webp: qualityWebp, mode: 'new' });
      setFile(null);
      setAlt('');
      qc.invalidateQueries({ queryKey: ['images'] });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (url, filename) => {
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
  };

  const handleCopy = async (text) => {
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  const updateAlt = async (id, newAlt) => {
    await base44.entities.Image.update(id, { alt_text: newAlt || '' });
    qc.invalidateQueries({ queryKey: ['images'] });
  };

  const reOptimize = async (img, mode) => {
    const q = perImageQuality[img.id] ?? 80;
    await base44.functions.invoke('optimizeImage', {
      file_url: img.original_url,
      alt_text: img.alt_text || '',
      quality_jpeg: q,
      quality_webp: q,
      mode,
      image_id: img.id
    });
    qc.invalidateQueries({ queryKey: ['images'] });
  };

  const deleteImage = async (id) => {
    if (!window.confirm('Delete this image from the library?')) return;
    await base44.entities.Image.delete(id);
    qc.invalidateQueries({ queryKey: ['images'] });
  };

  const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const val = bytes / Math.pow(1024, i);
    return `${val.toFixed(val >= 10 ? 0 : 1)} ${sizes[i]}`;
  };

  const displayed = React.useMemo(() => {
    const getExt = (url) => {
      try {
        const u = String(url || '').toLowerCase();
        const q = u.split('?')[0];
        const ext = q.substring(q.lastIndexOf('.') + 1);
        return ext || '';
      } catch { return ''; }
    };
    const within = (val, min, max) => {
      if (min !== '' && val < Number(min)) return false;
      if (max !== '' && val > Number(max)) return false;
      return true;
    };

    let arr = Array.isArray(images) ? [...images] : [];

    // Filter by original type
    if (filters.originalType !== 'all') {
      arr = arr.filter(img => {
        const ext = getExt(img.original_url);
        const map = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', webp: 'webp', gif: 'gif' };
        const norm = map[ext] || 'other';
        return filters.originalType === norm || (filters.originalType === 'other' && !(norm in { jpeg:1,png:1,webp:1,gif:1 }));
      });
    }

    // Size range (KB) using original_size fallback to webp_size
    arr = arr.filter(img => {
      const size = Number(img.original_size ?? img.webp_size ?? img.jpeg_size ?? 0) / 1024;
      return within(size, filters.sizeMinKB, filters.sizeMaxKB);
    });

    // Dimensions
    arr = arr.filter(img => {
      const w = Number(img.width || 0);
      const h = Number(img.height || 0);
      const passW = within(w, filters.widthMin, filters.widthMax);
      const passH = within(h, filters.heightMin, filters.heightMax);
      return passW && passH;
    });

    // Sorting
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

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <Card>
          <CardHeader><CardTitle>Sign in required</CardTitle></CardHeader>
          <CardContent>Please log in to manage images.</CardContent>
        </Card>
      </div>
    );
  }
  if (user.role !== 'admin') {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <Card>
          <CardHeader><CardTitle>Not authorized</CardTitle></CardHeader>
          <CardContent>Only administrators can access Image Management.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-stone-100">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold flex items-center gap-2"><ImageIcon className="w-5 h-5"/> Image Management</h1>
          <Link to={createPageUrl('Admin')}><Button variant="outline">Back to Admin</Button></Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload & Optimize</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <Input placeholder="Alt text (optional)" value={alt} onChange={(e) => setAlt(e.target.value)} />
              <Button onClick={handleUpload} disabled={!file || isUploading} className="min-w-[140px]">
                {isUploading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Processing...</>) : (<><Upload className="w-4 h-4 mr-2"/> Upload</>)}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Library</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-stone-500"><Loader2 className="w-5 h-5 mr-2 animate-spin"/> Loading images…</div>
            ) : images.length === 0 ? (
              <div className="text-stone-500">No images yet.</div>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Original type</Label>
                  <Select value={filters.originalType} onValueChange={(v)=> setFilters(f=>({...f, originalType: v}))}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="All" /></SelectTrigger>
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
                  <Label className="text-xs">Size (KB)</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" placeholder="Min" value={filters.sizeMinKB} onChange={(e)=> setFilters(f=>({...f, sizeMinKB: e.target.value}))} className="h-9 w-24" />
                    <span className="text-stone-400 text-xs">–</span>
                    <Input type="number" placeholder="Max" value={filters.sizeMaxKB} onChange={(e)=> setFilters(f=>({...f, sizeMaxKB: e.target.value}))} className="h-9 w-24" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Width</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" placeholder="Min" value={filters.widthMin} onChange={(e)=> setFilters(f=>({...f, widthMin: e.target.value}))} className="h-9 w-24" />
                    <span className="text-stone-400 text-xs">–</span>
                    <Input type="number" placeholder="Max" value={filters.widthMax} onChange={(e)=> setFilters(f=>({...f, widthMax: e.target.value}))} className="h-9 w-24" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Height</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" placeholder="Min" value={filters.heightMin} onChange={(e)=> setFilters(f=>({...f, heightMin: e.target.value}))} className="h-9 w-24" />
                    <span className="text-stone-400 text-xs">–</span>
                    <Input type="number" placeholder="Max" value={filters.heightMax} onChange={(e)=> setFilters(f=>({...f, heightMax: e.target.value}))} className="h-9 w-24" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Sort by</Label>
                  <div className="flex items-center gap-2">
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Upload date</SelectItem>
                        <SelectItem value="size">File size</SelectItem>
                        <SelectItem value="area">Dimensions (area)</SelectItem>
                        <SelectItem value="width">Width</SelectItem>
                        <SelectItem value="height">Height</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={sortDir} onValueChange={setSortDir}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Desc</SelectItem>
                        <SelectItem value="asc">Asc</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayed.map(img => (
                  <div key={img.id} className="border rounded-md bg-white overflow-hidden">
                    <div className="bg-stone-50 p-2">
                      <picture>
                        <source srcSet={img.webp_url} type="image/webp" />
                        <img src={img.jpeg_url} alt={img.alt_text || ''} className="w-full h-48 object-cover rounded" loading="lazy"/>
                      </picture>
                    </div>
                    <div className="p-3 space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Input value={altEdits[img.id] ?? (img.alt_text || '')} onChange={(e)=> setAltEdits(prev=>({ ...prev, [img.id]: e.target.value }))} placeholder="Alt text" className="h-8" />
                        <Button size="sm" variant="secondary" className="h-8 px-2" onClick={() => updateAlt(img.id, altEdits[img.id] ?? (img.alt_text || ''))}>Save</Button>
                      </div>
                      {(img.width > 0 && img.height > 0) && (
                        <div className="text-stone-500">{img.width}×{img.height}px</div>
                      )}
                      <div className="grid grid-cols-3 gap-2 text-xs text-stone-600 items-center">
                        <div><span className="font-medium text-stone-700">Original:</span> {formatBytes(img.original_size) || '—'}</div>
                        <div><span className="font-medium text-stone-700">WebP:</span> {formatBytes(img.webp_size) || '—'}</div>
                        <div><span className="font-medium text-stone-700">JPEG:</span> {formatBytes(img.jpeg_size) || '—'}</div>
                      </div>
                      <div className="pt-1">
                        <Label className="text-xs text-stone-500">Compression quality</Label>
                        <div className="flex items-center gap-3 flex-wrap">
                          <Slider value={[perImageQuality[img.id] ?? 80]} onValueChange={(v)=> setPerImageQuality(prev=>({ ...prev, [img.id]: v[0] }))} min={1} max={100} step={1} className="w-40" />
                          <span className="text-xs text-stone-600">{perImageQuality[img.id] ?? 80}</span>
                          <Button size="sm" className="h-8 px-2" onClick={() => reOptimize(img, 'overwrite')}>Re‑optimize (overwrite)</Button>
                          <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => reOptimize(img, 'new')}>Re‑optimize as new</Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => handleDownload(img.webp_url, `image-${img.id}.webp`)} className="h-8 px-2"><Download className="w-4 h-4 mr-1"/> WebP</Button>
                        <Button variant="outline" size="sm" onClick={() => handleDownload(img.jpeg_url, `image-${img.id}.jpg`)} className="h-8 px-2"><Download className="w-4 h-4 mr-1"/> JPEG</Button>
                        <Button variant="outline" size="sm" onClick={() => handleCopy(img.webp_url)} className="h-8 px-2"><Copy className="w-4 h-4 mr-1"/> Copy WebP URL</Button>
                        <Button variant="outline" size="sm" onClick={() => handleCopy(`<picture>\n  <source srcset='${img.webp_url}' type='image/webp' />\n  <img src='${img.jpeg_url}' alt='${(img.alt_text||'').replace(/'/g, "&#39;")}'${(img.width>0&&img.height>0)?` width='${img.width}' height='${img.height}'`:''} />\n</picture>`)} className="h-8 px-2"><Copy className="w-4 h-4 mr-1"/> Copy HTML</Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteImage(img.id)} className="h-8 px-2"><Trash2 className="w-4 h-4 mr-1"/> Delete</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}