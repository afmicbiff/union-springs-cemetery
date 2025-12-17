import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { query } = await req.json();
        
        if (!query || query.length < 2) {
            return Response.json({ results: [] });
        }

        const searchRegex = { $regex: query, $options: 'i' };

        // Define search configurations for each entity
        const searches = [
            base44.entities.Member.list({ 
                filter: { 
                    $or: [
                        { first_name: searchRegex }, 
                        { last_name: searchRegex },
                        { email_primary: searchRegex },
                        { phone_primary: searchRegex }
                    ]
                },
                limit: 5
            }).then(res => ({ type: 'member', results: res })),

            base44.entities.Plot.list({ 
                filter: { 
                    $or: [
                        { plot_number: searchRegex },
                        { section: searchRegex },
                        { notes: searchRegex }
                    ]
                },
                limit: 5
            }).then(res => ({ type: 'plot', results: res })),

            base44.entities.Reservation.list({ 
                filter: { 
                    $or: [
                        { owner_name: searchRegex },
                        { owner_email: searchRegex }
                    ]
                },
                limit: 5
            }).then(res => ({ type: 'reservation', results: res })),

            base44.entities.Employee.list({ 
                filter: { 
                    $or: [
                        { first_name: searchRegex },
                        { last_name: searchRegex },
                        { job_title: searchRegex }
                    ]
                },
                limit: 5
            }).then(res => ({ type: 'employee', results: res })),

            base44.entities.Vendor.list({ 
                filter: { 
                    $or: [
                        { company_name: searchRegex },
                        { contact_name: searchRegex }
                    ]
                },
                limit: 5
            }).then(res => ({ type: 'vendor', results: res })),

            base44.entities.Task.list({ 
                filter: { 
                    $or: [
                        { title: searchRegex },
                        { description: searchRegex }
                    ]
                },
                limit: 5
            }).then(res => ({ type: 'task', results: res })),

            base44.entities.Announcement.list({ 
                filter: { 
                    $or: [
                        { title: searchRegex },
                        { content: searchRegex }
                    ]
                },
                limit: 5
            }).then(res => ({ type: 'announcement', results: res }))
        ];

        const results = await Promise.all(searches);
        
        // Flatten and format results
        const flatResults = results.flatMap(group => 
            (group.results.items || group.results).map(item => ({
                ...item,
                type: group.type,
                // Add a consistent label/description for the UI
                label: getItemLabel(group.type, item),
                subLabel: getItemSubLabel(group.type, item),
                link: getItemLink(group.type, item)
            }))
        );

        return Response.json({ results: flatResults });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});

function getItemLabel(type, item) {
    switch(type) {
        case 'member': return `${item.first_name} ${item.last_name}`;
        case 'plot': return `Plot ${item.section}-${item.plot_number}`;
        case 'reservation': return `Reservation: ${item.owner_name}`;
        case 'employee': return `${item.first_name} ${item.last_name}`;
        case 'vendor': return item.company_name;
        case 'task': return item.title;
        case 'announcement': return item.title;
        default: return 'Unknown';
    }
}

function getItemSubLabel(type, item) {
    switch(type) {
        case 'member': return item.email_primary || item.phone_primary;
        case 'plot': return item.status;
        case 'reservation': return item.plot_id;
        case 'employee': return item.job_title;
        case 'vendor': return item.contact_name;
        case 'task': return item.status;
        case 'announcement': return item.date;
        default: return '';
    }
}

function getItemLink(type, item) {
    // Return keys to help frontend switch tabs/open dialogs
    return { type, id: item.id };
}