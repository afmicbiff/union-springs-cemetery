import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { query } = await req.json();

        if (!query) {
            return Response.json({ error: "Query is required" }, { status: 400 });
        }

        const prompt = `
        You are a search assistant for a cemetery database.
        The user will provide a natural language search query.
        Your job is to translate this query into structured search filters.
        
        Available filters:
        - q: General text search (name, obituary keywords)
        - family: Family name (string)
        - section: Cemetery section (options: "North", "South", "East", "West", "Garden of Peace", "Old Historic") - use "all" if not specified.
        - veteran: Veteran status (options: "true", "false", "all") - default "all".
        - bMin: Birth year minimum (YYYY string)
        - bMax: Birth year maximum (YYYY string)
        - dMin: Death year minimum (YYYY string)
        - dMax: Death year maximum (YYYY string)
        
        Also provide 3 short "related_suggestions" for follow-up searches based on the context (e.g. if searching for WW2, suggest "Korean War" or specific years).

        User Query: "${query}"
        
        Return JSON format.
        `;

        // Use schema-less call to avoid provider 'thinking' requirement; parse manually
        const raw = await base44.integrations.Core.InvokeLLM({ prompt });
        let output = raw;
        try {
            output = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch (_) {
            output = {
                filters: { q: query, section: "all", veteran: "all" },
                explanation: "Parsed with fallback.",
                related_suggestions: ["Add a date range", "Filter by family name", "Search for veterans only"]
            };
        }

        return Response.json(output);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});