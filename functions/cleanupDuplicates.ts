import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Fetch all Section 1 plots
        // We need to handle pagination if > 1000, but let's try to fetch 2000
        const plots = await base44.entities.Plot.filter({ section: 'Section 1' }, '-created_date', 2000);
        
        const groups = {};
        plots.forEach(p => {
            // Normalize plot number
            const num = String(p.plot_number).trim();
            if (!groups[num]) groups[num] = [];
            groups[num].push(p);
        });
        
        const deleteIds = [];
        const details = [];
        
        for (const num in groups) {
            const group = groups[num];
            // Only consider duplicates if count > 1
            if (group.length > 1) {
                // Logic to sort:
                // 1. Prefer ones that are NOT "Imported" notes (keep these at top/index 0)
                // 2. Prefer ones with more filled fields (e.g. first_name)
                // 3. Prefer newer created_date
                
                group.sort((a, b) => {
                    const aImported = a.notes === 'Imported';
                    const bImported = b.notes === 'Imported';
                    if (aImported && !bImported) return 1; // b comes first
                    if (!aImported && bImported) return -1; // a comes first
                    
                    // Both same imported status, check fields
                    const aHasName = a.first_name || a.last_name || a.family_name;
                    const bHasName = b.first_name || b.last_name || b.family_name;
                    if (aHasName && !bHasName) return -1;
                    if (!aHasName && bHasName) return 1;
                    
                    // Fallback to creation date (newer is better)
                    return new Date(b.created_date) - new Date(a.created_date);
                });
                
                // Keep group[0], delete rest
                for (let i = 1; i < group.length; i++) {
                    deleteIds.push(group[i].id);
                    details.push(`Deleting duplicate Plot ${num} (ID: ${group[i].id}) in favor of ID: ${group[0].id}`);
                }
            }
        }
        
        // Perform deletions in parallel
        await Promise.all(deleteIds.map(id => base44.entities.Plot.delete(id)));
        
        return Response.json({ 
            success: true, 
            deletedCount: deleteIds.length,
            message: `Deleted ${deleteIds.length} duplicate plots.`,
            details: details
        });
        
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});