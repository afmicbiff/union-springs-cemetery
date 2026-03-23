import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Fuse from 'npm:fuse.js@^7.0.0';

const CACHE_TTL_MS = 60_000;
const DATASET_TTL_MS = 5 * 60_000;
const __cache = new Map();
const datasetCache = {
  deceased: { t: 0, raw: null, mapped: null },
  plots: { t: 0, raw: null, mapped: null }
};

async function getPreparedDataset(key, loader, mapper) {
  const now = Date.now();
  const cached = datasetCache[key];
  if (cached?.mapped && (now - cached.t) < DATASET_TTL_MS) {
    return cached;
  }
  const raw = await loader();
  const mapped = raw.map(mapper);
  datasetCache[key] = { t: now, raw, mapped };
  return datasetCache[key];
}

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { 
            query, 
            family_name, 
            section, 
            birth_year_min,
            birth_year_max,
            death_year_min,
            death_year_max,
            veteran_status,
            status_filter, // New filter: 'Deceased', 'Reserved', 'Available', 'Not Usable', 'Unknown', 'Veteran', 'All'
            page = 1, 
            limit = 50 
        } = await req.json();
        
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.max(1, parseInt(limit));

        // Simple in-memory cache to reduce repeated heavy queries
        const cacheKey = JSON.stringify({ query, family_name, section, birth_year_min, birth_year_max, death_year_min, death_year_max, veteran_status, status_filter, page: pageNum, limit: limitNum });
        const now = Date.now();
        const cached = __cache.get(cacheKey);
        if (cached && (now - cached.t) < CACHE_TTL_MS) {
            return Response.json(cached.data);
        }

        // Fetch only what's needed (reduce repeated large scans)
        let allDeceased = [];
        let allPlots = [];

        const needsDeceased = !status_filter || ['Deceased', 'Veteran', 'All'].includes(status_filter);
        const needsPlots = ['Reserved', 'Available', 'Unknown', 'Not Usable', 'Veteran', 'All'].includes(status_filter);

        // Helper to format plot location
        const formatPlotLoc = (p) => {
            const parts = [];
            if(p.section) parts.push(p.section);
            if(p.row_number) parts.push(p.row_number);
            if(p.plot_number) parts.push(p.plot_number);
            return parts.join('-');
        };

        // Map Plots to Unified Record Schema
        const mapPlotToRecord = (p) => {
            const record = {
                id: p.id,
                entity_type: 'plot',
                first_name: p.first_name,
                last_name: p.last_name,
                family_name: p.family_name,
                date_of_birth: p.birth_date,
                date_of_death: p.death_date,
                plot_location: formatPlotLoc(p),
                status: p.status,
                veteran_status: p.status === 'Veteran' || (p.notes && p.notes.toLowerCase().includes('vet')),
                notes: p.notes,
                burial_type: null,
                obituary: null
            };
            record._search = `${record.first_name || ''} ${record.last_name || ''} ${record.family_name || ''} ${record.plot_location || ''} ${record.notes || ''}`.toLowerCase();
            return record;
        };

        // Map Deceased to Unified Record Schema
        const mapDeceasedToRecord = (d) => {
            const record = {
                ...d,
                entity_type: 'deceased',
                status: 'Occupied'
            };
            record._search = `${record.first_name || ''} ${record.last_name || ''} ${record.family_name || ''} ${record.plot_location || ''} ${record.obituary || ''} ${record.notes || ''}`.toLowerCase();
            return record;
        };

        if (needsDeceased) {
            const preparedDeceased = await getPreparedDataset('deceased', () => base44.entities.Deceased.list('-created_date', 10000), mapDeceasedToRecord);
            allDeceased = preparedDeceased.mapped;
        }

        if (needsPlots) {
            const preparedPlots = await getPreparedDataset('plots', () => base44.entities.Plot.list('-created_date', 10000), mapPlotToRecord);
            allPlots = preparedPlots.mapped;
        }

        // Determine Base Set based on Status Filter
        let baseRecords = [];
        
        // Stats Calculation
        const reservedPlots = allPlots.filter(p => p.status === 'Reserved');
        const availablePlots = allPlots.filter(p => p.status === 'Available');
        const notUsablePlots = allPlots.filter(p => ['Not Usable', 'Unavailable'].includes(p.status));
        const unknownPlots = allPlots.filter(p => p.status === 'Unknown');
        const veteranPlots = allPlots.filter(p => p.status === 'Veteran'); // Plots explicitly marked Veteran
        const deceasedVeterans = allDeceased.filter(d => d.veteran_status);

        // Deduplication for stats (same as before)
        const uniqueKeys = new Set();
        const uniqueObituaries = new Set();
        const uniqueVeterans = new Set();
        allDeceased.forEach(d => {
            const key = `${d.first_name || ''}|${d.last_name || ''}|${d.date_of_birth || ''}|${d.date_of_death || ''}`.toLowerCase();
            uniqueKeys.add(key);
            if (d.obituary && d.obituary.trim().length > 0) uniqueObituaries.add(key);
            if (!!d.veteran_status) uniqueVeterans.add(key);
        });

        // Total Veterans = Deceased Veterans (unique) + Veteran Plots (assuming not dupes, or just sum counts?)
        // For simplicity/safety, we'll just use the Deceased Veteran count + Veteran Plot count.
        const totalVeteransCount = uniqueVeterans.size + veteranPlots.length;

        // Select Records
        if (!status_filter || status_filter === 'Deceased') {
            baseRecords = allDeceased.map(mapDeceasedToRecord);
        } else if (status_filter === 'Reserved') {
            baseRecords = reservedPlots.map(mapPlotToRecord);
        } else if (status_filter === 'Available') {
            baseRecords = availablePlots.map(mapPlotToRecord);
        } else if (status_filter === 'Not Usable') {
            baseRecords = notUsablePlots.map(mapPlotToRecord);
        } else if (status_filter === 'Unknown') {
            baseRecords = unknownPlots.map(mapPlotToRecord);
        } else if (status_filter === 'Veteran') {
            const vDeceased = deceasedVeterans.map(mapDeceasedToRecord);
            const vPlots = veteranPlots.map(mapPlotToRecord);
            baseRecords = [...vDeceased, ...vPlots];
        } else if (status_filter === 'All') {
            // Deceased + Reserved + Available + Not Usable + Unknown (Plots)
            // Exclude 'Occupied' plots to avoid duplication with Deceased records
            const nonOccupiedPlots = allPlots.filter(p => 
                ['Reserved', 'Available', 'Not Usable', 'Unavailable', 'Unknown'].includes(p.status)
            );
            baseRecords = [
                ...allDeceased.map(mapDeceasedToRecord),
                ...nonOccupiedPlots.map(mapPlotToRecord)
            ];
        } else {
            // Fallback
            baseRecords = allDeceased.map(mapDeceasedToRecord);
        }

        // Apply Common Filters (Query, Date, Section, etc.)
        const getYear = (dateStr) => {
            if (!dateStr) return null;
            const parts = dateStr.split('-');
            if (parts.length > 0) return parseInt(parts[0]);
            return null;
        };

        // 1. First apply strict filters (non-fuzzy) to reduce dataset
        let filtered = baseRecords.filter(record => {
            // Section
            if (section && section !== 'all') {
                if (!record.plot_location || !record.plot_location.startsWith(section)) return false;
            }

            // Family Name (kept as strict filter for specific field search)
            if (family_name) {
                if (!record.family_name || !record.family_name.toLowerCase().includes(family_name.toLowerCase())) return false;
            }

            // Veteran Status
            if (veteran_status && veteran_status !== 'all') {
                const isVet = !!record.veteran_status;
                if (veteran_status === 'true' && !isVet) return false;
                if (veteran_status === 'false' && isVet) return false;
            }

            // Dates
            const birthYear = getYear(record.date_of_birth);
            if (birthYear) {
                if (birth_year_min && birthYear < parseInt(birth_year_min)) return false;
                if (birth_year_max && birthYear > parseInt(birth_year_max)) return false;
            }

            const deathYear = getYear(record.date_of_death);
            if (deathYear) {
                if (death_year_min && deathYear < parseInt(death_year_min)) return false;
                if (death_year_max && deathYear > parseInt(death_year_max)) return false;
            }

            return true;
        });

        // 2. Apply Fuzzy Search if query exists (guard for huge datasets)
        if (query && String(query).trim().length >= 2) {
            if (filtered.length <= 5000) {
                const q = String(query).trim().toLowerCase();

                // Phase 1: Exact prefix/substring matches first (highest priority)
                const exactMatches = [];
                const rest = [];
                for (const r of filtered) {
                    const fn = (r.first_name || '').toLowerCase();
                    const ln = (r.last_name || '').toLowerCase();
                    const fam = (r.family_name || '').toLowerCase();
                    const loc = (r.plot_location || '').toLowerCase();
                    const searchText = r._search || '';
                    if (ln.startsWith(q) || fn.startsWith(q) || fam.startsWith(q) || loc.includes(q) || searchText.includes(q)) {
                        exactMatches.push(r);
                    } else if (ln.includes(q) || fn.includes(q) || fam.includes(q)) {
                        exactMatches.push(r);
                    } else {
                        rest.push(r);
                    }
                }

                // Phase 2: Fuzzy search on remaining records only
                let fuzzyMatches = [];
                if (rest.length > 0) {
                    const fuse = new Fuse(rest, {
                        keys: [
                            { name: 'first_name', weight: 0.5 },
                            { name: 'last_name', weight: 0.5 },
                            { name: 'family_name', weight: 0.3 },
                            { name: 'plot_location', weight: 0.2 }
                        ],
                        threshold: 0.15,
                        distance: 80,
                        ignoreLocation: true,
                        minMatchCharLength: 2,
                        includeScore: true
                    });
                    fuzzyMatches = fuse.search(q).map(r => r.item);
                }

                // Sort exact matches: startsWith first, then contains
                exactMatches.sort((a, b) => {
                    const aLn = (a.last_name || '').toLowerCase();
                    const bLn = (b.last_name || '').toLowerCase();
                    const aStarts = aLn.startsWith(q) ? 0 : 1;
                    const bStarts = bLn.startsWith(q) ? 0 : 1;
                    if (aStarts !== bStarts) return aStarts - bStarts;
                    return aLn.localeCompare(bLn);
                });

                filtered = [...exactMatches, ...fuzzyMatches];
            } else {
                const q = String(query).toLowerCase();
                filtered = filtered.filter(r => (
                    (r._search && r._search.includes(q)) ||
                    ((r.obituary && r.obituary.toLowerCase().includes(q)) && (family_name || section || veteran_status === 'true')) ||
                    ((r.notes && String(r.notes).toLowerCase().includes(q)) && (family_name || section || veteran_status === 'true'))
                ));
            }
        }

        // Veteran Status logic was moved up to pre-filtering
        /* 
            // Veteran Status (Explicit filter param, overrides status_filter='Veteran' if both present?)

            // Usually 'veteran_status' param comes from the advanced filter dropdown.
            */

              // Pagination
        const total = filtered.length;
        const totalPages = Math.ceil(total / limitNum);
        const startIndex = (pageNum - 1) * limitNum;
        const paginatedResults = filtered.slice(startIndex, startIndex + limitNum);

        const payload = { 
            results: paginatedResults.map(({ _search, ...record }) => record),
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages
            },
            stats: {
                total_records: uniqueKeys.size,
                total_obituaries: uniqueObituaries.size,
                total_veterans: totalVeteransCount,
                total_reserved: reservedPlots.length,
                total_available: availablePlots.length,
                total_not_usable: notUsablePlots.length,
                total_unknown: unknownPlots.length,
                raw_total: allDeceased.length
            },
            timings: {
                generated_at: new Date().toISOString(),
                dataset_cache_ttl_ms: DATASET_TTL_MS,
                response_cache_ttl_ms: CACHE_TTL_MS
            }
        };
        __cache.set(cacheKey, { t: now, data: payload });
        return Response.json(payload);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});