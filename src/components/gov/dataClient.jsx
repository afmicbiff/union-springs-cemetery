import { base44 } from "@/api/base44Client";

// Persistent cache helpers
const CACHE_PREFIX = 'pcache:v1:';
const nowMs = () => (typeof Date !== 'undefined' ? Date.now() : 0);
function makeKey(op, entityName, args) {
  try {
    return CACHE_PREFIX + op + ':' + entityName + ':' + btoa(encodeURIComponent(JSON.stringify(args || {})));
  } catch {
    return CACHE_PREFIX + op + ':' + entityName;
  }
}
function readCache(key) {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const { data, expiresAt } = JSON.parse(raw);
    if (expiresAt && nowMs() < expiresAt) return data;
    window.localStorage.removeItem(key);
    return null;
  } catch {
    return null;
  }
}
function writeCache(key, data, ttlMs) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const expiresAt = ttlMs ? nowMs() + Number(ttlMs) : null;
    window.localStorage.setItem(key, JSON.stringify({ data, expiresAt }));
  } catch {
    // ignore quota or serialization errors
  }
}

const pick = (obj, fields) => {
  if (!fields || fields.length === 0) return obj;
  const out = {};
  fields.forEach((f) => { if (obj && Object.prototype.hasOwnProperty.call(obj, f)) out[f] = obj[f]; });
  return out;
};

const inFlight = new Map();

export async function listEntity(entityName, { limit = 50, sort = "-updated_date", select, persist = false, ttlMs = 600000 } = {}, { signal } = {}) {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const cacheKey = persist ? makeKey('list', entityName, { limit, sort, select }) : null;
  if (cacheKey) {
    const cached = readCache(cacheKey);
    if (cached) return cached;
  }
  const reqKey = makeKey('list', entityName, { limit, sort, select });
  if (inFlight.has(reqKey)) return inFlight.get(reqKey);
  const p = (async () => {
    const data = await base44.entities[entityName].list(sort, limit);
    const arr = Array.isArray(data) ? data : [];
    const result = select ? arr.map((r) => pick(r, select)) : arr;
    if (cacheKey) writeCache(cacheKey, result, ttlMs);
    return result;
  })();
  inFlight.set(reqKey, p);
  try {
    return await p;
  } finally {
    inFlight.delete(reqKey);
  }
}

export async function filterEntity(entityName, filter, { limit = 50, sort = "-updated_date", select, persist = false, ttlMs = 600000 } = {}, { signal } = {}) {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const cacheKey = persist ? makeKey('filter', entityName, { filter, limit, sort, select }) : null;
  if (cacheKey) {
    const cached = readCache(cacheKey);
    if (cached) return cached;
  }
  const reqKey = makeKey('filter', entityName, { filter, limit, sort, select });
  if (inFlight.has(reqKey)) return inFlight.get(reqKey);
  const p = (async () => {
    const data = await base44.entities[entityName].filter(filter || {}, sort, limit);
    // Force no persistence layer issues
    if (!Array.isArray(data)) return [];
    const arr = Array.isArray(data) ? data : [];
    const result = select ? arr.map((r) => pick(r, select)) : arr;
    if (cacheKey) writeCache(cacheKey, result, ttlMs);
    return result;
  })();
  inFlight.set(reqKey, p);
  try {
    return await p;
  } finally {
    inFlight.delete(reqKey);
  }
}

export function clearEntityCache(entityName) {
  // Clear persisted cache entries for this entity
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const k = window.localStorage.key(i);
        if (!k) continue;
        if (k.startsWith(CACHE_PREFIX) && k.includes(`:${entityName}:`)) {
          window.localStorage.removeItem(k);
        }
      }
    } catch {
      // ignore
    }
  }
  // Clear any in-flight deduped requests for this entity
  try {
    for (const key of Array.from(inFlight.keys())) {
      if (key.includes(`:${entityName}:`)) {
        inFlight.delete(key);
      }
    }
  } catch {
    // ignore
  }
}