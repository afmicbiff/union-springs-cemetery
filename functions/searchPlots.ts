import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { 
            query, 
            status, 
            birth_year_min,
            birth_year_max,
            death_year_min,
            death_year_max,
            page = 1, 
            limit = 50 
        } = await req.json();
        
        // Parse pagination params
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.max(1, parseInt(limit));

        // Fetch all records - using service role
        const allPlots = await base44.asServiceRole.entities.Plot.list(null, 10000);

        const getYear = (dateStr) => {
            if (!dateStr) return null;
            const date = new Date(dateStr);
            return isNaN(date.getFullYear()) ? null : date.getFullYear();
        };

        const filtered = allPlots.filter(plot => {
            // 1. General Search Query
            if (query) {
                const term = query.toLowerCase();
                const searchable = [
                    plot.plot_number || '', 
                    plot.row_number || '', 
                    plot.first_name || '', 
                    plot.last_name || '', 
                    plot.notes || '',
                    plot.section || ''
                ].join(' ').toLowerCase();
                if (!searchable.includes(term)) return false;
            }

            // 2. Status Filter
            if (status && status !== 'All') {
                const isVeteran = plot.status === 'Veteran' || (plot.notes && plot.notes.toLowerCase().includes('vet') && plot.status === 'Occupied');
                
                if (status === 'Veteran') {
                    if (!isVeteran) return false;
                } else {
                    if (plot.status !== status && !(status === 'Occupied' && isVeteran)) return false;
                }
            }

            // 3. Birth Year Range
            if (birth_year_min || birth_year_max) {
                const birthYear = getYear(plot.birth_date);
                if (!birthYear) return false;
                if (birth_year_min && birthYear < parseInt(birth_year_min)) return false;
                if (birth_year_max && birthYear > parseInt(birth_year_max)) return false;
            }

            // 4. Death Year Range
            if (death_year_min || death_year_max) {
                const deathYear = getYear(plot.death_date);
                if (!deathYear) return false;
                if (death_year_min && deathYear < parseInt(death_year_min)) return false;
                if (death_year_max && deathYear > parseInt(death_year_max)) return false;
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