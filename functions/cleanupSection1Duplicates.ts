import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Check admin
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch ALL plots to be safe (limit 10,000 to get everything)
        // We'll filter in memory to handle "Section 1" vs "1" vs "Section 01" mismatches
        const allPlots = await base44.asServiceRole.entities.Plot.list(null, 10000);

        const groups = {};
        const sectionNamesFound = new Set();
        let plotsInScope = 0;

        // Group by plot number, BUT only for Section 1
        for (const p of allPlots) {
            // Normalize Section Name
            // Matches "Section 1", "Section 1 ", "1", "01"
            let isSection1 = false;
            const sec = p.section ? String(p.section).trim().toLowerCase() : '';
            
            sectionNamesFound.add(p.section); // Debug info

            if (sec === 'section 1' || sec === 'section 01' || sec === '1' || sec === '01') {
                isSection1 = true;
            }

            if (!isSection1) continue;

            // Normalize Plot Number
            const num = parseInt(String(p.plot_number).replace(/\D/g, ''));
            if (!isNaN(num) && num >= 1 && num <= 184) {
                 if (!groups[num]) groups[num] = [];
                 groups[num].push(p);
                 plotsInScope++;
            }
        }

        const toDelete = [];
        let duplicateGroups = 0;

        // Identify duplicates
        for (const num in groups) {
            const list = groups[num];
            if (list.length > 1) {
                duplicateGroups++;
                
                // Sort to find keeper (highest score first)
                list.sort((a, b) => {
                    // 1. Prefer records with meaningful data (names/dates)
                    const hasData = (p) => (p.first_name || p.last_name || p.family_name || p.birth_date || p.death_date) ? 1 : 0;
                    if (hasData(a) !== hasData(b)) return hasData(b) - hasData(a);

                    // 2. Penalize "Imported" notes (prefer manual entries)
                    const isImported = (p) => (p.notes && p.notes.includes('Imported')) ? 1 : 0;
                    if (isImported(a) !== isImported(b)) return isImported(a) - isImported(b); 

                    // 3. Status priority
                    const statusScore = (s) => {
                        if (s === 'Occupied') return 3;
                        if (s === 'Reserved') return 2;
                        if (s === 'Veteran') return 2;
                        return 1;
                    };
                    if (statusScore(a.status) !== statusScore(b.status)) return statusScore(b.status) - statusScore(a.status);

                    // 4. Newer updated_date
                    return new Date(b.updated_date || 0) - new Date(a.updated_date || 0);
                });

                // Keep index 0, delete the rest
                for (let i = 1; i < list.length; i++) {
                    toDelete.push(list[i].id);
                }
            }
        }

        // Execute deletions
        const BATCH_SIZE = 10;
        const deletedIds = [];
        const errors = [];

        for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
            const batch = toDelete.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async (id) => {
                try {
                    await base44.asServiceRole.entities.Plot.delete(id);
                    deletedIds.push(id);
                } catch (err) {
                    errors.push({ id, error: err.message });
                }
            }));
        }

        return Response.json({
            success: true,
            message: `Scanned ${allPlots.length} total plots. Found ${plotsInScope} in Section 1. Found ${duplicateGroups} duplicate groups. Deleted ${deletedIds.length} records.`,
            debug_sections: Array.from(sectionNamesFound),
            deleted_count: deletedIds.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (e) {
        return Response.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
});