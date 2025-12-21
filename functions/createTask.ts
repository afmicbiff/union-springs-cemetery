import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const taskData = await req.json();

        // Clean up data
        if (!taskData.assignee_id || taskData.assignee_id === "unassigned") {
            delete taskData.assignee_id;
        }
        if (!taskData.due_date) {
            delete taskData.due_date;
        }

        const user = await base44.auth.me();
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        // Create Task
        const task = await base44.entities.Task.create(taskData);

        // Audit Log
        await base44.entities.AuditLog.create({
            action: 'create',
            entity_type: 'Task',
            entity_id: task.id,
            details: `Task "${task.title}" created.`,
            performed_by: user.email,
            timestamp: new Date().toISOString()
        });

        // Send Email if assigned
        if (task.assignee_id) {
            // Fetch assignee details (using service role to ensure access to email)
            const employees = await base44.asServiceRole.entities.Employee.filter({ id: task.assignee_id });
            const assignee = employees[0];

            if (assignee && assignee.email) {
                await base44.integrations.Core.SendEmail({
                    to: assignee.email,
                    subject: `New Task Assigned: ${task.title}`,
                    body: `Hello ${assignee.first_name},

You have been assigned a new task by ${user.full_name || 'Administrator'}.

Task: ${task.title}
Priority: ${task.priority}
Due Date: ${task.due_date || 'Not specified'}
Status: ${task.status}

Description:
${task.description || 'No description provided.'}

Please log in to the employee portal to view and manage this task.

Best regards,
Union Springs Cemetery Management`
                });

                // Also create an in-app notification
                await base44.entities.Notification.create({
                    message: `New Task Assigned: "${task.title}"`,
                    type: 'task',
                    user_email: assignee.email,
                    related_entity_id: task.id,
                    related_entity_type: "task",
                    created_at: new Date().toISOString(),
                    is_read: false
                });
            }
        }

        return Response.json(task);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});