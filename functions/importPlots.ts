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

        for (const inputPlot of plots) {
            const key = getKey(inputPlot);
            const existing = plotMap.get(key);

            if (!existing) {
                toCreate.push(inputPlot);
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
                }
            }
        }

        // Execute Batch Operations
        
        // 1. Create
        const CHUNK_SIZE = 50;
        let createdCount = 0;
        for (let i = 0; i < toCreate.length; i += CHUNK_SIZE) {
            const chunk = toCreate.slice(i, i + CHUNK_SIZE);
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

        return Response.json({ 
            success: true, 
            message: `Import processed. Created ${createdCount} new plots. Updated ${updatedCount} existing plots with missing data.` 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});