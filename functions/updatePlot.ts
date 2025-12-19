import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized: Admins only' }, { status: 401 });
        }

        const { id, data } = await req.json();

        if (!id || !data) {
             return Response.json({ error: 'Missing id or data' }, { status: 400 });
        }

        // Get old data for comparison
        // Note: .get() might throw if not found, usually returns object
        let oldPlot;
        try {
             // Fetch using list filter to be safe if get isn't by ID directly or handle error
             // Assuming .get(id) works as per SDK standards for single entity
             // If get is not available, use filter
             const results = await base44.entities.Plot.filter({ id: id }, null, 1);
             if (results.length > 0) oldPlot = results[0];
        } catch (e) {
            console.error("Error fetching old plot", e);
        }

        // --- DATA CONSISTENCY CHECK ---
        const consistencyData = { ...oldPlot, ...data }; // Merge to check full state
        let needsReview = false;
        const reviewReasons = [];

        // Check 1: Occupied but missing name
        if (consistencyData.status === 'Occupied' && !consistencyData.first_name && !consistencyData.last_name) {
            needsReview = true;
            reviewReasons.push("Status is Occupied but no occupant name provided");
        }

        // Check 2: Keywords in notes
        if (consistencyData.notes && /check|verify|\?|ambiguous|unsure/i.test(consistencyData.notes)) {
            needsReview = true;
            reviewReasons.push("Notes contain uncertainty keywords");
        }
        
        // Apply review flag if needed (only if explicitly set or found issues)
        // If data contains explicit needs_review: false, we trust the admin cleared it.
        // If data doesn't contain needs_review, we check logic.
        if (data.needs_review === undefined && needsReview) {
            data.needs_review = true;
            data.review_notes = reviewReasons.join('; ');
            
            // Send Notification
            try {
                await base44.entities.Notification.create({
                     message: `Plot ${consistencyData.plot_number} flagged for review: ${data.review_notes}`,
                     type: 'task',
                     is_read: false
                 });
            } catch (e) { console.error("Notify failed", e); }
        }
        // -----------------------------

        // Update Plot
        const updatedPlot = await base44.entities.Plot.update(id, data);

        // Calculate differences
        const changes = {};
        if (oldPlot) {
            for (const key in data) {
                // strict comparison, might need adjustment for types
                if (JSON.stringify(data[key]) !== JSON.stringify(oldPlot[key])) {
                     // Filter out internal fields if any, or just business fields
                     changes[key] = { from: oldPlot[key], to: data[key] };
                }
            }
        } else {
             changes['all'] = { from: null, to: 'Updated (Previous state unknown)' };
        }

        if (Object.keys(changes).length > 0) {
            await base44.entities.PlotAuditLog.create({
                plot_id: id,
                changed_by: user.email,
                change_summary: `Updated: ${Object.keys(changes).join(', ')}`,
                details: changes,
                timestamp: new Date().toISOString()
            });
        }

        return Response.json(updatedPlot);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});