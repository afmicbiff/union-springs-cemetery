import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { addDays, format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { memberIds, actionType, config } = await req.json();

        if (!memberIds || !memberIds.length) {
            return Response.json({ error: "No members selected" }, { status: 400 });
        }

        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        // Fetch members to have their details (like email)
        // Since we can't do "where id in [...]" easily in one go efficiently without a specialized query, 
        // we might have to fetch them or assume the caller passed necessary info? 
        // Better to fetch to be safe and secure.
        // For performance, if list is huge, this is slow, but for < 1000 it's "okay".
        // Optimization: Fetch all members once and filter in memory if list is large? 
        // Or just loop and fetch if list is small. 
        // Let's assume the frontend passes IDs. We'll fetch 'all' (cached ideally) or loop.
        // Actually, fetching 100 items in a loop is bad. 
        // Let's try to fetch all members (it's fast enough usually) and map.
        const allMembers = await base44.entities.Member.list(null, 1000);
        const membersMap = new Map(allMembers.map(m => [m.id, m]));

        const targets = memberIds.map(id => membersMap.get(id)).filter(Boolean);

        for (const member of targets) {
            try {
                if (actionType === 'send_email') {
                    if (member.email_primary) {
                        await base44.integrations.Core.SendEmail({
                            to: member.email_primary,
                            subject: config.subject,
                            body: config.body.replace('{{first_name}}', member.first_name || 'Member').replace('{{last_name}}', member.last_name || '')
                        });
                        results.success++;
                        
                        // Log it
                        await base44.entities.MemberActivityLog.create({
                            action: 'contact_log',
                            member_id: member.id,
                            member_name: `${member.first_name} ${member.last_name}`,
                            performed_by: user.full_name || 'System',
                            timestamp: new Date().toISOString(),
                            details: `Bulk Email Sent: ${config.subject}`
                        });
                    } else {
                        results.failed++;
                        results.errors.push(`No email for ${member.first_name} ${member.last_name}`);
                    }
                } else if (actionType === 'create_task') {
                    await base44.entities.Task.create({
                        title: `${config.title} - ${member.first_name} ${member.last_name}`,
                        description: `${config.description}\n\nMember Link: /admin/members?search=${member.last_name}`,
                        status: 'To Do',
                        priority: config.priority || 'Medium',
                        due_date: config.due_date,
                        assignee_id: config.assignee_id
                    });
                    
                    // Update member follow-up status if requested
                    if (config.update_member_followup) {
                         await base44.entities.Member.update(member.id, {
                             follow_up_status: 'pending',
                             follow_up_date: config.due_date,
                             follow_up_notes: `Bulk Task: ${config.title}`
                         });
                    }

                    results.success++;
                } else if (actionType === 'update_field') {
                    // Generic update
                    await base44.entities.Member.update(member.id, config.updates);
                    results.success++;
                }
            } catch (err) {
                console.error(`Error processing member ${member.id}`, err);
                results.failed++;
                results.errors.push(err.message);
            }
        }

        return Response.json(results);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});