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

export async function listEntity(entityName, { limit = 50, sort = "-updated_date", select, persist = false, ttlMs = 600000 } = {}, { signal } = {}) {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const cacheKey = persist ? makeKey('list', entityName, { limit, sort, select }) : null;
  if (cacheKey) {
    const cached = readCache(cacheKey);
    if (cached) return cached;
  }
  const data = await base44.entities[entityName].list(sort, limit);
  const arr = Array.isArray(data) ? data : [];
  const result = select ? arr.map((r) => pick(r, select)) : arr;
  if (cacheKey) writeCache(cacheKey, result, ttlMs);
  return result;
}

export async function filterEntity(entityName, filter, { limit = 50, sort = "-updated_date", select } = {}, { signal } = {}) {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const data = await base44.entities[entityName].filter(filter || {}, sort, limit);
  const arr = Array.isArray(data) ? data : [];
  return select ? arr.map((r) => pick(r, select)) : arr;
}