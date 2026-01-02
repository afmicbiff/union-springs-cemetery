import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { action, documents, new_category, new_expiration } = await req.json();
    if (!Array.isArray(documents) || documents.length === 0) {
      return Response.json({ error: 'No documents provided' }, { status: 400 });
    }

    // Group by member_id for efficient updates
    const byMember = new Map();
    for (const d of documents) {
      if (!d.member_id || !d.doc_id) continue;
      if (!byMember.has(d.member_id)) byMember.set(d.member_id, []);
      byMember.get(d.member_id).push(d.doc_id);
    }

    let success = 0, failed = 0;

    for (const [memberId, docIds] of byMember.entries()) {
      try {
        const arr = await base44.asServiceRole.entities.Member.filter({ id: memberId }, null, 1);
        const member = (arr && arr[0]) || null;
        if (!member) { failed += docIds.length; continue; }
        const docs = Array.isArray(member.documents) ? member.documents : [];

        if (action === 'bulk_delete') {
          const toDelete = new Set(docIds);
          const updated = docs.filter(d => !toDelete.has(d.id));
          await base44.asServiceRole.entities.Member.update(memberId, { documents: updated });
          for (const id of docIds) {
            await base44.asServiceRole.entities.DocumentAuditLog.create({
              action: 'delete',
              document_id: id,
              member_id: memberId,
              member_name: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
              performed_by: user.email,
              timestamp: new Date().toISOString(),
              details: 'Deleted by admin'
            });
            success++;
          }
        } else if (action === 'bulk_categorize') {
          if (!new_category) { failed += docIds.length; continue; }
          const toUpdate = new Set(docIds);
          const updated = docs.map(d => {
            if (toUpdate.has(d.id)) {
              const old = d.category || 'Unspecified';
              const nd = { ...d, category: new_category };
              // Log each
              base44.asServiceRole.entities.DocumentAuditLog.create({
                action: 'categorize',
                document_id: d.id,
                member_id: memberId,
                member_name: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
                performed_by: user.email,
                timestamp: new Date().toISOString(),
                details: `Category: ${old} -> ${new_category}`
              });
              success++;
              return nd;
            }
            return d;
          });
          await base44.asServiceRole.entities.Member.update(memberId, { documents: updated });
        } else if (action === 'bulk_set_expiration') {
          if (!new_expiration) { failed += docIds.length; continue; }
          const toUpdate = new Set(docIds);
          const updated = docs.map(d => {
            if (toUpdate.has(d.id)) {
              const old = d.expiration_date || null;
              const nd = { ...d, expiration_date: new_expiration };
              base44.asServiceRole.entities.DocumentAuditLog.create({
                action: 'set_expiration',
                document_id: d.id,
                member_id: memberId,
                member_name: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
                performed_by: user.email,
                timestamp: new Date().toISOString(),
                details: `Expiration: ${old || 'none'} -> ${new_expiration}`
              });
              success++;
              return nd;
            }
            return d;
          });
          await base44.asServiceRole.entities.Member.update(memberId, { documents: updated });
        } else if (action === 'bulk_clear_expiration') {
          const toUpdate = new Set(docIds);
          const updated = docs.map(d => {
            if (toUpdate.has(d.id)) {
              const old = d.expiration_date || null;
              const nd = { ...d, expiration_date: null };
              base44.asServiceRole.entities.DocumentAuditLog.create({
                action: 'clear_expiration',
                document_id: d.id,
                member_id: memberId,
                member_name: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
                performed_by: user.email,
                timestamp: new Date().toISOString(),
                details: `Expiration: ${old || 'none'} -> cleared`
              });
              success++;
              return nd;
            }
            return d;
          });
          await base44.asServiceRole.entities.Member.update(memberId, { documents: updated });
        } else {
          failed += docIds.length;
        }
      } catch (_e) {
        failed += byMember.get(memberId)?.length || 0;
      }
    }

    return Response.json({ success, failed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});