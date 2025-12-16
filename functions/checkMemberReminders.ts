import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { format, isPast, parseISO, subDays } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // 1. Fetch Members with pending follow-ups that are due or overdue
        // Note: Filtering logic might need to be done in memory if complex date comparison isn't supported directly in list/filter yet
        // fetching all for now as list size is manageable (1000 limit)
        const members = await base44.entities.Member.list(null, 1000);
        
        const notifications = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const member of members) {
            if (member.follow_up_status === 'pending' && member.follow_up_date) {
                const followUpDate = parseISO(member.follow_up_date);
                
                // If date is today or in the past
                if (followUpDate <= today || isPast(followUpDate)) {
                    // Check if we already notified recently to avoid spam (optional, skipping complexity for now)
                    // Just create the notification
                    
                    const message = `Follow-up due for ${member.first_name} ${member.last_name}: ${member.follow_up_notes || 'No notes'}`;
                    
                    // Check if duplicate notification exists for today to avoid spamming on every poll
                    // We'll fetch recent notifications
                    // For efficiency, maybe we just generate it. Ideally we'd check DB.
                    
                    notifications.push({
                        message,
                        type: 'task', // distinct type
                        is_read: false,
                        created_at: new Date().toISOString()
                    });
                }
            }
        }

        // 2. Fetch recent notifications to prevent duplicates
        const recentNotes = await base44.entities.Notification.list('-created_at', 50);
        
        let createdCount = 0;
        for (const note of notifications) {
            const isDuplicate = recentNotes.some(n => 
                n.message === note.message && 
                !n.is_read && // if read, we can remind again? no, let's just check message content
                new Date(n.created_at) > subDays(new Date(), 1) // only check last 24h
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