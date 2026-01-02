import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const taskData = await req.json();

        // Clean up data
        if (!taskData.assignee_id || taskData.assignee_id === "unassigned") {
            delete taskData.assignee_id;
        }
        if (!taskData.member_id || taskData.member_id === "unassigned") {
            delete taskData.member_id;
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

        // Notify recipient (employee or member). Do not fail the whole call if notification fails.
        try {
            if (task.assignee_id) {
                const employees = await base44.asServiceRole.entities.Employee.filter({ id: task.assignee_id }, null, 1);
                const recipient = employees?.[0];
                if (recipient?.email) {
                    await base44.integrations.Core.SendEmail({
                        to: recipient.email,
                        subject: `New Task Assigned: ${task.title}`,
                        body: `Hello ${recipient.first_name},

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
                    await base44.entities.Notification.create({
                        message: `New Task Assigned: "${task.title}"`,
                        type: 'task',
                        user_email: recipient.email,
                        related_entity_id: task.id,
                        related_entity_type: "task",
                        created_at: new Date().toISOString(),
                        is_read: false
                    });
                }
            } else if (task.member_id) {
                const members = await base44.asServiceRole.entities.Member.filter({ id: task.member_id }, null, 1);
                const m = members?.[0];
                if (m?.email_primary) {
                    await base44.integrations.Core.SendEmail({
                        to: m.email_primary,
                        subject: `New Task Assigned: ${task.title}`,
                        body: `Hello ${m.first_name || 'Member'},

You have been assigned a new task by ${user.full_name || 'Administrator'}.

Task: ${task.title}
Priority: ${task.priority}
Due Date: ${task.due_date || 'Not specified'}
Status: ${task.status}

Description:
${task.description || 'No description provided.'}

Please log in to the member portal to view and manage this task.

Best regards,
Union Springs Cemetery Management`
                    });
                    await base44.entities.Notification.create({
                        message: `New Task Assigned: "${task.title}"`,
                        type: 'task',
                        user_email: m.email_primary,
                        related_entity_id: task.id,
                        related_entity_type: "task",
                        created_at: new Date().toISOString(),
                        is_read: false
                    });
                }
            }
        } catch (_notifyErr) {
            // Swallow notification errors to avoid 500 on task creation
        }

        return Response.json(task);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});