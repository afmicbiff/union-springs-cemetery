const memoryCache = new Map();
const MAX_MEMORY_ENTRIES = 250;

const nowMs = () => Date.now();

function getEntry(key) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt && nowMs() >= entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry;
}

function trimMemoryCache() {
  if (memoryCache.size <= MAX_MEMORY_ENTRIES) return;
  const oldestKey = memoryCache.keys().next().value;
  if (oldestKey) memoryCache.delete(oldestKey);
}

export function readMemoryCache(key) {
  const entry = getEntry(key);
  return entry ? entry.data : null;
}

export function readStaleMemoryCache(key) {
  return memoryCache.get(key)?.data ?? null;
}

export function writeMemoryCache(key, data, ttlMs) {
  const expiresAt = ttlMs ? nowMs() + Number(ttlMs) : null;
  if (memoryCache.has(key)) memoryCache.delete(key);
  memoryCache.set(key, { data, expiresAt });
  trimMemoryCache();
}

export function clearMemoryCacheByEntity(entityName) {
  for (const key of Array.from(memoryCache.keys())) {
    if (key.includes(`:${entityName}:`)) {
      memoryCache.delete(key);
    }
  }
}