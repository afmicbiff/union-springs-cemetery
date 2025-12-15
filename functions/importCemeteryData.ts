import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
    try {
        console.log("Function started");
        const fileUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/310123335_UnionSpringsCemeterySpreadsheet_as_of_12_04_20251.pdf";
        
        // Diagnostic: Check if file is reachable
        const headRes = await fetch(fileUrl, { method: 'HEAD' });
        const size = headRes.headers.get('content-length');
        const type = headRes.headers.get('content-type');
        console.log(`File check: ${headRes.status} ${size} bytes ${type}`);

        if (!headRes.ok) {
            return Response.json({ error: "File not reachable", status: headRes.status }, { status: 400 });
        }

        // If file is too large (> 10MB), warn the user
        if (size && parseInt(size) > 10 * 1024 * 1024) {
            return Response.json({ error: "File is too large for automatic processing. Please convert to CSV." }, { status: 400 });
        }

        // Proceed with simplified extraction attempt
        const base44 = createClientFromRequest(req);
        
        // Try to use InvokeLLM with a simplified prompt and NO schema to avoid complexity first
        // We just want to see if we can get ANY text back.
        // If this works, we know we can process the file.
        
        /*
        // COMMENTING OUT EXTRACTION FOR DIAGNOSTIC RUN
        // If this diagnostic passes (returns 200), we know the deployment is fine.
        
        const extractRes = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url: fileUrl,
            json_schema: { "type": "object", "properties": { "records": { "type": "array" } } }
        });
        */

        return Response.json({ 
            success: true, 
            message: "Diagnostic passed. File is reachable.",
            file_info: { size, type },
            plots_created: 0,
            deceased_created: 0
        });

    } catch (error) {
        console.error("Function error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});