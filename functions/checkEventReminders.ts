import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { differenceInMinutes, differenceInHours, parseISO } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Admin or system-only authorization
        const user = await base44.auth.me().catch(() => null);
        const expectedSecret = Deno.env.get('EVENT_REMINDERS_JOB_SECRET') || '';
        const providedSecret = req.headers.get('x-job-secret') || new URL(req.url).searchParams.get('job_secret') || '';
        const authorizedBySecret = expectedSecret && providedSecret && providedSecret === expectedSecret;
        if (!user && !authorizedBySecret) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (user && user.role !== 'admin') {
          return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }
        
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

            // Calculate differences
            const hoursUntil = differenceInHours(eventTime, now);
            const reminders = event.reminders_sent || {};
            let needsUpdate = false;
            let alertType = null;

            // Check thresholds for Invoice Due (Longer term)
            if (event.type === 'invoice_due') {
                if (hoursUntil <= 168 && hoursUntil > 72 && !reminders["7d"]) { // 7 Days (168h)
                    reminders["7d"] = true;
                    alertType = "7 days";
                    needsUpdate = true;
                } else if (hoursUntil <= 72 && hoursUntil > 24 && !reminders["3d"]) { // 3 Days (72h)
                    reminders["3d"] = true;
                    alertType = "3 days";
                    needsUpdate = true;
                } else if (hoursUntil <= 24 && hoursUntil > 1 && !reminders["1d"]) { // 1 Day (24h)
                    reminders["1d"] = true;
                    alertType = "1 day";
                    needsUpdate = true;
                }
            }

            // Check thresholds for all events (Short term)
            
            // "Day of" notification (e.g. within 24 hours but at least 1 hour away, ensuring we notify once for "Today")
            // We'll use a 12-hour window lookahead to signify "Today/Upcoming" if not yet notified.
            // Or simpler: if it's the same day.
            const isSameDay = eventTime.toDateString() === now.toDateString();
            if (isSameDay && !reminders["day_of"] && minutesUntil > 60) {
                 reminders["day_of"] = true;
                 alertType = "today";
                 needsUpdate = true;
            }

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
                const msg = alertType === 'today' 
                    ? `Meeting "${event.title}" is scheduled for today at ${eventTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.`
                    : `Meeting "${event.title}" starts in ${alertType}.`;

                notifications.push(base44.asServiceRole.entities.Notification.create({
                    message: msg,
                    type: "alert",
                    is_read: false,
                    related_entity_id: event.id,
                    related_entity_type: "event",
                    link: '/admin?tab=calendar',
                    created_at: new Date().toISOString()
                }));

                // 3. Send Emails to Attendees (Employees)
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

                // 4. Send Emails to External Attendees (Members/Guests)
                if (event.external_attendees && event.external_attendees.length > 0) {
                    for (const guest of event.external_attendees) {
                         if (guest.email && guest.status !== 'declined') {
                            emails.push(base44.integrations.Core.SendEmail({
                                to: guest.email,
                                subject: `Event Reminder: ${event.title}`,
                                body: `Hello ${guest.name},\n\nThis is a friendly reminder that the event "${event.title}" is scheduled for ${new Date(event.start_time).toLocaleString()}.\n\nWe look forward to seeing you.\n\nUnion Springs Cemetery\n(555) 123-4567`
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