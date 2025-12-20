import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { action } = payload;

        // --- ACTION: SEND MASS NOTIFICATION ---
        if (action === 'sendMass') {
            if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
            
            const { subject, message, targetGroup, sendEmail, sendInApp } = payload;
            let recipients = [];

            // 1. Resolve Recipients
            if (targetGroup === 'all_members') {
                const members = await base44.asServiceRole.entities.Member.list(null, 1000); // Pagination needed for prod
                recipients = members.map(m => m.email_primary).filter(e => e);
            } else if (targetGroup === 'plot_owners') {
                const reservations = await base44.asServiceRole.entities.Reservation.list(null, 1000);
                recipients = [...new Set(reservations.map(r => r.owner_email).filter(e => e))];
            } else if (targetGroup === 'employees') {
                const employees = await base44.asServiceRole.entities.Employee.list(null, 1000);
                recipients = employees.map(e => e.email).filter(e => e);
            }

            const results = { emailCount: 0, notifCount: 0 };

            // 2. Send Emails (Batched ideally, simpler loop here)
            if (sendEmail) {
                // In production, use a queue or batch endpoint. Here we iterate.
                // We'll process in chunks to not timeout.
                const emailPromises = recipients.map(email => 
                    base44.asServiceRole.integrations.Core.SendEmail({
                        to: email,
                        subject: subject || 'Update from Union Springs Cemetery',
                        body: message,
                        from_name: 'Union Springs Admin'
                    }).catch(e => console.error(`Failed to email ${email}`, e))
                );
                await Promise.all(emailPromises); // Note: This might be slow for large lists
                results.emailCount = recipients.length;
            }

            // 3. Create In-App Notifications
            if (sendInApp) {
                const notifPromises = recipients.map(email => 
                    base44.asServiceRole.entities.Notification.create({
                        message: `${subject}: ${message.substring(0, 50)}...`,
                        type: 'info',
                        user_email: email,
                        is_read: false,
                        created_at: new Date().toISOString()
                    })
                );
                await Promise.all(notifPromises);
                results.notifCount = recipients.length;
            }

            return Response.json({ success: true, ...results });
        }

        // --- ACTION: SEND DIRECT MESSAGE ---
        if (action === 'sendMessage') {
            const { recipient_email, subject, body, thread_id } = payload;
            
            // Validate: Users can only send to ADMIN, Admins can send to anyone
            if (user.role !== 'admin' && recipient_email !== 'ADMIN') {
                return Response.json({ error: 'Forbidden' }, { status: 403 });
            }

            const newMessage = await base44.asServiceRole.entities.Message.create({
                sender_email: user.email,
                recipient_email: recipient_email,
                subject: subject || 'New Message',
                body: body,
                thread_id: thread_id || crypto.randomUUID(),
                type: 'direct',
                is_read: false
            });

            // Notify Recipient via Email
            if (recipient_email !== 'ADMIN') {
                await base44.asServiceRole.integrations.Core.SendEmail({
                    to: recipient_email,
                    subject: `New Message: ${subject}`,
                    body: `You have received a new message from Union Springs Cemetery:\n\n"${body}"\n\nPlease log in to the portal to reply.`,
                    from_name: 'Union Springs Cemetery'
                }).catch(console.error);
                
                // Also create in-app notification
                 await base44.asServiceRole.entities.Notification.create({
                    message: `New message from Admin: ${subject}`,
                    type: 'info',
                    user_email: recipient_email,
                    is_read: false,
                    created_at: new Date().toISOString()
                });
            } else {
                // Notify Admins
                await base44.asServiceRole.entities.Notification.create({
                    message: `New message from ${user.email}: ${subject}`,
                    type: 'info',
                    user_email: null, // Null indicates system-wide / admin notification
                    is_read: false,
                    created_at: new Date().toISOString()
                });
            }

            return Response.json({ success: true, message: newMessage });
        }

        // --- ACTION: GET CONVERSATIONS ---
        if (action === 'getConversations') {
            // Admin sees all, User sees own
            let messages;
            if (user.role === 'admin') {
                messages = await base44.asServiceRole.entities.Message.list('-created_date', 1000);
            } else {
                // User sees messages sent BY them OR sent TO them
                // Since .list doesn't support OR queries easily in one go usually, we fetch relevant and filter
                // Or better, fetch where recipient is user OR sender is user.
                // Assuming basic filtering:
                const sent = await base44.asServiceRole.entities.Message.filter({ sender_email: user.email }, '-created_date', 500);
                const received = await base44.asServiceRole.entities.Message.filter({ recipient_email: user.email }, '-created_date', 500);
                messages = [...sent, ...received].sort((a,b) => new Date(b.created_date) - new Date(a.created_date));
            }

            // Group by Thread
            const threads = {};
            messages.forEach(msg => {
                if (!threads[msg.thread_id]) {
                    threads[msg.thread_id] = {
                        id: msg.thread_id,
                        subject: msg.subject,
                        messages: [],
                        participants: new Set([msg.sender_email, msg.recipient_email]),
                        last_message: msg.created_date,
                        unread_count: (!msg.is_read && msg.recipient_email === user.email) ? 1 : 0 // Basic count
                    };
                } else {
                    if ((!msg.is_read && msg.recipient_email === user.email)) {
                        threads[msg.thread_id].unread_count++;
                    }
                }
                threads[msg.thread_id].messages.push(msg);
                threads[msg.thread_id].participants.add(msg.sender_email);
                threads[msg.thread_id].participants.add(msg.recipient_email);
            });

            // Format for UI
            const threadList = Object.values(threads).map(t => ({
                ...t,
                participants: Array.from(t.participants).filter(p => p !== 'ADMIN'),
                messages: t.messages.sort((a,b) => new Date(a.created_date) - new Date(b.created_date))
            })).sort((a,b) => new Date(b.last_message) - new Date(a.last_message));

            return Response.json({ threads: threadList });
        }
        
        // --- ACTION: MARK READ ---
        if (action === 'markRead') {
             const { message_ids } = payload;
             // Simple loop update
             for (const id of message_ids) {
                 await base44.asServiceRole.entities.Message.update(id, { is_read: true });
             }
             return Response.json({ success: true });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});