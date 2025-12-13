import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate user
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all employees
        const employees = await base44.entities.Employee.list({ limit: 1000 });
        
        const checklistMandatory = [
            "Form I-9", 
            "Form W-4", 
            "Form L-4", 
            "Offer Letter", 
            "New Hire Reporting"
        ];

        let remindersSent = 0;
        const results = [];

        for (const emp of employees) {
            // Skip if no email
            if (!emp.email) continue;

            const checklist = emp.checklist || {};
            const missingItems = checklistMandatory.filter(item => !checklist[item]);

            // If everything is complete, skip
            if (missingItems.length === 0) continue;

            // Optional: Skip if reminder sent recently (e.g., within last 24 hours)
            // For now, we'll allow manual triggering whenever

            // Send Email
            try {
                await base44.integrations.Core.SendEmail({
                    to: emp.email,
                    subject: "Action Required: Complete Your Onboarding - Union Springs Cemetery",
                    body: `
                        Dear ${emp.first_name},

                        This is a reminder that you have incomplete onboarding tasks required for your employment at Union Springs Cemetery.

                        Please complete the following items as soon as possible:
                        ${missingItems.map(item => `- ${item}`).join('\n')}

                        If you have already submitted these documents, please contact the administration office to verify.

                        Thank you,
                        Union Springs Administration
                    `
                });

                // Update last_reminder_sent
                await base44.entities.Employee.update(emp.id, {
                    last_reminder_sent: new Date().toISOString()
                });

                remindersSent++;
                results.push({ name: `${emp.first_name} ${emp.last_name}`, status: "Sent", missing: missingItems });

            } catch (emailError) {
                console.error(`Failed to send email to ${emp.email}:`, emailError);
                results.push({ name: `${emp.first_name} ${emp.last_name}`, status: "Failed", error: emailError.message });
            }
        }

        return Response.json({ 
            success: true, 
            reminders_sent: remindersSent, 
            details: results 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});