import { lazy } from 'react';

/**
 * Enterprise-grade lazy import with retry + cache-busting reload.
 *
 * Strategy:
 * 1. Try the import.
 * 2. On failure, wait 800ms then retry once (handles transient network blips).
 * 3. On second failure, bust the module cache and reload the page ONCE.
 *    - Uses sessionStorage to prevent infinite reload loops.
 *    - After reload, the browser fetches fresh module URLs from the server.
 * 4. If we already reloaded for this module and it still fails, throw —
 *    the Error Boundary will catch it and show a recovery UI.
 */

const RELOAD_FLAG_PREFIX = 'module-reload:';

export default function lazyWithRetry(importFn, moduleId) {
  return lazy(() => {
    const flagKey = RELOAD_FLAG_PREFIX + (moduleId || importFn.toString().slice(0, 120));

    return importFn()
      .catch(() => {
        // Retry once after a brief delay
        return new Promise((resolve) => setTimeout(resolve, 800)).then(() => importFn());
      })
      .catch((err) => {
        // Both attempts failed — check if we already reloaded for this module
        const alreadyReloaded = sessionStorage.getItem(flagKey);

        if (!alreadyReloaded) {
          // Mark that we're about to reload for this module
          sessionStorage.setItem(flagKey, Date.now().toString());

          // Reload the page to get fresh module URLs from the server
          window.location.reload();

          // Return a never-resolving promise so React doesn't try to render
          // while the page is reloading
          return new Promise(() => {});
        }

        // We already reloaded once and it still failed — clean up flag and throw
        // so the Error Boundary can catch it and show a recovery UI
        sessionStorage.removeItem(flagKey);
        throw err;
      });
  });
}

/**
 * Clear all module reload flags. Call this on successful app mount
 * to reset the reload tracking for future navigations.
 */
export function clearModuleReloadFlags() {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(RELOAD_FLAG_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // sessionStorage may be unavailable in some contexts
  }
}