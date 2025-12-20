import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch all plots in Section 1
        // We use a large limit to get them all. If > 1000, might need pagination but let's assume < 1000 for Section 1 range 1-184 duplicates.
        // Actually, listing all plots and filtering in memory is safer if filtering by property is limited.
        // But better to filter by section if possible. The SDK might not support complex filtering in .list() directly if not using .filter().
        // Let's use .filter() if available or .list() and filter.
        // The prompt context implies .filter is available.
        
        const allPlots = await base44.entities.Plot.filter({ section: 'Section 1' }, null, 2000);

        const groups = {};
        
        // 2. Group by plot_number
        for (const plot of allPlots) {
            const numStr = plot.plot_number;
            const num = parseInt(numStr.replace(/\D/g, ''));
            
            if (!isNaN(num) && num >= 1 && num <= 184) {
                if (!groups[num]) {
                    groups[num] = [];
                }
                groups[num].push(plot);
            }
        }

        const idsToDelete = [];
        const report = [];

        // 3. Find duplicates
        for (const num in groups) {
            const group = groups[num];
            if (group.length > 1) {
                // Sort to find the best one to keep
                // Criteria: 
                // 1. Status: Occupied > Reserved > Veteran > Available > others
                // 2. Has data (Names) > No data
                // 3. Updated date (Newer > Older)
                
                group.sort((a, b) => {
                    // Status priority score
                    const getStatusScore = (p) => {
                        const s = p.status || '';
                        if (s === 'Occupied' || s === 'Veteran') return 3;
                        if (s === 'Reserved') return 2;
                        if (s === 'Available') return 0;
                        return 1;
                    };
                    
                    const scoreA = getStatusScore(a);
                    const scoreB = getStatusScore(b);
                    if (scoreA !== scoreB) return scoreB - scoreA; // Higher score first

                    // Data presence score
                    const hasData = (p) => (p.first_name || p.last_name || p.family_name) ? 1 : 0;
                    if (hasData(a) !== hasData(b)) return hasData(b) - hasData(a);

                    // Updated date (Newer first)
                    const dateA = new Date(a.updated_date || 0).getTime();
                    const dateB = new Date(b.updated_date || 0).getTime();
                    return dateB - dateA;
                });

                // The first one is the "Keeper". The rest are to be deleted.
                const keeper = group[0];
                const duplicates = group.slice(1);
                
                report.push({
                    plot_number: num,
                    keeping: { id: keeper.id, status: keeper.status, name: `${keeper.first_name||''} ${keeper.last_name||''}` },
                    deleting: duplicates.map(d => d.id)
                });

                for (const d of duplicates) {
                    idsToDelete.push(d.id);
                }
            }
        }

        // 4. Delete
        const results = await Promise.all(idsToDelete.map(id => base44.entities.Plot.delete(id)));

        return Response.json({
            message: 'Deduplication complete',
            duplicates_found: idsToDelete.length,
            deleted_count: results.length,
            details: report
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});