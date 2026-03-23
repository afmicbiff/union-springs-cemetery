import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { batch_id } = await req.json().catch(() => ({}));
    if (!batch_id) return Response.json({ error: 'batch_id is required' }, { status: 400 });

    // Fetch rows in this batch
    const rows = await base44.asServiceRole.entities.NewPlot.filter({ batch_id }, undefined, 5000);

    // Delete rows in parallel (limit concurrency if needed)
    let deletedRows = 0;
    if (rows?.length) {
      const chunks = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
      for (const chunk of chunks(rows, 100)) {
        await Promise.all(
          chunk.map((r) => base44.asServiceRole.entities.NewPlot.delete(r.id).then(() => { deletedRows++; }))
        );
      }
    }

    // Delete the batch itself
    await base44.asServiceRole.entities.ImportBatch.delete(batch_id);

    return Response.json({ success: true, deleted_rows: deletedRows, deleted_batch_id: batch_id });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});