// Initializes performance observers via existing metrics module
export function initWebVitals() {
  if (typeof window === 'undefined') return;
  if (window.__perfVitalsInitialized) return;
  window.__perfVitalsInitialized = true;
  try {
    import('@/components/gov/metrics'); // side-effect init
  } catch (_) {
    // GovernanceProvider also initializes observers; safe to ignore
  }
}