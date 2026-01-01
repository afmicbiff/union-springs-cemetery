import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Image as ImageIcon, Loader2, Download } from 'lucide-react';
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

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      // 1) Upload original
      const uploaded = await base44.integrations.Core.UploadFile({ file });
      const file_url = uploaded?.file_url;
      if (!file_url) throw new Error('Upload failed');
      // 2) Optimize via backend
      await base44.functions.invoke('optimizeImage', { file_url, alt_text: alt });
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
          <CardContent className="space-y-3">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {images.map(img => (
                  <div key={img.id} className="border rounded-md bg-white overflow-hidden">
                    <div className="bg-stone-50 p-2">
                      <picture>
                        <source srcSet={img.webp_url} type="image/webp" />
                        <img src={img.jpeg_url} alt={img.alt_text || ''} className="w-full h-48 object-cover rounded" loading="lazy"/>
                      </picture>
                    </div>
                    <div className="p-3 space-y-2 text-sm">
                      <div className="text-stone-700">{img.alt_text || '—'}</div>
                      <div className="text-stone-500">{img.width}×{img.height}px</div>
                      <div className="flex gap-2">
                        <a href={img.webp_url} download className="inline-flex items-center gap-1 text-teal-700 hover:underline"><Download className="w-4 h-4"/> WebP</a>
                        <a href={img.jpeg_url} download className="inline-flex items-center gap-1 text-teal-700 hover:underline"><Download className="w-4 h-4"/> JPEG</a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}