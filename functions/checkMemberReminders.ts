import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { format, isPast, parseISO, subDays } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Fetch all members (limit 1000)
        const members = await base44.entities.Member.list(null, 1000);
        
        const notifications = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // 6 months threshold for re-engagement
        const reEngagementThreshold = subDays(today, 180);

        for (const member of members) {
            // 1. Follow-up Reminders
            if (member.follow_up_status === 'pending' && member.follow_up_date) {
                const followUpDate = parseISO(member.follow_up_date);
                
                if (followUpDate <= today || isPast(followUpDate)) {
                    notifications.push({
                        message: `Follow-up due for ${member.first_name} ${member.last_name}: ${member.follow_up_notes || 'No notes'}`,
                        type: 'task',
                        is_read: false,
                        created_at: new Date().toISOString()
                    });
                }
            }

            // 2. Re-engagement Workflow
            // If they haven't been contacted in > 180 days
            if (member.last_contact_date) {
                const lastContact = parseISO(member.last_contact_date);
                if (lastContact < reEngagementThreshold) {
                    notifications.push({
                        message: `Re-engagement needed: ${member.first_name} ${member.last_name} hasn't been contacted since ${format(lastContact, 'MMM d, yyyy')}.`,
                        type: 'alert',
                        is_read: false,
                        created_at: new Date().toISOString()
                    });
                }
            }
        }

        // Fetch recent notifications to prevent spamming duplicates
        // We look at the last 50 notifications
        const recentNotes = await base44.entities.Notification.list('-created_at', 50);
        
        let createdCount = 0;
        for (const note of notifications) {
            // Check if a similar notification was created in the last 24 hours
            const isDuplicate = recentNotes.some(n => 
                n.message === note.message && 
                new Date(n.created_at) > subDays(new Date(), 1)
            );

            if (!isDuplicate) {
                await base44.entities.Notification.create(note);
                createdCount++;
            }
        }

        return Response.json({ success: true, notifications_created: createdCount });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});