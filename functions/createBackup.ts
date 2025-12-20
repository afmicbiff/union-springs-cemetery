import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch all critical data
        // We'll fetch in parallel. For large datasets, pagination might be needed, 
        // but for now we'll fetch a reasonable large limit.
        const limit = 10000;
        const [plots, reservations, notifications, deceased, members, tasks] = await Promise.all([
            base44.asServiceRole.entities.Plot.list(null, limit),
            base44.asServiceRole.entities.Reservation.list(null, limit),
            base44.asServiceRole.entities.Notification.list(null, limit),
            base44.asServiceRole.entities.Deceased.list(null, limit),
            base44.asServiceRole.entities.Member.list(null, limit),
            base44.asServiceRole.entities.Task.list(null, limit)
        ]);

        const backupData = {
            metadata: {
                timestamp: new Date().toISOString(),
                created_by: user.email,
                version: "1.0"
            },
            data: {
                plots,
                reservations,
                notifications,
                deceased,
                members,
                tasks
            }
        };

        const jsonString = JSON.stringify(backupData, null, 2);
        const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        
        // 2. Create a File object
        const file = new File([jsonString], filename, { type: 'application/json' });

        // 3. Upload to Private Storage
        // Note: The integration expects 'file' parameter.
        const uploadRes = await base44.asServiceRole.integrations.Core.UploadPrivateFile({
            file: file
        });

        if (!uploadRes.file_uri) {
            throw new Error("Failed to upload backup file");
        }

        // 4. Create Backup Record
        const backupRecord = await base44.asServiceRole.entities.Backup.create({
            filename: filename,
            file_uri: uploadRes.file_uri,
            file_size: jsonString.length,
            created_by_email: user.email,
            status: "completed",
            stats: {
                plots: plots.length,
                reservations: reservations.length,
                notifications: notifications.length,
                deceased: deceased.length,
                members: members.length,
                tasks: tasks.length
            }
        });

        return Response.json(backupRecord);

    } catch (error) {
        console.error("Backup creation failed:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});