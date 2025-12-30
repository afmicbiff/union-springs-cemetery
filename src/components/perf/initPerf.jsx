import { initWebVitals } from './webVitals';
import { installFetchGuards } from './netGuard';

export function initPerf() {
  if (typeof window === 'undefined') return;
  if (window.__perfInitDone) return;
  initWebVitals();
  installFetchGuards();
  window.__perfInitDone = true;
}