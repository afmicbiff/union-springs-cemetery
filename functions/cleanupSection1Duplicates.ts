import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // Check admin
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch Section 1 plots using service role to ensure full access
        const plots = await base44.asServiceRole.entities.Plot.filter({ section: 'Section 1' }, '-updated_date', 3000);

        const groups = {};
        let duplicateGroups = 0;

        // Group by plot number
        for (const p of plots) {
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
                // Sort to find keeper: 
                // 1. Has meaningful data
                // 2. Not an "Imported" note (prefer manually edited/cleaned)
                // 3. Status is Occupied/Reserved
                // 4. Newer update
                list.sort((a, b) => {
                    const aData = (a.first_name || a.last_name || a.family_name) ? 1 : 0;
                    const bData = (b.first_name || b.last_name || b.family_name) ? 1 : 0;
                    if (aData !== bData) return bData - aData; // Higher score first

                    const aImp = (a.notes && a.notes.includes('Imported')) ? 1 : 0;
                    const bImp = (b.notes && b.notes.includes('Imported')) ? 1 : 0;
                    if (aImp !== bImp) return aImp - bImp; // Lower import score first (cleaner)

                    const score = (s) => (s === 'Occupied' || s === 'Reserved') ? 2 : 1;
                    if (score(a.status) !== score(b.status)) return score(b.status) - score(a.status);

                    return new Date(b.updated_date) - new Date(a.updated_date);
                });

                // Keep list[0], delete the rest
                for (let i = 1; i < list.length; i++) {
                    toDelete.push(list[i].id);
                }
            }
        }

        // Execute deletions
        const results = await Promise.all(toDelete.map(id => base44.asServiceRole.entities.Plot.delete(id)));

        return Response.json({
            success: true,
            message: `Scanned ${plots.length} plots. Found ${duplicateGroups} duplicate groups. Deleted ${results.length} records.`,
            deleted_count: results.length
        });

    } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
    }
});