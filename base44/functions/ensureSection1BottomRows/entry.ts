import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const section = 'Section 1';
    const row = 'A-1';
    const plotNumbers = ['1', '2', '3', '24', '25', '26'];

    const results = [];
    for (const num of plotNumbers) {
      const existing = await base44.entities.Plot.filter({ section, plot_number: num });
      if (existing && existing.length > 0) {
        results.push({ plot_number: num, status: 'exists', id: existing[0].id });
        continue;
      }
      const created = await base44.entities.Plot.create({
        section,
        row_number: row,
        plot_number: num,
        status: 'Available',
        first_name: '',
        last_name: '',
        family_name: '',
        birth_date: '',
        death_date: '',
        notes: ''
      });
      results.push({ plot_number: num, status: 'created', id: created.id });
    }

    return Response.json({ message: 'Ensure Section 1 bottom rows completed', results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});