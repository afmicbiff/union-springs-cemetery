import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { isPast, isToday, parseISO, differenceInHours } from 'npm:date-fns@3.6.0';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // 1. Get all active tasks
        const tasks = await base44.asServiceRole.entities.Task.list({ limit: 1000 });
        const activeTasks = tasks.filter(t => t.status !== 'Completed' && !t.is_archived && t.due_date);
        
        const now = new Date();
        const updates = [];
        const notifications = [];

        for (const task of activeTasks) {
            const dueDate = parseISO(task.due_date);
            const lastReminded = task.last_reminded_at ? parseISO(task.last_reminded_at) : null;

            let shouldNotify = false;
            let message = '';

            // Check if we already reminded recently (e.g., within 24 hours)
            if (lastReminded && differenceInHours(now, lastReminded) < 24) {
                continue;
            }

            if (isPast(dueDate) && !isToday(dueDate)) {
                // Overdue
                shouldNotify = true;
                message = `Task Overdue: "${task.title}" was due on ${task.due_date}.`;
            } else if (isToday(dueDate)) {
                // Due Today
                shouldNotify = true;
                message = `Task Due Today: "${task.title}" is due today.`;
            }

            if (shouldNotify) {
                // Create Notification
                notifications.push(base44.asServiceRole.entities.Notification.create({
                    message: message,
                    type: "task",
                    is_read: false,
                    user_email: null, // Admin/System wide
                    created_at: now.toISOString()
                }));

                // Update Task last_reminded_at
                updates.push(base44.asServiceRole.entities.Task.update(task.id, {
                    last_reminded_at: now.toISOString()
                }));
            }
        }

        await Promise.all([...notifications, ...updates]);

        return Response.json({ 
            success: true, 
            processed: activeTasks.length, 
            notifications_sent: notifications.length 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});