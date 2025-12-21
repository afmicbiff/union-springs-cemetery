import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { id } = await req.json();

        const user = await base44.auth.me();
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        // Use service role to ensure admins can delete events regardless of creator
        const events = await base44.asServiceRole.entities.Event.filter({ id });
        const eventToDelete = events[0];

        if (!eventToDelete) {
             return Response.json({ error: "Event not found" }, { status: 404 });
        }

        await base44.asServiceRole.entities.Event.delete(id);

        const attendeeIds = eventToDelete.attendee_ids || [];
        if (attendeeIds.length > 0) {
            const allEmployees = await base44.asServiceRole.entities.Employee.list({ limit: 1000 });
            const attendees = allEmployees.filter(emp => attendeeIds.includes(emp.id));
            const formattedDate = format(new Date(eventToDelete.start_time), "PPPP 'at' p");

            const promises = attendees.map(async (attendee) => {
                // In-App Notification
                await base44.entities.Notification.create({
                    message: `Event Cancelled: "${eventToDelete.title}"`,
                    type: 'alert',
                    user_email: attendee.email,
                    created_at: new Date().toISOString(),
                    is_read: false
                });

                if (!attendee.email) return;

                return base44.integrations.Core.SendEmail({
                    to: attendee.email,
                    subject: `Event Cancelled: ${eventToDelete.title}`,
                    body: `Hello ${attendee.first_name},

The event "${eventToDelete.title}" scheduled for ${formattedDate} has been cancelled.

Best regards,
Union Springs Cemetery Admin`
                });
            });

            await Promise.all(promises);
        }

        // System Log
        await base44.entities.Notification.create({
            message: `Event deleted: "${eventToDelete.title}" by ${user.full_name}`,
            type: 'alert',
            created_at: new Date().toISOString(),
            is_read: false
        });

        // Audit Log
        await base44.entities.AuditLog.create({
            action: 'delete',
            entity_type: 'Event',
            entity_id: id,
            details: `Event "${eventToDelete.title}" deleted.`,
            performed_by: user.email,
            timestamp: new Date().toISOString()
        });

        return Response.json({ success: true });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});