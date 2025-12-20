import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch all system data (Limit 10000 per entity for now)
        const limit = 10000;
        
        const [
            plots, 
            reservations, 
            notifications, 
            deceased, 
            members, 
            tasks,
            employees,
            vendors,
            vendorInvoices,
            events,
            announcements,
            memorialMedia,
            condolences
        ] = await Promise.all([
            base44.asServiceRole.entities.Plot.list(null, limit),
            base44.asServiceRole.entities.Reservation.list(null, limit),
            base44.asServiceRole.entities.Notification.list(null, limit),
            base44.asServiceRole.entities.Deceased.list(null, limit),
            base44.asServiceRole.entities.Member.list(null, limit),
            base44.asServiceRole.entities.Task.list(null, limit),
            base44.asServiceRole.entities.Employee.list(null, limit),
            base44.asServiceRole.entities.Vendor.list(null, limit),
            base44.asServiceRole.entities.VendorInvoice.list(null, limit),
            base44.asServiceRole.entities.Event.list(null, limit),
            base44.asServiceRole.entities.Announcement.list(null, limit),
            base44.asServiceRole.entities.MemorialMedia.list(null, limit),
            base44.asServiceRole.entities.Condolence.list(null, limit)
        ]);

        const backupData = {
            metadata: {
                timestamp: new Date().toISOString(),
                created_by: user.email,
                version: "1.1",
                description: "Full System Backup"
            },
            data: {
                plots,
                reservations,
                notifications,
                deceased,
                members,
                tasks,
                employees,
                vendors,
                vendorInvoices,
                events,
                announcements,
                memorialMedia,
                condolences
            }
        };

        const jsonString = JSON.stringify(backupData, null, 2);
        const filename = `backup_full_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        
        const file = new File([jsonString], filename, { type: 'application/json' });

        const uploadRes = await base44.asServiceRole.integrations.Core.UploadPrivateFile({
            file: file
        });

        if (!uploadRes.file_uri) {
            throw new Error("Failed to upload backup file");
        }

        const stats = {
            plots: plots.length,
            deceased: deceased.length,
            reservations: reservations.length,
            members: members.length,
            employees: employees.length,
            other: notifications.length + tasks.length + vendors.length + events.length
        };

        const backupRecord = await base44.asServiceRole.entities.Backup.create({
            filename: filename,
            file_uri: uploadRes.file_uri,
            file_size: jsonString.length,
            created_by_email: user.email,
            status: "completed",
            stats: stats
        });

        return Response.json(backupRecord);

    } catch (error) {
        console.error("Backup creation failed:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});