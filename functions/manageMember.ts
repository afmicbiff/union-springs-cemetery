import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Parse request
        const { action, id, data } = await req.json();
        
        // Auth check
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        let result;
        let oldMember = null;
        let emailSent = [];

        if (action === 'update' && id) {
            // Get old data for comparison (specifically donation)
            // We use filter to find by ID since there's no direct get(id) exposed in this context commonly
            const existing = await base44.entities.Member.filter({ id });
            if (existing && existing.length > 0) {
                oldMember = existing[0];
            }
            
            // Perform Update
            result = await base44.entities.Member.update(id, data);
            
        } else if (action === 'create') {
            // Perform Create
            result = await base44.entities.Member.create(data);
        } else {
            return Response.json({ error: "Invalid action. Use 'create' or 'update'." }, { status: 400 });
        }

        // --- Workflow Logic ---
        const email = result.email_primary;
        
        if (email) {
            // 1. Welcome Email (New Member)
            if (action === 'create') {
                try {
                    await base44.integrations.Core.SendEmail({
                        to: email,
                        subject: "Welcome to Union Springs Cemetery Community",
                        body: `Dear ${result.first_name},\n\nWe are honored to welcome you to the Union Springs Cemetery community. Thank you for joining us.\n\nSincerely,\nThe Administration`
                    });
                    emailSent.push('welcome');
                } catch (e) {
                    console.error("Failed to send welcome email", e);
                }
            }

            // 2. Donation Thank You (New or Changed Donation)
            const newDonation = result.donation;
            const oldDonation = oldMember ? oldMember.donation : null;

            // Trigger if there is a donation, and it's either a new record OR the donation value changed
            if (newDonation && (!oldMember || newDonation !== oldDonation)) {
                try {
                    await base44.integrations.Core.SendEmail({
                        to: email,
                        subject: "Thank You for Your Generous Donation",
                        body: `Dear ${result.first_name},\n\nWe successfully received your donation: ${newDonation}.\n\nYour support helps us preserve the dignity and beauty of Union Springs. We are deeply grateful for your contribution.\n\nSincerely,\nThe Administration`
                    });
                    emailSent.push('donation_thank_you');
                } catch (e) {
                    console.error("Failed to send donation email", e);
                }
            }
        }

        return Response.json({ ...result, _workflows_triggered: emailSent });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});