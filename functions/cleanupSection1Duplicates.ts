import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // List ALL plots to ensure we don't miss anything
        const allPlots = await base44.asServiceRole.entities.Plot.list(null, 10000);

        const groups = {};
        const debugInfo = {};

        for (const p of allPlots) {
            // lenient section check: if it contains "1" or is null/empty (could be imported wrong)
            // AND the plot number is in range
            const sec = p.section ? String(p.section).trim().toLowerCase() : '';
            const row = p.row_number ? String(p.row_number).trim() : '';
            
            // Normalize Plot Number
            const numVal = parseInt(String(p.plot_number).replace(/\D/g, ''));

            if (isNaN(numVal)) continue;

            // Target range 1-184 (covering 90-139)
            if (numVal >= 1 && numVal <= 184) {
                
                // Heuristic: It's likely Section 1 if:
                // 1. Section says "1"
                // 2. Section is empty but Plot number is in this specific range (Section 1 is the main/oldest part)
                // 3. Row matches typical Section 1 rows (usually A-Z or similar, but let's be broad)
                
                // We want to group BY NUMBER primarily.
                // If we have "Section 1, Plot 90" and "Section 2, Plot 90", we shouldn't merge them.
                // But user says duplicates are in 90-139. 
                
                // Let's filter strict on Section 1 OR potential candidates
                let isCandidate = false;
                if (sec.includes('1') || sec === 'section 1' || sec === '01' || sec === '') {
                    isCandidate = true;
                }
                
                if (isCandidate) {
                     if (!groups[numVal]) groups[numVal] = [];
                     groups[numVal].push(p);

                     // Debug specifically for user's range
                     if (numVal >= 90 && numVal <= 139) {
                         if (!debugInfo[numVal]) debugInfo[numVal] = [];
                         debugInfo[numVal].push({
                             id: p.id,
                             sec: p.section,
                             row: p.row_number,
                             status: p.status,
                             name: (p.first_name||'') + ' ' + (p.last_name||''),
                             updated: p.updated_date
                         });
                     }
                }
            }
        }

        const toDelete = [];
        let duplicateGroups = 0;

        for (const num in groups) {
            const list = groups[num];
            if (list.length > 1) {
                duplicateGroups++;
                
                // Sort to find keeper
                list.sort((a, b) => {
                    // Score 1: Has Data
                    const hasData = (p) => (p.first_name || p.last_name || p.family_name) ? 5 : 0;
                    
                    // Score 2: "Imported" note penalty
                    const importPenalty = (p) => (p.notes && p.notes.includes('Imported')) ? -2 : 0;

                    // Score 3: Status
                    const statusScore = (p) => {
                        if (p.status === 'Occupied') return 3;
                        if (p.status === 'Reserved') return 2;
                        if (p.status === 'Veteran') return 2;
                        return 0;
                    };

                    // Score 4: Section name cleanliness (prefer "Section 1" over "1" or "")
                    const secScore = (p) => {
                        const s = p.section || '';
                        if (s.toLowerCase() === 'section 1') return 1;
                        return 0;
                    };

                    const scoreA = hasData(a) + importPenalty(a) + statusScore(a) + secScore(a);
                    const scoreB = hasData(b) + importPenalty(b) + statusScore(b) + secScore(b);

                    if (scoreA !== scoreB) return scoreB - scoreA; // Higher score first

                    // Tie-break: Newer update
                    return new Date(b.updated_date || 0) - new Date(a.updated_date || 0);
                });

                // Keep top 1, delete others
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
            message: `Scanned plots. Found ${duplicateGroups} duplicate groups. Deleted ${deletedIds.length} records.`,
            deleted_count: deletedIds.length,
            debug_90_139: debugInfo, // Return this so user can see what's happening
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (e) {
        return Response.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
});