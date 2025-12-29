import { base44 } from "@/api/base44Client";

const pick = (obj, fields) => {
  if (!fields || fields.length === 0) return obj;
  const out = {};
  fields.forEach((f) => { if (obj && Object.prototype.hasOwnProperty.call(obj, f)) out[f] = obj[f]; });
  return out;
};

export async function listEntity(entityName, { limit = 50, sort = "-updated_date", select } = {}, { signal } = {}) {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const data = await base44.entities[entityName].list(sort, limit);
  const arr = Array.isArray(data) ? data : [];
  return select ? arr.map((r) => pick(r, select)) : arr;
}

export async function filterEntity(entityName, filter, { limit = 50, sort = "-updated_date", select } = {}, { signal } = {}) {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const data = await base44.entities[entityName].filter(filter || {}, sort, limit);
  const arr = Array.isArray(data) ? data : [];
  return select ? arr.map((r) => pick(r, select)) : arr;
}