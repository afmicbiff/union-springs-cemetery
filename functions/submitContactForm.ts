import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Handle CORS preflight if necessary, though usually handled by platform
        if (req.method === 'OPTIONS') {
            return new Response(null, { status: 204 });
        }

        const { name, email, subject, message } = await req.json();

        if (!name || !email || !message) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Send notification to Admin
        // Using a placeholder admin email - in production this would be the actual office email
        const adminEmail = "office@unionsprings.com"; 
        
        // Send Email
        await base44.integrations.Core.SendEmail({
            to: adminEmail,
            subject: `New Contact Inquiry: ${subject || 'General Inquiry'}`,
            body: `
New message received from the Contact Us form.

Details:
--------------------------------
Name: ${name}
Email: ${email}
Subject: ${subject || 'N/A'}

Message:
${message}
--------------------------------

Please reply to the user at ${email}.
            `
        });

        // Create In-App Notification for Admin
        await base44.asServiceRole.entities.Notification.create({
            message: `New Contact Inquiry from ${name}: ${subject || 'No Subject'}`,
            type: "info",
            is_read: false,
            user_email: null, // System-wide / Admin
            created_at: new Date().toISOString()
        });

        // 2. Send acknowledgement to User
        await base44.integrations.Core.SendEmail({
            to: email,
            subject: "We received your message - Union Springs Cemetery",
            body: `
Dear ${name},

Thank you for reaching out to Union Springs Cemetery. 

We have received your message regarding "${subject || 'your inquiry'}" and one of our advisors will review it shortly. We typically respond within 24-48 business hours.

If this is an urgent matter, please call our office at (555) 123-4567 during business hours.

Sincerely,
The Union Springs Cemetery Team
123 Granite Way, Union Springs
            `
        });

        return Response.json({ success: true });
    } catch (error) {
        console.error("Contact form error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});