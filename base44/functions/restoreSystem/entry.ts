import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { backupData } = await req.json();

        if (!backupData || !backupData.data) {
            return Response.json({ error: 'Invalid backup data format' }, { status: 400 });
        }

        const data = backupData.data;
        const results = {
            success: [],
            errors: []
        };

        // Helper for bulk creation with error swallowing
        const restoreEntity = async (entityName, records) => {
            if (!records || records.length === 0) return 0;
            try {
                // We attempt to bulk create. 
                // Note: If IDs are preserved by the platform, this restores links.
                // If not, links might break, but data is restored.
                // We chunk to avoid payload limits.
                const chunkSize = 100;
                for (let i = 0; i < records.length; i += chunkSize) {
                    const chunk = records.slice(i, i + chunkSize);
                    await base44.asServiceRole.entities[entityName].bulkCreate(chunk);
                }
                results.success.push(`${entityName}: ${records.length} records`);
                return records.length;
            } catch (err) {
                console.error(`Error restoring ${entityName}:`, err);
                results.errors.push(`${entityName}: ${err.message}`);
                return 0;
            }
        };

        // Restore Order (Independent first)
        // 1. Core Data
        await restoreEntity('Employee', data.employees);
        await restoreEntity('Member', data.members);
        await restoreEntity('Vendor', data.vendors);
        await restoreEntity('Plot', data.plots);
        await restoreEntity('Event', data.events);
        await restoreEntity('Announcement', data.announcements);

        // 2. Dependent Data (Wait for core data to settle if needed, but sequential await helps)
        await restoreEntity('Deceased', data.deceased);
        await restoreEntity('Reservation', data.reservations);
        await restoreEntity('Task', data.tasks);
        await restoreEntity('VendorInvoice', data.vendorInvoices);
        await restoreEntity('Notification', data.notifications);
        await restoreEntity('MemorialMedia', data.memorialMedia);
        await restoreEntity('Condolence', data.condolences);

        return Response.json({ 
            message: "Restore process completed", 
            details: results 
        });

    } catch (error) {
        console.error("Restore failed:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});