import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { status = 'active', searchTerm = '', page = 1, pageSize = 50 } = await req.json();

    // Fetch a capped set on the server, then slice for pagination before returning to client
    const all = await base44.entities.Employee.list('-created_date', 2000) || [];

    const wantArchived = status === 'archived';
    const term = String(searchTerm || '').toLowerCase().trim();

    const filtered = all.filter((emp) => {
      const empStatus = emp.status || 'active';
      const matchesView = wantArchived ? empStatus === 'inactive' : empStatus === 'active';
      if (!matchesView) return false;
      if (!term) return true;
      const hay = `${emp.first_name || ''} ${emp.last_name || ''} ${emp.email || ''} ${emp.employee_number || ''}`.toLowerCase();
      return hay.includes(term);
    });

    const total = filtered.length;
    const start = Math.max(0, (Number(page) - 1) * Number(pageSize));
    const end = Math.min(total, start + Number(pageSize));
    const items = filtered.slice(start, end);

    return Response.json({ items, total, page, pageSize });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});