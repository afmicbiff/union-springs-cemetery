import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { invoice_id } = await req.json();

        if (!invoice_id) {
            return Response.json({ error: 'Invoice ID required' }, { status: 400 });
        }

        const invoice = await base44.asServiceRole.entities.Invoice.get(invoice_id);
        if (!invoice) {
            return Response.json({ error: 'Invoice not found' }, { status: 404 });
        }

        const member = await base44.asServiceRole.entities.Member.get(invoice.member_id);
        if (!member || !member.email_primary) {
            return Response.json({ error: 'Member or member email not found' }, { status: 404 });
        }

        // Send Email
        await base44.asServiceRole.integrations.Core.SendEmail({
            to: member.email_primary,
            subject: `Invoice Reminder: ${invoice.title} (#${invoice.invoice_number})`,
            body: `Dear ${member.first_name},\n\nThis is a friendly reminder regarding invoice #${invoice.invoice_number} for "${invoice.title}".\n\nAmount Due: $${invoice.amount.toFixed(2)}\nDue Date: ${invoice.due_date}\nStatus: ${invoice.status}\n\nPlease arrange for payment at your earliest convenience.\n\nThank you,\nUnion Springs Cemetery Administration`
        });

        // Log notification
        await base44.asServiceRole.entities.Notification.create({
            message: `Payment reminder sent for Invoice #${invoice.invoice_number}`,
            type: "info",
            user_email: member.email_primary,
            is_read: false,
            created_at: new Date().toISOString()
        });

        return Response.json({ success: true, message: 'Reminder sent successfully' });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});