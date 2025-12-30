// Deduplicating fetch wrapper + payload bloat warnings
// Also tracks lightweight network stats on window.__perfNetStats

const inflight = new Map();
const LARGE_BYTES = 38_100; // ~37.2KB

export async function apiFetch(url, options = {}, originalFetch) {
  const method = (options.method || 'GET').toUpperCase();
  const key = `${method}::${url}::${options.body || ''}`;

  if (inflight.has(key)) return inflight.get(key);

  const fetchImpl = originalFetch || (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);

  const p = (async () => {
    const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
    try {
      const res = await fetchImpl(url, options);

      const ct = (res.headers.get('content-type') || '').toLowerCase();
      const cl = Number(res.headers.get('content-length') || '0');

      if (cl && cl > LARGE_BYTES) {
        console.warn('Large payload detected', { url, bytes: cl });
      }

      // Initialize stats bucket
      if (typeof window !== 'undefined') {
        window.__perfNetStats = window.__perfNetStats || { requests: 0, bytes: 0, durations: [] };
      }

      // If JSON and content-length missing or unreliable, estimate by cloning
      if (ct.includes('application/json')) {
        const data = await res.clone().json().catch(() => null);
        if (data) {
          const bytes = new Blob([JSON.stringify(data)]).size;
          if (bytes > LARGE_BYTES) console.warn('Large JSON detected', { url, bytes });
          if (typeof window !== 'undefined') {
            window.__perfNetStats.bytes = (window.__perfNetStats.bytes || 0) + (cl || bytes);
          }
        }
      } else if (cl && typeof window !== 'undefined') {
        window.__perfNetStats.bytes = (window.__perfNetStats.bytes || 0) + cl;
      }

      if (typeof window !== 'undefined') {
        const s = window.__perfNetStats;
        s.requests += 1;
        if (t0) s.durations.push(((performance.now && performance.now()) || Date.now()) - t0);
      }

      return res;
    } catch (err) {
      if (typeof window !== 'undefined') {
        window.__perfNetStats = window.__perfNetStats || { requests: 0, bytes: 0, durations: [] };
        const s = window.__perfNetStats;
        s.requests += 1;
        if (t0) s.durations.push(-(((performance.now && performance.now()) || Date.now()) - t0));
      }
      throw err;
    }
  })();

  inflight.set(key, p);
  try {
    return await p;
  } finally {
    inflight.delete(key);
  }
}

export function installFetchGuards() {
  if (typeof window === 'undefined') return;
  if (window.__perfFetchGuardInstalled) return;
  const original = window.fetch?.bind(window);
  if (!original) return;
  window.__perfFetchGuardInstalled = true;

  // Patch global fetch to route through apiFetch while using original under the hood
  const wrapper = (url, options) => apiFetch(String(url), options || {}, original);
  wrapper._original = original;
  window.fetch = wrapper;
}