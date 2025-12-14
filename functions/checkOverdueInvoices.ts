import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const allInvoices = await base44.entities.VendorInvoice.list({ limit: 1000 });
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let updatedCount = 0;
        const updates = [];
        const notifications = [];

        for (const inv of allInvoices) {
            if (inv.status === 'Paid') continue;

            const dueDate = inv.due_date ? new Date(inv.due_date) : null;
            if (!dueDate) continue;

            // Calculate diff in days
            const diffTime = dueDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let newStatus = inv.status;
            let shouldNotify = false;

            if (diffDays < 0) {
                newStatus = 'Overdue';
            } else if (diffDays <= 2) {
                newStatus = 'Due Soon';
                // Only notify if status wasn't already Due Soon (to avoid spam, though simple check)
                if (inv.status !== 'Due Soon') {
                    shouldNotify = true;
                }
            } else {
                // Re-evaluate based on payment if it was previously marked overdue/soon but dates changed
                const owed = inv.amount_owed || 0;
                const paid = inv.amount_paid || 0;
                
                if (paid >= owed) newStatus = 'Paid';
                else if (paid > 0) newStatus = 'Partial';
                else newStatus = 'Pending';
            }

            // Update if changed
            if (inv.status !== newStatus) {
                updates.push(base44.entities.VendorInvoice.update(inv.id, { status: newStatus }));
                updatedCount++;
            }

            // Generate Notification
            if (shouldNotify) {
                const msg = `Invoice #${inv.invoice_number} is due in ${diffDays <= 0 ? '0' : diffDays} days.`;
                notifications.push(base44.entities.Notification.create({
                    message: msg,
                    type: 'alert',
                    created_at: new Date().toISOString(),
                    is_read: false
                }));
            }
        }

        await Promise.all([...updates, ...notifications]);

        return Response.json({ success: true, updated: updatedCount, notifications: notifications.length });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});