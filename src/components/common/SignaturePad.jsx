import React, { useRef, useEffect } from "react";

export default function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const ratio = window.devicePixelRatio || 1;
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#111827"; // gray-900
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const getPos = (e) => {
    const c = canvasRef.current;
    const rect = c.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const start = (e) => {
    drawing.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    onChange && onChange(true);
  };
  const end = () => { drawing.current = false; };

  const clear = () => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    onChange && onChange(false);
  };

  const toBlob = async () => new Promise((resolve) => canvasRef.current.toBlob(resolve, "image/png"));

  return (
    <div className="space-y-2">
      <div 
        className="border rounded-md bg-white"
        style={{ width: "100%", height: 160 }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={clear} className="px-3 py-1.5 text-sm rounded-md border">Clear</button>
        <a
          href="#"
          onClick={async (e) => { e.preventDefault(); const b = await toBlob(); const url = URL.createObjectURL(b); const a = document.createElement('a'); a.href = url; a.download = 'signature.png'; a.click(); URL.revokeObjectURL(url); }}
          className="px-3 py-1.5 text-sm rounded-md border"
        >Download PNG</a>
      </div>
    </div>
  );
}