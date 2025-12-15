import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { title, type, start_time, end_time, description, recurrence, recurrence_end_date, recurrence_count, attendee_ids, reminders_sent } = await req.json();

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
            reminders_sent: reminders_sent || {}
        });

        // 2. Create System Notification
        await base44.entities.Notification.create({
            message: `New event created: "${title}" by ${user.full_name || 'Admin'}`,
            type: 'info',
            created_at: new Date().toISOString(),
            is_read: false
        });

        // 3. Send Emails to Attendees
        if (attendee_ids && attendee_ids.length > 0) {
            // Fetch all employees to find emails
            // Optimization: In a real app with many users, we'd filter by IDs. 
            // Here we list all (assuming < 1000 employees) and filter in memory for simplicity.
            const allEmployees = await base44.asServiceRole.entities.Employee.list({ limit: 1000 });
            const attendees = allEmployees.filter(emp => attendee_ids.includes(emp.id));

            const formattedDate = format(new Date(start_time), "PPPP 'at' p");

            const emailPromises = attendees.map(attendee => {
                if (!attendee.email) return Promise.resolve();

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

            await Promise.all(emailPromises);
        }

        return Response.json(newEvent);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});