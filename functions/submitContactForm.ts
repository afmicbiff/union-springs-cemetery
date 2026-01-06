import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { z } from 'npm:zod@3.24.2';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Handle CORS preflight if necessary, though usually handled by platform
        if (req.method === 'OPTIONS') {
            return new Response(null, { status: 204 });
        }

        const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || '';
        const ua = req.headers.get('user-agent') || '';

        const body = await req.json();
        const Schema = z.object({
            name: z.string().min(2).max(120),
            email: z.string().email(),
            subject: z.string().max(200).optional().nullable(),
            message: z.string().min(10).max(5000)
        });
        const { name, email, subject, message } = Schema.parse(body);

        // Create a thread and message for Communication Center
        const threadId = crypto.randomUUID();
        const newMsg = await base44.asServiceRole.entities.Message.create({
            sender_email: email,
            recipient_email: 'ADMIN',
            subject: subject || 'General Inquiry',
            body: message,
            thread_id: threadId,
            type: 'contact',
            is_read: false
        });

        // Create in-app Notification referencing the message
        await base44.asServiceRole.entities.Notification.create({
            message: `New Contact Inquiry: ${subject || 'General Inquiry'} from ${name} (${email})`,
            type: "message",
            is_read: false,
            user_email: null,
            related_entity_type: "message",
            related_entity_id: newMsg.id,
            link: "/admin?tab=communication",
            created_at: new Date().toISOString()
        });

        // 1. Send notification to Admin
        // Using a placeholder admin email - in production this would be the actual office email
        const adminEmail = "office@unionsprings.com"; 

        // Send Email (non-blocking)
        try {
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
        const isValidation = error && (error.name === 'ZodError' || (typeof error.format === 'function' && Array.isArray(error.issues)));
        try {
            const base44ForLog = createClientFromRequest(req);
            const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || '';
            const ua = req.headers.get('user-agent') || '';
            await base44ForLog.asServiceRole.entities.SecurityEvent.create({
                event_type: isValidation ? 'contact_form_validation_error' : 'contact_form_error',
                severity: isValidation ? 'low' : 'medium',
                message: error.message || (isValidation ? 'Validation error' : 'Contact form error'),
                ip_address: ip,
                user_agent: ua,
                route: 'functions/submitContactForm',
                details: isValidation ? { issues: error.issues } : {}
            });
        } catch (_) {}
        console.error("Contact form error:", error);
        if (isValidation) {
            return Response.json({ error: 'Validation failed', issues: error.issues }, { status: 400 });
        }
        return Response.json({ error: 'Failed to send message' }, { status: 500 });
    }
});