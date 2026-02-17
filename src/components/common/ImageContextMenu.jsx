import React from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function ImageContextMenu() {
  const [visible, setVisible] = React.useState(false);
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  const [targetImg, setTargetImg] = React.useState(null);
  const [pictureEl, setPictureEl] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  // PERF: Only add click/escape listeners when menu is visible to reduce global listener count
  React.useEffect(() => {
    const onContextMenu = (e) => {
      const img = e.target.closest('img');
      const pic = e.target.closest('picture');
      if (!img) {
        setVisible(false);
        return;
      }
      e.preventDefault();
      setTargetImg(img);
      setPictureEl(pic || null);
      const x = Math.min(e.clientX, window.innerWidth - 180);
      const y = Math.min(e.clientY, window.innerHeight - 60);
      setPos({ x, y });
      setVisible(true);
    };

    document.addEventListener('contextmenu', onContextMenu);
    return () => {
      document.removeEventListener('contextmenu', onContextMenu);
    };
  }, []);

  // Dismiss listeners - only active when menu is visible
  React.useEffect(() => {
    if (!visible) return;
    const onClick = () => setVisible(false);
    const onEscape = (e) => { if (e.key === 'Escape') setVisible(false); };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onEscape);
    };
  }, [visible]);

  const compressHere = async () => {
    if (!targetImg) return;
    try {
      setBusy(true);
      const fileUrl = targetImg.currentSrc || targetImg.src;
      const altText = targetImg.getAttribute('alt') || '';

      const res = await base44.functions.invoke('tinyPngOptimize', {
        file_url: fileUrl,
        alt_text: altText,
        quality_jpeg: 85,
        quality_webp: 70,
        mode: 'new'
      });

      const data = res?.data;
      const webp = data?.image?.webp_url;
      const jpeg = data?.image?.jpeg_url;
      if (!webp && !jpeg) throw new Error('Compression failed');

      // Replace in-place
      if (pictureEl) {
        let webpSource = pictureEl.querySelector('source[type="image/webp"]');
        if (!webpSource) {
          webpSource = document.createElement('source');
          webpSource.setAttribute('type', 'image/webp');
          pictureEl.insertBefore(webpSource, pictureEl.firstChild);
        }
        if (webp) webpSource.setAttribute('srcset', webp);
        if (jpeg) targetImg.setAttribute('src', jpeg); // fallback
      } else {
        // Single <img>
        if (webp) targetImg.setAttribute('src', webp);
      }

      // Bust cache by toggling a dummy attribute
      targetImg.setAttribute('data-updated', String(Date.now()));

      toast.success('Image compressed and updated');
      setVisible(false);
    } catch (e) {
      toast.error(e?.message || 'Compression error');
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      style={{ left: pos.x, top: pos.y }}
      className="fixed z-[1000] min-w-[180px] bg-white border border-stone-200 shadow-xl rounded-md overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 disabled:opacity-60 flex items-center gap-2"
        onClick={compressHere}
        disabled={busy}
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin text-stone-500" />} 
        {busy ? 'Compressing…' : 'Compress to WebP (70%) here'}
      </button>
    </div>
  );
}