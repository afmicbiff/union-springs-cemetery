import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        const { ids } = await req.json();

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return Response.json({ error: 'Missing ids array' }, { status: 400 });
        }

        let deletedCount = 0;
        for (const id of ids) {
            try {
                await base44.asServiceRole.entities.NewPlotReservation1.delete(id);
                deletedCount++;
            } catch (e) {
                console.error(`Failed to delete id ${id}:`, e.message);
            }
        }

        return Response.json({ success: true, deletedCount });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});