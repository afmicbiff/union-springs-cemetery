// Deduplicating fetch wrapper + payload bloat warnings
// Also tracks lightweight network stats on window.__perfNetStats

const inflight = new Map();
const MAX_DURATIONS = 100;

export async function apiFetch(url, options = {}, originalFetch) {
  const method = (options.method || 'GET').toUpperCase();
  const key = `${method}::${url}::${options.body || ''}`;

  if (inflight.has(key)) return inflight.get(key);

  const fetchImpl = originalFetch || (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);

  const p = (async () => {
    const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
    try {
      const res = await fetchImpl(url, options);

      // Lightweight stats — NO response cloning to avoid double-parse overhead
      if (typeof window !== 'undefined') {
        const s = window.__perfNetStats = window.__perfNetStats || { requests: 0, bytes: 0, durations: [] };
        const cl = Number(res.headers.get('content-length') || '0');
        s.requests += 1;
        if (cl) s.bytes += cl;
        if (t0) {
          s.durations.push(((performance.now && performance.now()) || Date.now()) - t0);
          // Cap array to prevent unbounded memory growth
          if (s.durations.length > MAX_DURATIONS) s.durations = s.durations.slice(-MAX_DURATIONS);
        }
      }

      return res;
    } catch (err) {
      if (typeof window !== 'undefined') {
        const s = window.__perfNetStats = window.__perfNetStats || { requests: 0, bytes: 0, durations: [] };
        s.requests += 1;
        if (t0) {
          s.durations.push(-(((performance.now && performance.now()) || Date.now()) - t0));
          if (s.durations.length > MAX_DURATIONS) s.durations = s.durations.slice(-MAX_DURATIONS);
        }
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