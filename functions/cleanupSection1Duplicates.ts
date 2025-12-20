import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // List ALL plots
        const allPlots = await base44.asServiceRole.entities.Plot.list(null, 10000);

        const groups = {};
        const rangeStart = 93;
        const rangeEnd = 139;
        
        // Debug counters
        let inRangeCount = 0;
        let candidateCount = 0;

        for (const p of allPlots) {
            // Normalize Plot Number
            const numVal = parseInt(String(p.plot_number).replace(/\D/g, ''));
            if (isNaN(numVal)) continue;

            // Target range 93-139
            if (numVal >= rangeStart && numVal <= rangeEnd) {
                inRangeCount++;
                
                // Section check
                const sec = p.section ? String(p.section).trim().toLowerCase() : '';
                
                // Exclude explicit other sections
                if (sec.includes('section 2') || sec.includes('section 3') || 
                    sec.includes('section 4') || sec.includes('section 5') ||
                    sec.includes('row')) {
                    continue;
                }

                // Treat as candidate for Section 1 duplicate group
                if (!groups[numVal]) groups[numVal] = [];
                groups[numVal].push(p);
                candidateCount++;
            }
        }

        const toDelete = [];
        let duplicateGroups = 0;
        const debugGroups = {};

        for (const num in groups) {
            const list = groups[num];
            if (list.length > 1) {
                duplicateGroups++;
                
                // Sort to find keeper
                list.sort((a, b) => {
                    // 1. Data richness (names/dates)
                    const dataScore = (p) => {
                        let s = 0;
                        if (p.first_name) s++;
                        if (p.last_name) s++;
                        if (p.family_name) s++;
                        if (p.birth_date) s++;
                        if (p.death_date) s++;
                        return s;
                    };
                    const dsA = dataScore(a);
                    const dsB = dataScore(b);
                    if (dsA !== dsB) return dsB - dsA; // More data first

                    // 2. Status priority
                    const statusScore = (p) => {
                        if (p.status === 'Occupied') return 3;
                        if (p.status === 'Reserved') return 2;
                        if (p.status === 'Veteran') return 2;
                        return 0;
                    };
                    const ssA = statusScore(a);
                    const ssB = statusScore(b);
                    if (ssA !== ssB) return ssB - ssA;

                    // 3. "Imported" note penalty
                    const importPenalty = (p) => (p.notes && p.notes.includes('Imported')) ? 1 : 0;
                    if (importPenalty(a) !== importPenalty(b)) return importPenalty(a) - importPenalty(b); // 0 (clean) before 1 (imported)

                    // 4. Section cleanliness ("Section 1" > "1" > "")
                    const secScore = (p) => {
                        const s = p.section || '';
                        if (s.toLowerCase() === 'section 1') return 2;
                        if (s === '1' || s === '01') return 1;
                        return 0;
                    };
                    if (secScore(a) !== secScore(b)) return secScore(b) - secScore(a);

                    // 5. Update date (Newer is better)
                    return new Date(b.updated_date || 0) - new Date(a.updated_date || 0);
                });

                // Keep index 0, delete the rest
                const keeper = list[0];
                const losers = list.slice(1);
                
                debugGroups[num] = {
                    kept: { id: keeper.id, sec: keeper.section, name: keeper.first_name, notes: keeper.notes },
                    deleted: losers.map(l => ({ id: l.id, sec: l.section, name: l.first_name, notes: l.notes }))
                };

                for (const l of losers) {
                    toDelete.push(l.id);
                }
            }
        }

        // Execute deletions
        const BATCH_SIZE = 10;
        const deletedIds = [];
        const errors = [];

        if (toDelete.length > 0) {
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
        }

        return Response.json({
            success: true,
            message: `Range ${rangeStart}-${rangeEnd}: Found ${duplicateGroups} duplicate groups. Deleted ${deletedIds.length} records.`,
            stats: {
                total_plots_scanned: allPlots.length,
                in_range_count: inRangeCount,
                candidates_for_dedup: candidateCount,
                groups_with_duplicates: duplicateGroups,
                deleted_count: deletedIds.length
            },
            details: debugGroups,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (e) {
        return Response.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
});