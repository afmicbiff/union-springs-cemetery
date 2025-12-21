import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await req.json();
        if (!id) {
            return Response.json({ error: 'Missing id' }, { status: 400 });
        }

        // Attempt deletion
        const result = await base44.entities.Employee.delete(id);

        // Audit Log
        await base44.entities.AuditLog.create({
            action: 'delete',
            entity_type: 'Employee',
            entity_id: id,
            details: 'Employee deleted (force delete).',
            performed_by: user.email,
            timestamp: new Date().toISOString()
        });
        
        return Response.json({ success: true, result });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});