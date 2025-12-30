import { onCLS, onINP, onLCP } from 'web-vitals';

const ENDPOINT = '/functions/vitals';

function send(metric) {
  const payload = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
    navigationType: metric.navigationType,
    url: location.href,
    ts: Date.now(),
  };

  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    try { navigator.sendBeacon(ENDPOINT, body); return; } catch (_) {}
  }
  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

export function initWebVitals() {
  if (typeof window === 'undefined') return;
  if (window.__perfVitalsInitialized) return;
  window.__perfVitalsInitialized = true;
  onCLS(send);
  onINP(send);
  onLCP(send);
}