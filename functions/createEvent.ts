import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { title, type, start_time, end_time, description, recurrence, recurrence_end_date, recurrence_count, attendee_ids, external_attendees, reminders_sent } = await req.json();

        const user = await base44.auth.me();
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        // 1. Create the Event
        const newEvent = await base44.entities.Event.create({
            title,
            type,
            start_time,
            end_time,
            description,
            recurrence,
            recurrence_end_date,
            recurrence_count,
            attendee_ids: attendee_ids || [],
            external_attendees: external_attendees || [],
            reminders_sent: reminders_sent || {}
        });

        const formattedDate = format(new Date(start_time), "PPPP 'at' p");
        const host = req.headers.get("host"); // e.g. base44-app-id.deno.dev
        const rsvpBaseUrl = `https://${host}/functions/handleEventRSVP`;

        // 2. Send Notifications to Internal Attendees (Employees)
        if (attendee_ids && attendee_ids.length > 0) {
            const allEmployees = await base44.asServiceRole.entities.Employee.list({ limit: 1000 });
            const attendees = allEmployees.filter(emp => attendee_ids.includes(emp.id));
            const formattedDate = format(new Date(start_time), "PPPP 'at' p");

            // Create Notifications & Send Emails
            const promises = attendees.map(async (attendee) => {
                // In-App Notification
                await base44.entities.Notification.create({
                    message: `You have been invited to: "${title}"`,
                    type: 'task',
                    user_email: attendee.email,
                    created_at: new Date().toISOString(),
                    is_read: false
                });

                if (!attendee.email) return;

                // Email
                return base44.integrations.Core.SendEmail({
                    to: attendee.email,
                    subject: `New Event Invitation: ${title}`,
                    body: `Hello ${attendee.first_name},

You have been invited to an event.

Event: ${title}
Date: ${formattedDate}
Type: ${type}
${description ? `Description: ${description}` : ''}

Please mark your calendar.

Best regards,
Union Springs Cemetery Admin`
                });
            });

            await Promise.all(promises);
        }

        // 3. Send Emails to External Attendees
        if (external_attendees && external_attendees.length > 0) {
             const externalPromises = external_attendees.map(async (guest) => {
                if (!guest.email) return;

                const acceptLink = `${rsvpBaseUrl}?id=${newEvent.id}&email=${encodeURIComponent(guest.email)}&status=accepted`;
                const declineLink = `${rsvpBaseUrl}?id=${newEvent.id}&email=${encodeURIComponent(guest.email)}&status=declined`;

                return base44.integrations.Core.SendEmail({
                    to: guest.email,
                    subject: `Event Invitation: ${title}`,
                    body: `Hello ${guest.name || 'Guest'},

You have been invited to an event at Union Springs Cemetery.

Event: ${title}
Date: ${formattedDate}
Type: ${type}
${description ? `Description: ${description}` : ''}

Please confirm your attendance:

Accept: ${acceptLink}
Decline: ${declineLink}

Best regards,
Union Springs Cemetery Admin`
                });
            });
            await Promise.all(externalPromises);
        }

        // Notification for Creator (if not already included)
        // or System Log
        await base44.entities.Notification.create({
            message: `Event created: "${title}" by ${user.full_name}`,
            type: 'info',
            created_at: new Date().toISOString(),
            is_read: false,
            related_entity_id: newEvent.id,
            related_entity_type: 'event',
            link: '/admin?tab=calendar'
        });

        return Response.json(newEvent);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});