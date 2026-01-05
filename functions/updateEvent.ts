import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { id, data } = await req.json(); 

        const user = await base44.auth.me();
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

        // Use service role to ensure admins can update events regardless of creator
        const events = await base44.asServiceRole.entities.Event.filter({ id });
        const oldEvent = events[0];

        if (!oldEvent) {
             return Response.json({ error: "Event not found" }, { status: 404 });
        }

        const updatedEvent = await base44.asServiceRole.entities.Event.update(id, data);

        // Notify Attendees
        const currentAttendeeIds = updatedEvent.attendee_ids || [];
        
        if (currentAttendeeIds.length > 0) {
            const allEmployees = await base44.asServiceRole.entities.Employee.list({ limit: 1000 });
            const attendees = allEmployees.filter(emp => currentAttendeeIds.includes(emp.id));
            const formattedDate = format(new Date(updatedEvent.start_time), "PPPP 'at' p");

            const promises = attendees.map(async (attendee) => {
                 // In-App Notification
                 await base44.entities.Notification.create({
                    message: `Event updated: "${updatedEvent.title}"`,
                    type: 'info',
                    user_email: attendee.email,
                    created_at: new Date().toISOString(),
                    is_read: false
                });

                if (!attendee.email) return;

                return base44.integrations.Core.SendEmail({
                    to: attendee.email,
                    subject: `Event Updated: ${updatedEvent.title}`,
                    body: `Hello ${attendee.first_name},

The event "${updatedEvent.title}" has been updated.

New Details:
Date: ${formattedDate}
Type: ${updatedEvent.type}
${updatedEvent.description ? `Description: ${updatedEvent.description}` : ''}

Please check your calendar.

Best regards,
Union Springs Cemetery Admin`
                });
            });

            await Promise.all(promises);
        }

        // System Log
        await base44.entities.Notification.create({
            message: `Event updated: "${updatedEvent.title}" by ${user.full_name}`,
            type: 'info',
            created_at: new Date().toISOString(),
            is_read: false
        });

        return Response.json(updatedEvent);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});