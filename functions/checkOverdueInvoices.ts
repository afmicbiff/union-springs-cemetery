import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Get all invoices that are NOT 'Paid'
        // We'll filter client-side or use query if supported for efficiency
        const allInvoices = await base44.entities.VendorInvoice.list({ limit: 1000 });
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let updatedCount = 0;
        const updates = [];

        for (const inv of allInvoices) {
            if (inv.status === 'Paid') continue;

            const dueDate = inv.due_date ? new Date(inv.due_date) : null;
            if (!dueDate) continue;

            // Check if overdue
            // If due date is BEFORE today (not including today)
            if (dueDate < today) {
                // Should be 'Overdue'
                if (inv.status !== 'Overdue') {
                    updates.push(base44.entities.VendorInvoice.update(inv.id, { status: 'Overdue' }));
                    updatedCount++;
                }
            } else {
                // If it was overdue but date changed or it's not overdue anymore (e.g. extension)
                // Re-evaluate status based on payment
                const owed = inv.amount_owed || 0;
                const paid = inv.amount_paid || 0;
                let newStatus = 'Pending';
                
                if (paid >= owed) newStatus = 'Paid';
                else if (paid > 0) newStatus = 'Partial';
                
                if (inv.status !== newStatus) {
                    updates.push(base44.entities.VendorInvoice.update(inv.id, { status: newStatus }));
                    updatedCount++;
                }
            }
        }

        await Promise.all(updates);

        return Response.json({ success: true, updated: updatedCount });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});