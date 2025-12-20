import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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
            page = 1, 
            limit = 12 
        } = await req.json();
        
        // Parse pagination params
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.max(1, parseInt(limit));

        // Fetch all records - using service role to ensure we get full count including any potential visibility issues
        // Although admin should see all, this guarantees the stats are for the DB
        const [allDeceased, allPlots] = await Promise.all([
            base44.asServiceRole.entities.Deceased.list('-created_date', 5000),
            base44.asServiceRole.entities.Plot.list(null, 5000)
        ]);
        const reservedPlotsCount = allPlots.filter(p => p.status === 'Reserved').length;

        const getYear = (dateStr) => {
            if (!dateStr) return null;
            // Handle YYYY-MM-DD or simple YYYY
            const parts = dateStr.split('-');
            if (parts.length > 0) return parseInt(parts[0]);
            return null;
        };

        const filtered = allDeceased.filter(person => {
            // 1. Section Filter (Prefix match)
            if (section && section !== 'all') {
                if (!person.plot_location || !person.plot_location.startsWith(section)) return false;
            }

            // 2. Family Name Filter (Partial/Like)
            if (family_name) {
                if (!person.family_name || !person.family_name.toLowerCase().includes(family_name.toLowerCase())) return false;
            }

            // 3. General Search Query (Name/Last Name)
            if (query) {
                const term = query.toLowerCase();
                const firstName = person.first_name || '';
                const lastName = person.last_name || '';
                const fullName = `${firstName} ${lastName}`.toLowerCase();
                
                const matches = fullName.includes(term) || lastName.toLowerCase().includes(term);
                if (!matches) return false;
            }

            // 4. Veteran Status
            if (veteran_status && veteran_status !== 'all') {
                const isVet = !!person.veteran_status;
                if (veteran_status === 'true' && !isVet) return false;
                if (veteran_status === 'false' && isVet) return false;
            }

            // 5. Birth Year Range
            const birthYear = getYear(person.date_of_birth);
            if (birthYear) {
                if (birth_year_min && birthYear < parseInt(birth_year_min)) return false;
                if (birth_year_max && birthYear > parseInt(birth_year_max)) return false;
            } else if (birth_year_min || birth_year_max) {
                // If filtering by birth year but person has no birth date, exclude them? 
                // Usually yes in strict search.
                return false;
            }

            // 6. Death Year Range
            const deathYear = getYear(person.date_of_death);
            if (deathYear) {
                if (death_year_min && deathYear < parseInt(death_year_min)) return false;
                if (death_year_max && deathYear > parseInt(death_year_max)) return false;
            } else if (death_year_min || death_year_max) {
                return false;
            }

            return true;
        });

        // Pagination Logic
        const total = filtered.length;
        const totalPages = Math.ceil(total / limitNum);
        const startIndex = (pageNum - 1) * limitNum;
        const paginatedResults = filtered.slice(startIndex, startIndex + limitNum);

        // Calculate stats with deduplication to handle potential double-imports
        // We consider a record unique based on First Name + Last Name + Birth Date + Death Date
        const uniqueKeys = new Set();
        const uniqueObituaries = new Set();
        
        allDeceased.forEach(d => {
            const key = `${d.first_name || ''}|${d.last_name || ''}|${d.date_of_birth || ''}|${d.date_of_death || ''}`.toLowerCase();
            uniqueKeys.add(key);
            
            if (d.obituary && d.obituary.trim().length > 0) {
                uniqueObituaries.add(key);
            }
        });

        const totalUniqueRecords = uniqueKeys.size;
        const totalUniqueObituaries = uniqueObituaries.size;

        return Response.json({ 
            results: paginatedResults,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages
            },
            stats: {
                total_records: totalUniqueRecords, // Display unique individuals
                total_obituaries: totalUniqueObituaries,
                total_reserved: reservedPlotsCount,
                raw_total: allDeceased.length // Keep raw count for debugging
            }
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});