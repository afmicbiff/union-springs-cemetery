import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { query, year, family_name, section, page = 1, limit = 12 } = await req.json();
        
        // Parse pagination params
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.max(1, parseInt(limit));

        // Fetch all records (cached by DB layer usually, or we assume fast enough for 5k records)
        const allDeceased = await base44.entities.Deceased.list('-created_date', 5000);

        const filtered = allDeceased.filter(person => {
            // 1. Section Filter (Prefix match)
            if (section && section !== 'all') {
                if (!person.plot_location || !person.plot_location.startsWith(section)) return false;
            }

            // 2. Year Filter (Partial/Includes)
            if (year) {
                if (!person.date_of_death || !person.date_of_death.includes(year)) return false;
            }

            // 3. Family Name Filter (Partial/Like)
            if (family_name) {
                if (!person.family_name || !person.family_name.toLowerCase().includes(family_name.toLowerCase())) return false;
            }

            // 4. General Search Query (Name/Last Name)
            if (query) {
                const term = query.toLowerCase();
                const firstName = person.first_name || '';
                const lastName = person.last_name || '';
                const fullName = `${firstName} ${lastName}`.toLowerCase();
                
                const matches = fullName.includes(term) || lastName.toLowerCase().includes(term);
                if (!matches) return false;
            }

            return true;
        });

        // Pagination Logic
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
            }
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});