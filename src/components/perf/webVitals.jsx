import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

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
  onFCP(send);
  onINP(send);
  onLCP(send);
  onTTFB(send);

  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          send({
            name: 'LONGTASK',
            value: entry.duration,
            rating: entry.duration > 50 ? 'poor' : 'good',
            id: `longtask-${Math.round(entry.startTime)}-${Math.round(entry.duration)}`,
            navigationType: 'navigate'
          });
        });
      });
      observer.observe({ type: 'longtask', buffered: true });
    } catch (_) {}
  }
}