import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { isAdmin = false, currentEmployeeId = null, statusFilter = 'all', priorityFilter = 'all', showArchived = false, searchTerm = '' } = await req.json();

    const where = { is_archived: !!showArchived };
    if (!isAdmin && currentEmployeeId) where.assignee_id = currentEmployeeId;
    if (statusFilter !== 'all') where.status = statusFilter;
    if (priorityFilter !== 'all') where.priority = priorityFilter;

    // Fetch up to 500 and then filter by search term server-side
    const tasks = await base44.entities.Task.filter(where, '-updated_date', 500) || [];

    const term = String(searchTerm || '').toLowerCase().trim();
    const filtered = !term ? tasks : tasks.filter(t => `${t.title || ''} ${t.description || ''}`.toLowerCase().includes(term));

    return Response.json({ tasks: filtered.slice(0, 200) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});