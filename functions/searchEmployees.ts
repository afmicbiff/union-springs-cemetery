import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify authentication
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const term = (payload.searchTerm || "").toLowerCase().trim();

        // Fetch a larger dataset for server-side filtering
        // We fetch up to 5000 records to ensure we cover most employees
        const employees = await base44.entities.Employee.list('-created_date', 5000) || [];

        if (!term) {
             return Response.json({ employees: employees.slice(0, 100) });
        }

        const filtered = employees.filter(emp => {
            const first = (emp.first_name || "").toLowerCase();
            const last = (emp.last_name || "").toLowerCase();
            const full = `${first} ${last}`;
            const email = (emp.email || "").toLowerCase();
            const num = String(emp.employee_number || "");
            
            return first.includes(term) || 
                   last.includes(term) || 
                   full.includes(term) || 
                   email.includes(term) || 
                   num.includes(term);
        });

        // Return top 100 matches to keep response size manageable
        return Response.json({ employees: filtered.slice(0, 100) });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});