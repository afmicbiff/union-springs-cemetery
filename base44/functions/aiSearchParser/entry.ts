import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { z } from 'npm:zod@3.24.2';

// Simple IP-based rate limiting (best-effort in-memory)
const RATE_LIMITS = { perMinute: 10, perHour: 100 };
const rateBuckets = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const minuteBucket = Math.floor(now / 60000);
  const hourBucket = Math.floor(now / 3600000);
  let rec = rateBuckets.get(ip);
  if (!rec) {
    rec = { minuteBucket, minuteCount: 0, hourBucket, hourCount: 0 };
  }
  if (rec.minuteBucket !== minuteBucket) { rec.minuteBucket = minuteBucket; rec.minuteCount = 0; }
  if (rec.hourBucket !== hourBucket) { rec.hourBucket = hourBucket; rec.hourCount = 0; }
  rec.minuteCount += 1;
  rec.hourCount += 1;
  rateBuckets.set(ip, rec);
  return rec.minuteCount > RATE_LIMITS.perMinute || rec.hourCount > RATE_LIMITS.perHour;
}

const ALLOWED_SECTIONS = ["North","South","East","West","Garden of Peace","Old Historic","all"];
function sanitizeOutput(raw, fallbackQuery) {
  const filters = raw?.filters && typeof raw.filters === 'object' ? raw.filters : {};
  const out = {
    filters: {
      q: typeof filters.q === 'string' ? filters.q.slice(0, 200) : String(fallbackQuery || '').slice(0, 200),
      family: typeof filters.family === 'string' ? filters.family.slice(0, 100) : undefined,
      section: ALLOWED_SECTIONS.includes(filters.section) ? filters.section : 'all',
      veteran: ['true','false','all'].includes(String(filters.veteran || 'all')) ? String(filters.veteran || 'all') : 'all'
    },
    related_suggestions: Array.isArray(raw?.related_suggestions) ? raw.related_suggestions.slice(0,3).map((s)=>String(s).slice(0,80)) : []
  };
  const yearOk = (y) => /^(\d{4})$/.test(String(y)) && Number(y) >= 1600 && Number(y) <= new Date().getFullYear();
  ['bMin','bMax','dMin','dMax'].forEach(k => { if (yearOk(filters[k])) out.filters[k] = String(filters[k]); });
  if (typeof raw?.explanation === 'string') out.explanation = raw.explanation.slice(0, 200);
  return out;
}

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // Handle preflight
if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
}

const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
const ua = req.headers.get('user-agent') || '';

if (isRateLimited(ip)) {
    try {
        await base44.asServiceRole.entities.SecurityEvent.create({
            event_type: 'rate_limit_exceeded',
            severity: 'medium',
            message: 'aiSearchParser rate limit exceeded',
            ip_address: ip,
            user_agent: ua,
            route: 'functions/aiSearchParser'
        });
    } catch (_) {}
    return Response.json({ error: 'Too Many Requests' }, { status: 429 });
}

const body = await req.json().catch(() => ({}));
const Schema = z.object({ query: z.string().trim().min(2).max(200) });
const parsed = Schema.safeParse(body);
if (!parsed.success) {
    return Response.json({ error: 'Invalid request: query (2-200 chars) required' }, { status: 400 });
}
const { query } = parsed.data;

// Require authentication to prevent public LLM abuse
const user = await base44.auth.me().catch(() => null);
if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

        if (!query) {
            return Response.json({ error: "Query is required" }, { status: 400 });
        }

        const currentYear = new Date().getFullYear();
const prompt = `You are a precise search-to-filters translator. Respond ONLY with valid JSON per the given schema (no prose, no markdown).

Normalize values:
- section -> one of ["North","South","East","West","Garden of Peace","Old Historic","all"] (default "all")
- veteran -> "true" | "false" | "all" (default "all")
- Years (bMin, bMax, dMin, dMax) must be 4-digit between 1600 and ${'${'}currentYear{'}'}. Omit invalid years.
Include up to 3 short related_suggestions.

User Query: "${'${'}query{'}'}"`;

        // Use schema-less call to avoid provider 'thinking' requirement; parse manually
        const responseSchema = {
    type: 'object',
    properties: {
        filters: {
            type: 'object',
            properties: {
                q: { type: 'string' },
                family: { type: 'string' },
                section: { type: 'string', enum: ALLOWED_SECTIONS },
                veteran: { type: 'string', enum: ['true','false','all'] },
                bMin: { type: 'string' },
                bMax: { type: 'string' },
                dMin: { type: 'string' },
                dMax: { type: 'string' }
            }
        },
        explanation: { type: 'string' },
        related_suggestions: { type: 'array', items: { type: 'string' } }
    },
    required: ['filters','related_suggestions']
};

const raw = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: false,
    response_json_schema: responseSchema
});
        let output = raw;
        try {
            output = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch (_) {
            output = {
                filters: { q: query, section: "all", veteran: "all" },
                explanation: "Parsed with fallback.",
                related_suggestions: ["Add a date range", "Filter by family name", "Search for veterans only"]
            };
        }

        return Response.json(sanitizeOutput(output, query));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});