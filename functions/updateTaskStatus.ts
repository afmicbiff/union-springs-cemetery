import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { addDays, addWeeks, addMonths, parseISO, format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { id, status } = await req.json();

        const user = await base44.auth.me();
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        // Get current task
        const tasks = await base44.entities.Task.filter({ id });
        if (!tasks || tasks.length === 0) {
            return Response.json({ error: "Task not found" }, { status: 404 });
        }
        const task = tasks[0];

        // Update the current task status
        const updatedTask = await base44.entities.Task.update(id, { status });

        // Handle Recurrence if completing
        if (status === 'Completed' && task.recurrence && task.recurrence !== 'none') {
            // Calculate next due date
            // Default to today if no due date, otherwise use previous due date
            const baseDate = task.due_date ? parseISO(task.due_date) : new Date();
            let nextDate;

            switch (task.recurrence) {
                case 'daily':
                    nextDate = addDays(baseDate, 1);
                    break;
                case 'weekly':
                    nextDate = addWeeks(baseDate, 1);
                    break;
                case 'monthly':
                    nextDate = addMonths(baseDate, 1);
                    break;
                default:
                    nextDate = null;
            }

            if (nextDate) {
                // Create next task
                const newTaskData = {
                    title: task.title,
                    description: task.description,
                    priority: task.priority,
                    assignee_id: task.assignee_id,
                    status: 'To Do',
                    recurrence: task.recurrence,
                    due_date: format(nextDate, 'yyyy-MM-dd')
                };

                await base44.entities.Task.create(newTaskData);
            }
        }

        return Response.json(updatedTask);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});