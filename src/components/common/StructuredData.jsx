import { useEffect } from 'react';

/**
 * Injects JSON-LD structured data into the page <head>.
 * Pass a plain JS object as `data` — it will be serialized.
 * Provide a unique `id` so the script tag can be replaced on re-render.
 */
export default function StructuredData({ id, data }) {
  useEffect(() => {
    if (!data) return;
    const scriptId = `structured-data-${id}`;
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);

    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, [id, data]);

  return null;
}