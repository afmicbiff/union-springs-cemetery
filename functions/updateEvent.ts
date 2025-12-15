import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { id, data } = await req.json(); // data contains updated fields

        const user = await base44.auth.me();
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        // 1. Get existing event to compare or just to have data
        const existingEvent = await base44.entities.Event.list({ id }, 1); // workaround if get(id) not available or filter
        // Better to use filter:
        const events = await base44.entities.Event.filter({ id });
        const oldEvent = events[0];

        if (!oldEvent) {
             return Response.json({ error: "Event not found" }, { status: 404 });
        }

        // 2. Update the Event
        const updatedEvent = await base44.entities.Event.update(id, data);

        // 3. Create System Notification
        await base44.entities.Notification.create({
            message: `Event updated: "${updatedEvent.title}" (was "${oldEvent.title}")`,
            type: 'info',
            created_at: new Date().toISOString(),
            is_read: false
        });

        // 4. Send Update Emails to Attendees
        // Logic: Send to all current attendee_ids in the updated data
        const currentAttendeeIds = updatedEvent.attendee_ids || [];
        
        if (currentAttendeeIds.length > 0) {
            const allEmployees = await base44.asServiceRole.entities.Employee.list({ limit: 1000 });
            const attendees = allEmployees.filter(emp => currentAttendeeIds.includes(emp.id));

            const formattedDate = format(new Date(updatedEvent.start_time), "PPPP 'at' p");

            const emailPromises = attendees.map(attendee => {
                if (!attendee.email) return Promise.resolve();

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

            await Promise.all(emailPromises);
        }

        return Response.json(updatedEvent);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});