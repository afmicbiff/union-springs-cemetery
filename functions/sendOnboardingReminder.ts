import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify authentication
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { employeeId } = await req.json();

        if (!employeeId) {
            return Response.json({ error: 'Employee ID is required' }, { status: 400 });
        }

        // Fetch employee
        const employees = await base44.entities.Employee.filter({ id: employeeId });
        const employee = employees[0];

        if (!employee) {
            return Response.json({ error: 'Employee not found' }, { status: 404 });
        }

        if (!employee.email) {
            return Response.json({ error: 'Employee has no email address' }, { status: 400 });
        }

        // Define checklist items (matching frontend)
        const checklistDefinition = [
            { name: "Form I-9", mandatory: true },
            { name: "Form W-4", mandatory: true },
            { name: "Form L-4", mandatory: true },
            { name: "Offer Letter", mandatory: true },
            { name: "New Hire Reporting", mandatory: true },
            { name: "Minor Cert", mandatory: false }
        ];

        // Identify missing mandatory items
        const currentChecklist = employee.checklist || {};
        const missingItems = checklistDefinition.filter(item => item.mandatory && !currentChecklist[item.name]);

        if (missingItems.length === 0) {
            return Response.json({ message: 'All mandatory items are complete.', sent: false });
        }

        // Construct email body
        const missingList = missingItems.map(item => `- ${item.name}`).join('\n');
        const body = `
Dear ${employee.first_name},

This is a reminder that the following mandatory onboarding items are still pending:

${missingList}

Please login to the portal and complete these items as soon as possible.

Best regards,
HR Team
        `.trim();

        // Send email
        await base44.integrations.Core.SendEmail({
            to: employee.email,
            subject: "Action Required: Outstanding Onboarding Items",
            body: body
        });

        return Response.json({ 
            success: true, 
            message: `Reminder sent for ${missingItems.length} missing items.`,
            sent: true
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});