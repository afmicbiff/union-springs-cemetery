// Lightweight performance metrics collector (no external deps)
// Tracks: load time, payload size, request counts, LCP/CLS/INP approximations

const METRICS_KEY = "b44_metrics_v1";
let subscribers = [];

export function getCurrentMetrics() {
  try {
    const raw = sessionStorage.getItem(METRICS_KEY) || localStorage.getItem(METRICS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveMetrics(metrics) {
  const json = JSON.stringify(metrics);
  try { sessionStorage.setItem(METRICS_KEY, json); } catch {}
  try { localStorage.setItem(METRICS_KEY, json); } catch {}
  subscribers.forEach((cb) => cb(metrics));
}

export function subscribeMetrics(cb) {
  subscribers.push(cb);
  return () => { subscribers = subscribers.filter((s) => s !== cb); };
}

export function initPerfObservers() {
  const nav = performance.getEntriesByType("navigation")[0];
  const resources = performance.getEntriesByType("resource");

  const payloadBytes = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
  const requestCount = resources.length;
  const loadTime = nav ? nav.loadEventEnd : performance.now();

  const metrics = {
    ts: Date.now(),
    loadTime, // ms
    payloadBytes, // bytes
    requestCount,
    lcp: null,
    cls: 0,
    inp: null,
  };

  // LCP approximation
  let lcpVal = null;
  let clsVal = 0;
  let inpVal = null;

  const poLCP = new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    const last = entries[entries.length - 1];
    if (last) lcpVal = last.startTime;
  });
  try { poLCP.observe({ type: "largest-contentful-paint", buffered: true }); } catch {}

  const poCLS = new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries()) {
      if (!entry.hadRecentInput) clsVal += entry.value || 0;
    }
  });
  try { poCLS.observe({ type: "layout-shift", buffered: true }); } catch {}

  const poINP = new PerformanceObserver((entryList) => {
    const last = entryList.getEntries().at(-1);
    if (last) inpVal = last.duration;
  });
  try { poINP.observe({ type: "event", buffered: true, durationThreshold: 40 }); } catch {}

  const finalize = () => {
    metrics.lcp = lcpVal;
    metrics.cls = Number(clsVal.toFixed(3));
    metrics.inp = inpVal;
    saveMetrics(metrics);
  };

  // Save once on idle
  if ("requestIdleCallback" in window) {
    requestIdleCallback(finalize, { timeout: 2000 });
  } else {
    setTimeout(finalize, 1500);
  }

  // Return stop function
  return () => {
    try { poLCP.disconnect(); } catch {}
    try { poCLS.disconnect(); } catch {}
    try { poINP.disconnect(); } catch {}
  };
}