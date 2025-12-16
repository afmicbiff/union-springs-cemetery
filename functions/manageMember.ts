import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Parse request
        const { action, id, data } = await req.json();
        
        // Auth check
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const userName = user.full_name || user.email;
        let result;
        let oldMember = null;
        let emailSent = [];
        let logAction = action;
        let memberName = "";

        // Helper to log activity
        const logActivity = async (act, memId, memName, details) => {
            await base44.entities.MemberActivityLog.create({
                action: act,
                member_id: memId,
                member_name: memName,
                performed_by: userName,
                timestamp: new Date().toISOString(),
                details: details || ""
            });
        };

        if (action === 'delete' && id) {
            const existing = await base44.entities.Member.filter({ id });
            if (existing && existing.length > 0) {
                memberName = `${existing[0].first_name} ${existing[0].last_name}`;
                await base44.entities.Member.delete(id);
                await logActivity('delete', id, memberName, "Member deleted permanently.");
                return Response.json({ success: true, id });
            } else {
                return Response.json({ error: "Member not found" }, { status: 404 });
            }
        }

        if (action === 'update' && id) {
            const existing = await base44.entities.Member.filter({ id });
            if (existing && existing.length > 0) {
                oldMember = existing[0];
                memberName = `${oldMember.first_name} ${oldMember.last_name}`;
            }
            result = await base44.entities.Member.update(id, data);
            await logActivity('update', id, memberName, "Updated member details.");
            
        } else if (action === 'create') {
            result = await base44.entities.Member.create(data);
            memberName = `${result.first_name} ${result.last_name}`;
            await logActivity('create', result.id, memberName, "Added new member.");

        } else if (action === 'log_contact' && id) {
            const existing = await base44.entities.Member.filter({ id });
            if (existing && existing.length > 0) {
                oldMember = existing[0];
                memberName = `${oldMember.first_name} ${oldMember.last_name}`;
                
                const newLog = {
                    timestamp: new Date().toISOString(),
                    type: data.type || 'note',
                    note: data.note || '',
                    logged_by: userName
                };

                const updatedLogs = [...(oldMember.contact_logs || []), newLog];
                
                result = await base44.entities.Member.update(id, { contact_logs: updatedLogs, last_contact_date: new Date().toISOString() });
                
                await logActivity('contact_log', id, memberName, `Logged ${data.type}: ${data.note.substring(0, 50)}...`);
            }
        } else {
            return Response.json({ error: "Invalid action" }, { status: 400 });
        }

        // --- Workflows (Only for Create/Update) ---
        if (action === 'create' || action === 'update') {
            const email = result.email_primary;
            if (email) {
                // 1. Welcome Email
                if (action === 'create') {
                    try {
                        await base44.integrations.Core.SendEmail({
                            to: email,
                            subject: "Welcome to Union Springs Cemetery Community",
                            body: `Dear ${result.first_name},\n\nWe are honored to welcome you to the Union Springs Cemetery community. Thank you for joining us.\n\nSincerely,\nThe Administration`
                        });
                        emailSent.push('welcome');
                    } catch (e) { console.error(e); }
                }

                // 2. Donation Thank You
                const newDonation = result.donation;
                const oldDonation = oldMember ? oldMember.donation : null;
                if (newDonation && (!oldMember || newDonation !== oldDonation)) {
                    try {
                        await base44.integrations.Core.SendEmail({
                            to: email,
                            subject: "Thank You for Your Generous Donation",
                            body: `Dear ${result.first_name},\n\nWe successfully received your donation: ${newDonation}.\n\nYour support helps us preserve the dignity and beauty of Union Springs. We are deeply grateful for your contribution.\n\nSincerely,\nThe Administration`
                        });
                        emailSent.push('donation_thank_you');
                    } catch (e) { console.error(e); }
                }
            }
        }

        return Response.json({ ...result, _workflows_triggered: emailSent });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});