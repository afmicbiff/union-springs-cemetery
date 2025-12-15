import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { differenceInMinutes, parseISO } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Use service role to access all events and employees
        const events = await base44.asServiceRole.entities.Event.list({ limit: 1000 });
        const employees = await base44.asServiceRole.entities.Employee.list({ limit: 1000 });
        
        const now = new Date();
        const updates = [];
        const notifications = [];
        const emails = [];

        for (const event of events) {
            // Skip if event is in the past (allow for small window)
            const eventTime = parseISO(event.start_time);
            const minutesUntil = differenceInMinutes(eventTime, now);

            if (minutesUntil < 0 || minutesUntil > 65) continue; // Optimization: only check near-term events

            const reminders = event.reminders_sent || { "1h": false, "30m": false, "15m": false };
            let needsUpdate = false;
            let alertType = null;

            // Check thresholds
            if (minutesUntil <= 60 && minutesUntil > 30 && !reminders["1h"]) {
                reminders["1h"] = true;
                alertType = "1 hour";
                needsUpdate = true;
            } else if (minutesUntil <= 30 && minutesUntil > 15 && !reminders["30m"]) {
                reminders["30m"] = true;
                alertType = "30 minutes";
                needsUpdate = true;
            } else if (minutesUntil <= 15 && minutesUntil > 0 && !reminders["15m"]) {
                reminders["15m"] = true;
                alertType = "15 minutes";
                needsUpdate = true;
            }

            if (needsUpdate && alertType) {
                // 1. Update Event Reminder Status
                updates.push(base44.asServiceRole.entities.Event.update(event.id, { reminders_sent: reminders }));

                // 2. Create Admin Notification
                notifications.push(base44.asServiceRole.entities.Notification.create({
                    message: `Meeting "${event.title}" starts in ${alertType}.`,
                    type: "alert",
                    is_read: false,
                    created_at: new Date().toISOString()
                }));

                // 3. Send Emails to Attendees
                if (event.attendee_ids && event.attendee_ids.length > 0) {
                    const attendees = employees.filter(emp => event.attendee_ids.includes(emp.id));
                    
                    for (const attendee of attendees) {
                        if (attendee.email) {
                            emails.push(base44.integrations.Core.SendEmail({
                                to: attendee.email,
                                subject: `Reminder: ${event.title} in ${alertType}`,
                                body: `Hello ${attendee.first_name},\n\nThis is a reminder that the event "${event.title}" is scheduled to begin in ${alertType} (${event.start_time}).\n\n- Union Springs Admin`
                            }));
                        }
                    }
                }
            }
        }

        await Promise.all([...updates, ...notifications, ...emails]);

        return Response.json({ 
            success: true, 
            processed: events.length, 
            notifications_sent: notifications.length,
            emails_sent: emails.length
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});