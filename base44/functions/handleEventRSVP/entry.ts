import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const url = new URL(req.url);
        const eventId = url.searchParams.get('id');
        const email = url.searchParams.get('email');
        const status = url.searchParams.get('status');

        if (!eventId || !email || !status) {
            return new Response("Missing parameters", { status: 400 });
        }

        const base44 = createClientFromRequest(req);
        
        // Use service role to ensure we can update the event even if the user isn't logged in
        // (This function is accessed via public email link)
        const event = await base44.asServiceRole.entities.Event.get(eventId);

        if (!event) {
            return new Response("Event not found", { status: 404 });
        }

        const externalAttendees = event.external_attendees || [];
        const attendeeIndex = externalAttendees.findIndex(a => a.email === email);

        if (attendeeIndex === -1) {
            return new Response("Attendee not found in this event", { status: 404 });
        }

        // Update status
        externalAttendees[attendeeIndex].status = status;

        await base44.asServiceRole.entities.Event.update(eventId, {
            external_attendees: externalAttendees
        });

        // Return a nice HTML response
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>RSVP Confirmed</title>
                <style>
                    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f5f5f4; color: #1c1917; }
                    .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); text-align: center; max-width: 400px; }
                    h1 { color: ${status === 'accepted' ? '#0f766e' : '#78350f'}; margin-bottom: 1rem; }
                    p { color: #57534e; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>${status === 'accepted' ? 'Accepted!' : 'Declined'}</h1>
                    <p>You have successfully <strong>${status}</strong> the invitation for:</p>
                    <p style="font-weight: bold; margin: 1.5rem 0;">${event.title}</p>
                    <p>Thank you for your response.</p>
                </div>
            </body>
            </html>
        `;

        return new Response(html, {
            headers: { "Content-Type": "text/html" }
        });

    } catch (error) {
        return new Response("Error processing RSVP: " + error.message, { status: 500 });
    }
});