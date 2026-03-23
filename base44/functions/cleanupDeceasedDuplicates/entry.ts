import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Ensure admin authentication
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
             return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all records (service role to get everything)
        const allDeceased = await base44.asServiceRole.entities.Deceased.list('-created_date', 5000);

        const groups = {};
        
        // 1. Group by unique key
        // Key composition: First Name | Last Name | Birth Date | Death Date
        for (const record of allDeceased) {
            const key = `${record.first_name?.trim() || ''}|${record.last_name?.trim() || ''}|${record.date_of_birth || ''}|${record.date_of_death || ''}`.toLowerCase();
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(record);
        }

        let deletedCount = 0;
        let groupsProcessed = 0;

        // 2. Process duplicates
        for (const key in groups) {
            const records = groups[key];
            
            // Only process if we have duplicates
            if (records.length > 1) {
                groupsProcessed++;
                
                // Score records to find the "best" one to keep
                // Score = number of non-null/non-empty fields
                const scored = records.map(r => {
                    let score = 0;
                    Object.values(r).forEach(v => {
                        if (v !== null && v !== undefined && v !== '') score++;
                    });
                    return { record: r, score };
                });

                // Sort descending by score (completeness), then by updated_date (newest first)
                scored.sort((a, b) => {
                    if (b.score !== a.score) return b.score - a.score;
                    // If scores tied, prefer the most recently updated one
                    const dateA = new Date(a.record.updated_date || 0).getTime();
                    const dateB = new Date(b.record.updated_date || 0).getTime();
                    return dateB - dateA;
                });

                // Keep the first one (highest score/newest)
                const master = scored[0].record;
                const duplicates = scored.slice(1).map(s => s.record);

                // Delete the others
                for (const dup of duplicates) {
                    await base44.entities.Deceased.delete(dup.id);
                    deletedCount++;
                }
            }
        }

        return Response.json({ 
            success: true, 
            message: `Cleanup complete. Found ${groupsProcessed} sets of duplicates. Deleted ${deletedCount} redundant records.`,
            deleted: deletedCount,
            unique_records: Object.keys(groups).length
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});