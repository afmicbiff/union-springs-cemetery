import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { z } from 'npm:zod@3.24.2';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized: Admins only' }, { status: 401 });
        }

        const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || '';
        const ua = req.headers.get('user-agent') || '';

        const body = await req.json();
        const Schema = z.object({
            id: z.string().min(1),
            data: z.object({
                section: z.string().optional(),
                row_number: z.string().optional(),
                plot_number: z.string().min(1).optional(),
                status: z.enum(['Available','Reserved','Occupied','Veteran','Unavailable','Unknown','Not Usable']).optional(),
                first_name: z.string().optional().nullable(),
                last_name: z.string().optional().nullable(),
                family_name: z.string().optional().nullable(),
                birth_date: z.string().optional().nullable(),
                death_date: z.string().optional().nullable(),
                donation_amount: z.number().optional().nullable(),
                capacity: z.number().optional().nullable(),
                current_occupancy: z.number().optional().nullable(),
                last_maintained: z.string().optional().nullable(),
                notes: z.string().optional().nullable(),
            })
        });
        const { id, data } = Schema.parse(body);

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

        // Update Plot
        const updatedPlot = await base44.entities.Plot.update(id, data);

        // Security log for admin action
        try {
            await base44.asServiceRole.entities.SecurityEvent.create({
                event_type: 'admin_action',
                severity: 'info',
                message: `Plot ${id} updated by ${user.email}`,
                ip_address: ip,
                user_agent: ua,
                user_email: user.email,
                route: 'functions/updatePlot',
                details: { changed_keys: Object.keys(data) }
            });
        } catch (_) {}

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
        try {
            const base44 = createClientFromRequest(req);
            const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || '';
            const ua = req.headers.get('user-agent') || '';
            await base44.asServiceRole.entities.SecurityEvent.create({
                event_type: 'input_validation_error',
                severity: 'medium',
                message: error.message || 'Validation or update error',
                ip_address: ip,
                user_agent: ua,
                route: 'functions/updatePlot'
            });
        } catch (_) {}
        return Response.json({ error: error.message }, { status: 500 });
    }
});