import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, data } = await req.json();

    if (!action) return Response.json({ error: "Action required" }, { status: 400 });

    let prompt = "";
    let systemPrompt = "You are a helpful communication assistant for a cemetery admin dashboard. You are empathetic, professional, and respectful.";
    let jsonSchema = null;

    if (action === 'generate_draft') {
        const { context, recipientInfo, tone } = data;
        
        prompt = `Draft an email based on the following context: "${context}".
        
        Recipient Context: ${recipientInfo ? JSON.stringify(recipientInfo) : "General member"}
        
        Tone: ${tone || 'Professional'}
        
        If specific recipient details (like {first_name}) are not provided in the recipient info but are used in templates, keep them as placeholders (e.g. {first_name}).
        
        Return a JSON object with 'subject' and 'body'.`;
        
        jsonSchema = {
            type: "object",
            properties: {
                subject: { type: "string" },
                body: { type: "string" }
            },
            required: ["subject", "body"]
        };
    } else if (action === 'refine_draft') {
        const { currentDraft, instructions } = data;
        
        prompt = `Refine the following email draft.
        
        Current Subject: ${currentDraft.subject}
        Current Body: ${currentDraft.body}
        
        Instructions for improvement: ${instructions}
        
        Return a JSON object with the refined 'subject' and 'body'.`;

        jsonSchema = {
            type: "object",
            properties: {
                subject: { type: "string" },
                body: { type: "string" }
            },
            required: ["subject", "body"]
        };
    } else if (action === 'analyze_draft') {
        const { draft } = data;
        prompt = `Analyze the following email draft for tone, clarity, and personalization.
        
        Subject: ${draft.subject}
        Body: ${draft.body}
        
        Provide:
        1. A brief analysis of the current tone and clarity.
        2. 3 specific suggestions for improvement.
        3. An improved version of the email that incorporates these suggestions.
        
        Return a JSON object.`;
        
        jsonSchema = {
            type: "object",
            properties: {
                analysis: { type: "string" },
                suggestions: { type: "array", items: { type: "string" } },
                improved_version: {
                    type: "object",
                    properties: {
                        subject: { type: "string" },
                        body: { type: "string" }
                    },
                    required: ["subject", "body"]
                }
            },
            required: ["analysis", "suggestions", "improved_version"]
        };
    } else if (action === 'suggest_followup') {
        const { content } = data;
         prompt = `Analyze the following email or note content and suggest a relevant follow-up task or log entry classification.
         
         Content: "${content}"
         
         Return a JSON object with:
         - 'suggested_task': null or object with 'title', 'description', 'due_in_days' (integer).
         - 'suggested_log_type': One of ['note', 'call', 'email', 'meeting'].
         `;
         
         jsonSchema = {
             type: "object",
             properties: {
                 suggested_task: {
                     anyOf: [
                        {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                description: { type: "string" },
                                due_in_days: { type: "integer" }
                            }
                        },
                        { type: "null" }
                     ]
                 },
                 suggested_log_type: { type: "string", enum: ["note", "call", "email", "meeting"] }
             }
         };
    } else {
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    const response = await base44.integrations.Core.InvokeLLM({
        prompt: systemPrompt + "\n\n" + prompt,
        response_json_schema: jsonSchema
    });

    return Response.json(response);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});