import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Check admin
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch Section 1 plots
        // Lowering limit to safe number, assuming < 2000 total plots in Section 1 for now
        // Using asServiceRole to ensure we can read/delete everything
        const plots = await base44.asServiceRole.entities.Plot.filter({ section: 'Section 1' }, '-updated_date', 2000);

        const groups = {};
        let duplicateGroups = 0;

        // Group by plot number
        for (const p of plots) {
            // Normalize: remove non-digits to compare "1" vs "001" vs "1 "
            const num = parseInt(String(p.plot_number).replace(/\D/g, ''));
            if (!isNaN(num) && num >= 1 && num <= 184) {
                 if (!groups[num]) groups[num] = [];
                 groups[num].push(p);
            }
        }

        const toDelete = [];

        // Identify duplicates
        for (const num in groups) {
            const list = groups[num];
            if (list.length > 1) {
                duplicateGroups++;
                
                // Sort to find keeper (highest score first)
                list.sort((a, b) => {
                    // 1. Prefer records with data (names/dates)
                    const hasData = (p) => (p.first_name || p.last_name || p.family_name || p.birth_date || p.death_date) ? 1 : 0;
                    if (hasData(a) !== hasData(b)) return hasData(b) - hasData(a);

                    // 2. Penalize "Imported" notes (prefer manual entries)
                    const isImported = (p) => (p.notes && p.notes.includes('Imported')) ? 1 : 0;
                    if (isImported(a) !== isImported(b)) return isImported(a) - isImported(b); // Lower is better (0 comes before 1)

                    // 3. Status priority (Occupied > Reserved > others)
                    const statusScore = (s) => {
                        if (s === 'Occupied') return 3;
                        if (s === 'Reserved') return 2;
                        if (s === 'Veteran') return 2;
                        return 1;
                    };
                    if (statusScore(a.status) !== statusScore(b.status)) return statusScore(b.status) - statusScore(a.status);

                    // 4. Fallback: Newer updated_date is better
                    return new Date(b.updated_date || 0) - new Date(a.updated_date || 0);
                });

                // Keep index 0, delete the rest
                for (let i = 1; i < list.length; i++) {
                    toDelete.push(list[i].id);
                }
            }
        }

        // Execute deletions in batches to avoid 500 Errors / Rate Limits
        const BATCH_SIZE = 5; 
        const deletedIds = [];
        const errors = [];

        for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
            const batch = toDelete.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async (id) => {
                try {
                    await base44.asServiceRole.entities.Plot.delete(id);
                    deletedIds.push(id);
                } catch (err) {
                    console.error(`Failed to delete ${id}:`, err);
                    errors.push({ id, error: err.message });
                }
            }));
            // Optional: small delay if needed, but usually batching is enough
        }

        return Response.json({
            success: true,
            message: `Scanned ${plots.length} plots. Found ${duplicateGroups} duplicate groups. Deleted ${deletedIds.length} records.`,
            deleted_count: deletedIds.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (e) {
        console.error("Cleanup script error:", e);
        return Response.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
});