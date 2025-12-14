import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await req.json();

        // 1. Fetch latest vendor to generate ID
        // Sort by created_date desc to get latest. 
        // Note: Ideally we'd sort by vendor_id but standard sort is often by date. 
        // We'll fetch a few and parse max ID to be safe or rely on latest created.
        const vendors = await base44.entities.Vendor.list('-created_date', 10);
        
        let nextId = 1001;
        if (vendors && vendors.length > 0) {
            // Find max existing ID
            const ids = vendors
                .map(v => parseInt(v.vendor_id))
                .filter(n => !isNaN(n));
            
            if (ids.length > 0) {
                nextId = Math.max(...ids) + 1;
            }
        }

        // 2. Create Vendor
        const newVendor = await base44.entities.Vendor.create({
            ...data,
            vendor_id: String(nextId)
        });

        return Response.json(newVendor);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});