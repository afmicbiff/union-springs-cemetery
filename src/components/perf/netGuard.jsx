// Lightweight fetch guard to count requests and approximate payload sizes
export function installFetchGuards() {
  if (typeof window === 'undefined') return;
  if (window.__perfFetchGuardInstalled) return;
  window.__perfFetchGuardInstalled = true;

  const orig = window.fetch?.bind(window);
  if (!orig) return;

  window.__perfNetStats = window.__perfNetStats || { requests: 0, bytes: 0, durations: [] };

  window.fetch = async (...args) => {
    const t0 = performance.now();
    try {
      const res = await orig(...args);
      const len = Number(res.headers.get('content-length')) || 0;
      const ms = performance.now() - t0;
      const s = window.__perfNetStats;
      s.requests += 1;
      s.bytes += len;
      s.durations.push(ms);
      return res;
    } catch (e) {
      const ms = performance.now() - t0;
      const s = window.__perfNetStats;
      s.requests += 1;
      s.durations.push(-ms);
      throw e;
    }
  };
}