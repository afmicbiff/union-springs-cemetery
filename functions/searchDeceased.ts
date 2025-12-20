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

        // Fetch all records
        const allDeceased = await base44.entities.Deceased.list('-created_date', 5000);

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

        // Calculate stats
        const totalRecords = allDeceased.length;
        const totalObituaries = allDeceased.filter(d => d.obituary && d.obituary.trim().length > 0).length;

        return Response.json({ 
            results: paginatedResults,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages
            },
            stats: {
                total_records: totalRecords,
                total_obituaries: totalObituaries
            }
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});