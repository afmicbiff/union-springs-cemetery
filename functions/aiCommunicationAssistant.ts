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
    } else if (action === 'suggest_campaigns') {
        // Suggest campaigns based on date/season or generic patterns
        // In a real app, we'd feed in aggregate member data
        const date = new Date().toLocaleDateString();
        prompt = `Suggest 3 communication campaigns for a cemetery membership based on the current date (${date}).
        
        Focus on engagement, remembrance, or maintenance updates.
        
        Return a JSON object with a list of campaigns. Each campaign should have:
        - title
        - description
        - target_audience
        - suggested_subject
        `;
        
        jsonSchema = {
            type: "object",
            properties: {
                campaigns: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            title: { type: "string" },
                            description: { type: "string" },
                            target_audience: { type: "string" },
                            suggested_subject: { type: "string" }
                        },
                        required: ["title", "description", "target_audience"]
                    }
                }
            },
            required: ["campaigns"]
        };
    } else {
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    // Use schema-less call to avoid provider 'thinking' requirements; parse JSON manually
    const raw = await base44.integrations.Core.InvokeLLM({
        prompt: systemPrompt + "\n\n" + prompt
    });

    let output = raw;
    try {
        output = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (_) {
        // Fallback minimal structures per action to keep UI functional
        if (action === 'suggest_campaigns') {
            output = { campaigns: [
                { title: "Community Clean-Up Day", description: "Invite members to a seasonal grounds clean-up and refreshments.", target_audience: "All members", suggested_subject: "Join Us for Community Clean-Up Day" },
                { title: "In Remembrance", description: "Share a thoughtful message and encourage memorial submissions.", target_audience: "Families and friends", suggested_subject: "A Moment of Remembrance" },
                { title: "Maintenance Update", description: "Update on recent maintenance and upcoming improvements.", target_audience: "All members", suggested_subject: "Cemetery Maintenance Update" }
            ]};
        } else if (action === 'generate_draft' || action === 'refine_draft') {
            output = { subject: "Draft Subject", body: "Hello {first_name},\n\nHere is a helpful update.\n\nBest regards,\nUnion Springs" };
        } else if (action === 'analyze_draft') {
            output = { analysis: "Clear and respectful.", suggestions: ["Personalize greeting", "Tighten subject", "Add clear CTA"], improved_version: { subject: "Updated Subject", body: "Hello {first_name},\n\n..." } };
        } else if (action === 'suggest_followup') {
            output = { suggested_task: null, suggested_log_type: "note" };
        }
    }

    return Response.json(output);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});