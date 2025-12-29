import { useQuery } from "@tanstack/react-query";

// Shallow field selector utility
const pick = (obj, fields) => {
  if (!fields || fields.length === 0) return obj;
  const out = {};
  fields.forEach((f) => { if (obj && Object.prototype.hasOwnProperty.call(obj, f)) out[f] = obj[f]; });
  return out;
};

export function useGovernedQuery({ key, queryFn, selectFields, enabled = true, staleTime = 60_000, gcTime = 5 * 60_000 }) {
  return useQuery({
    queryKey: key,
    enabled,
    staleTime,
    gcTime,
    refetchOnWindowFocus: false,
    retry: 1,
    keepPreviousData: true,
    queryFn: async ({ signal }) => {
      const res = await queryFn({ signal });
      if (Array.isArray(res)) return selectFields ? res.map((r) => pick(r, selectFields)) : res;
      return selectFields ? pick(res, selectFields) : res;
    },
  });
}