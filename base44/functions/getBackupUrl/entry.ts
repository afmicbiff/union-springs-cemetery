import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { file_uri } = await req.json();
        if (!file_uri) {
            return Response.json({ error: 'Missing file_uri' }, { status: 400 });
        }

        // Generate signed URL (valid for 1 hour = 3600 seconds)
        const result = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
            file_uri: file_uri,
            expires_in: 3600
        });

        return Response.json(result);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});