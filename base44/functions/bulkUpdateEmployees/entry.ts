import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { ids = [], actionType, data = {} } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: 'No ids provided' }, { status: 400 });
    }

    let updateBuilder = (id) => ({})
    if (actionType === 'change_role') {
      updateBuilder = () => ({ employment_type: data.employment_type });
    } else if (actionType === 'deactivate') {
      updateBuilder = () => ({ status: 'inactive' });
    } else if (actionType === 'reactivate') {
      updateBuilder = () => ({ status: 'active' });
    }

    let updated = 0;
    await Promise.all(ids.map(async (id) => {
      const payload = updateBuilder(id);
      if (payload && Object.keys(payload).length) {
        await base44.asServiceRole.entities.Employee.update(id, payload);
        updated += 1;
      }
    }));

    // Audit Log
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        action: 'bulk_update',
        entity_type: 'Employee',
        details: `Bulk action "${actionType}" applied to ${updated} employees`,
        performed_by: user.email,
        timestamp: new Date().toISOString()
      });
    } catch (_e) {}

    return Response.json({ updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});