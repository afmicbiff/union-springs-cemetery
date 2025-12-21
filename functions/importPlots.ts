import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { plots } = await req.json();

        if (!plots || !Array.isArray(plots)) {
            return Response.json({ error: 'Invalid payload: plots array required' }, { status: 400 });
        }

        // Create import batch record
        const batch = await base44.asServiceRole.entities.ImportBatch.create({
            status: 'processing',
            user_email: user.email,
            source: 'manual_upload',
            total_rows: plots.length,
            started_at: new Date().toISOString()
        });

        // Fetch all existing plots to check against
        const allPlots = await base44.asServiceRole.entities.Plot.list(null, 5000);
        const plotMap = new Map();
        
        // Create a unique key for each plot. 
        // Normalizing: Section, Row, Plot Number.
        const getKey = (p) => {
            const sec = (p.section || '').toLowerCase().replace(/section\s*/, '').trim();
            const row = (p.row_number || '').toLowerCase().trim();
            const num = (p.plot_number || '').toLowerCase().trim();
            return `${sec}|${row}|${num}`;
        };

        allPlots.forEach(p => plotMap.set(getKey(p), p));

        const toCreate = [];
        const toUpdate = [];
        const batchNewRows = [];

        for (const inputPlot of plots) {
            const key = getKey(inputPlot);
            const existing = plotMap.get(key);

            if (!existing) {
                toCreate.push(inputPlot);
                // Log imported row
                batchNewRows.push({ batch_id: batch.id, ...inputPlot, action_taken: 'created', raw_row: inputPlot });
            } else {
                // Check if we need to fill in missing data
                const updates = {};
                let hasUpdates = false;

                // Fields to check for backfilling
                const fieldsToCheck = [
                    'first_name', 'last_name', 'family_name', 
                    'birth_date', 'death_date', 'notes'
                ];

                for (const field of fieldsToCheck) {
                    const existingVal = existing[field];
                    const newVal = inputPlot[field];

                    // If existing is empty/null and new value exists, update it
                    if ((existingVal === null || existingVal === undefined || existingVal === '') && 
                        (newVal !== null && newVal !== undefined && newVal !== '')) {
                        updates[field] = newVal;
                        hasUpdates = true;
                    }
                }
                
                // Status logic: Update status if current is 'Available' and new is occupied/reserved/etc
                // Or if current status is missing/default
                if ((!existing.status || existing.status === 'Available') && 
                    inputPlot.status && inputPlot.status !== 'Available') {
                     updates['status'] = inputPlot.status;
                     hasUpdates = true;
                }

                if (hasUpdates) {
                    toUpdate.push({ id: existing.id, ...updates });
                    batchNewRows.push({ batch_id: batch.id, ...inputPlot, matched_plot_id: existing.id, action_taken: 'updated', raw_row: inputPlot });
                } else {
                    batchNewRows.push({ batch_id: batch.id, ...inputPlot, matched_plot_id: existing.id, action_taken: 'skipped', raw_row: inputPlot });
                }
            }
        }

        // Execute Batch Operations
        
        // 1. Create
        const CHUNK_SIZE = 50;
        let createdCount = 0;
        const createList = toCreate.filter(p => p && p.plot_number);
        for (let i = 0; i < createList.length; i += CHUNK_SIZE) {
            const chunk = createList.slice(i, i + CHUNK_SIZE);
            await base44.asServiceRole.entities.Plot.bulkCreate(chunk);
            createdCount += chunk.length;
        }

        // 2. Update
        let updatedCount = 0;
        const updateBatchSize = 10; 
        for (let i = 0; i < toUpdate.length; i += updateBatchSize) {
            const chunk = toUpdate.slice(i, i + updateBatchSize);
            await Promise.all(chunk.map(({ id, ...data }) => 
                base44.asServiceRole.entities.Plot.update(id, data)
            ));
            updatedCount += chunk.length;
        }

        // Compute skipped count
        const skippedCount = plots.length - (createList.length + toUpdate.length);

        // Save imported rows for review
        if (batchNewRows.length) {
            const NP_CHUNK = 100;
            for (let i = 0; i < batchNewRows.length; i += NP_CHUNK) {
                const chunk = batchNewRows.slice(i, i + NP_CHUNK);
                await base44.asServiceRole.entities.NewPlot.bulkCreate(chunk);
            }
        }

        // Update import batch summary
        await base44.asServiceRole.entities.ImportBatch.update(batch.id, {
            status: 'completed',
            created_rows: createdCount,
            updated_rows: updatedCount,
            skipped_rows: skippedCount,
            completed_at: new Date().toISOString()
        });

        // Audit Log (non-blocking)
        try {
            await base44.asServiceRole.entities.AuditLog.create({
                action: 'import',
                entity_type: 'Plot',
                details: `Imported plots. Created: ${createdCount}, Updated: ${updatedCount}.`,
                performed_by: user.email,
                timestamp: new Date().toISOString()
            });
        } catch (_) {
            // ignore audit failures
        }

        return Response.json({ 
            success: true, 
            message: `Import processed. Created ${createdCount} new plots. Updated ${updatedCount} existing plots with missing data.` 
        });

    } catch (error) {
        const msg = error?.message || String(error);
        return Response.json({ error: msg }, { status: 500 });
    }
    });