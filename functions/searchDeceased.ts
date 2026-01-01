import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Fuse from 'npm:fuse.js@^7.0.0';

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

        // Fetch only what's needed (reduce load)
        let allDeceased = [];
        let allPlots = [];

        if (!status_filter || status_filter === 'Deceased') {
            allDeceased = await base44.asServiceRole.entities.Deceased.list('-created_date', 10000);
        } else if (['Reserved','Available','Unknown'].includes(status_filter)) {
            allPlots = await base44.asServiceRole.entities.Plot.filter({ status: status_filter }, '-created_date', 10000);
        } else if (status_filter === 'Not Usable') {
            allPlots = await base44.asServiceRole.entities.Plot.filter({ status: { $in: ['Not Usable','Unavailable'] } }, '-created_date', 10000);
        } else if (status_filter === 'Veteran') {
            allDeceased = await base44.asServiceRole.entities.Deceased.filter({ veteran_status: true }, '-created_date', 10000);
            allPlots = await base44.asServiceRole.entities.Plot.filter({ status: 'Veteran' }, '-created_date', 10000);
        } else if (status_filter === 'All') {
            allDeceased = await base44.asServiceRole.entities.Deceased.list('-created_date', 10000);
            allPlots = await base44.asServiceRole.entities.Plot.filter({ status: { $in: ['Reserved','Available','Not Usable','Unavailable','Unknown','Veteran'] } }, '-created_date', 10000);
        } else {
            allDeceased = await base44.asServiceRole.entities.Deceased.list('-created_date', 10000);
        }

        // Helper to format plot location
        const formatPlotLoc = (p) => {
            const parts = [];
            if(p.section) parts.push(p.section);
            if(p.row_number) parts.push(p.row_number);
            if(p.plot_number) parts.push(p.plot_number);
            return parts.join('-');
        };

        // Map Plots to Unified Record Schema
        const mapPlotToRecord = (p) => ({
            id: p.id,
            entity_type: 'plot',
            first_name: p.first_name, // Might be empty for Available
            last_name: p.last_name,
            family_name: p.family_name,
            date_of_birth: p.birth_date,
            date_of_death: p.death_date,
            plot_location: formatPlotLoc(p),
            status: p.status, // Available, Reserved, etc.
            veteran_status: p.status === 'Veteran' || (p.notes && p.notes.toLowerCase().includes('vet')),
            notes: p.notes,
            // Fields that exist on Deceased but maybe not Plot
            burial_type: null,
            obituary: null
        });

        // Map Deceased to Unified Record Schema
        const mapDeceasedToRecord = (d) => ({
            ...d,
            entity_type: 'deceased',
            status: 'Occupied' // Implicit
        });

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

        // 2. Apply Fuzzy Search if query exists
        if (query) {
            const fuse = new Fuse(filtered, {
                keys: [
                    { name: 'first_name', weight: 0.3 },
                    { name: 'last_name', weight: 0.4 },
                    { name: 'family_name', weight: 0.2 },
                    { name: 'plot_location', weight: 0.3 },
                    { name: 'obituary', weight: 0.1 },
                    { name: 'notes', weight: 0.1 }
                ],
                threshold: 0.4, // Match algorithm sensitivity (0.0 = perfect match, 1.0 = match anything)
                distance: 100,
                includeScore: true
            });

            const fuzzyResults = fuse.search(query);
            // Fuse returns { item, score, ... }. map back to item
            filtered = fuzzyResults.map(result => result.item);
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

        return Response.json({ 
            results: paginatedResults,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages
            },
            stats: {
                total_records: uniqueKeys.size, // Deceased count
                total_obituaries: uniqueObituaries.size,
                total_veterans: totalVeteransCount,
                total_reserved: reservedPlots.length,
                total_available: availablePlots.length,
                total_not_usable: notUsablePlots.length,
                total_unknown: unknownPlots.length,
                raw_total: allDeceased.length
            }
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});