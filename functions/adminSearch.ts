import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const query = body?.query;
        const page = Math.max(1, parseInt(body?.page || 1));
        const limit = Math.max(1, Math.min(50, parseInt(body?.limit || 20)));
        const perEntityLimit = Math.max(5, limit);
        
        if (!query || query.length < 2) {
            return Response.json({ results: [] });
        }

        const searchRegex = { $regex: query, $options: 'i' };
        
        // Handle full name searches (e.g. "John Doe")
        const nameParts = query.trim().split(/\s+/);
        const fullNameFilter = [];
        if (nameParts.length >= 2) {
            const first = { $regex: nameParts[0], $options: 'i' };
            const last = { $regex: nameParts.slice(1).join(' '), $options: 'i' };
            fullNameFilter.push({
                $and: [
                    { first_name: first },
                    { last_name: last }
                ]
            });
            // Also try reverse (Last First) just in case
            fullNameFilter.push({
                $and: [
                    { first_name: last },
                    { last_name: first }
                ]
            });
        }

        // Define search configurations for each entity
        const searchPromises = [
            base44.entities.Member.list({ 
                filter: { 
                    $or: [
                        { first_name: searchRegex }, 
                        { last_name: searchRegex },
                        { email_primary: searchRegex },
                        { phone_primary: searchRegex },
                        { comments: searchRegex },
                        { address: searchRegex },
                        { city: searchRegex },
                        ...fullNameFilter
                    ]
                },
                limit: perEntityLimit
            }).then(res => ({ type: 'member', results: res })),

            base44.entities.User.list({
                limit: 5
            }).then(res => {
                // Client-side filtering for User entity as it might not support complex $or with full_name regex depending on backend implementation
                // OR assuming .list() returns all users (usually small number) and we filter here.
                // However, better to rely on filter if possible.
                // If filter is supported for User:
                // return base44.entities.User.list({ filter: { $or: [{ full_name: searchRegex }, { email: searchRegex }] }, limit: 5 });
                // But safety rules might apply. Let's try listing all and filtering in memory if list is small, or use standard list.
                // Safe bet: fetch list and filter in memory since admin users are few.
                // If many users, this is bad, but for "company people" usually < 100.
                if (!res.items) return { type: 'user', results: [] };
                const filtered = res.items.filter(u => 
                    (u.full_name && u.full_name.match(new RegExp(query, 'i'))) || 
                    (u.email && u.email.match(new RegExp(query, 'i')))
                ).slice(0, 5);
                return { type: 'user', results: { items: filtered } };
            }),

            base44.entities.Plot.list({ 
                filter: { 
                    $or: [
                        { plot_number: searchRegex },
                        { section: searchRegex },
                        { notes: searchRegex }
                    ]
                },
                limit: perEntityLimit
            }).then(res => ({ type: 'plot', results: res })),

            base44.entities.Reservation.list({ 
                filter: { 
                    $or: [
                        { owner_name: searchRegex },
                        { owner_email: searchRegex }
                    ]
                },
                limit: perEntityLimit
            }).then(res => ({ type: 'reservation', results: res })),

            base44.entities.Employee.list({ 
                filter: { 
                    $or: [
                        { first_name: searchRegex },
                        { last_name: searchRegex },
                        { job_title: searchRegex },
                        { bio: searchRegex },
                        { email: searchRegex },
                        { department: searchRegex },
                        ...fullNameFilter
                    ]
                },
                limit: perEntityLimit
            }).then(res => ({ type: 'employee', results: res })),

            base44.entities.Vendor.list({ 
                filter: { 
                    $or: [
                        { company_name: searchRegex },
                        { contact_name: searchRegex },
                        { address_city: searchRegex },
                        { email: searchRegex },
                        { phone: searchRegex }
                    ]
                },
                limit: perEntityLimit
            }).then(res => ({ type: 'vendor', results: res })),

            base44.entities.Task.list({ 
                filter: { 
                    $or: [
                        { title: searchRegex },
                        { description: searchRegex }
                    ]
                },
                limit: perEntityLimit
            }).then(res => ({ type: 'task', results: res })),

            base44.entities.Announcement.list({ 
                filter: { 
                    $or: [
                        { title: searchRegex },
                        { content: searchRegex }
                    ]
                },
                limit: perEntityLimit
            }).then(res => ({ type: 'announcement', results: res })),

            base44.entities.Deceased.list({ 
                filter: { 
                    $or: [
                        { first_name: searchRegex },
                        { last_name: searchRegex },
                        { family_name: searchRegex },
                        { obituary: searchRegex },
                        { notes: searchRegex },
                        ...fullNameFilter
                    ]
                },
                limit: perEntityLimit
            }).then(res => ({ type: 'deceased', results: res })),

            base44.entities.Event.list({ 
                filter: { 
                    $or: [
                        { title: searchRegex },
                        { description: searchRegex }
                    ]
                },
                limit: perEntityLimit
            }).then(res => ({ type: 'event', results: res })),

            base44.entities.Notification.list({
                filter: { message: searchRegex },
                limit: perEntityLimit
            }).then(res => ({ type: 'notification', results: res })),

            base44.entities.MemberSegment.list({
                filter: {
                    $or: [
                        { name: searchRegex },
                        { description: searchRegex }
                    ]
                },
                limit: perEntityLimit
            }).then(res => ({ type: 'segment', results: res })),

            base44.entities.Condolence.list({
                filter: {
                    $or: [
                        { author_name: searchRegex },
                        { message: searchRegex },
                        { relation: searchRegex }
                    ]
                },
                limit: perEntityLimit
            }).then(res => ({ type: 'condolence', results: res })),

            base44.entities.VendorInvoice.list({
                filter: {
                    $or: [
                        { invoice_number: searchRegex },
                        { notes: searchRegex }
                    ]
                },
                limit: perEntityLimit
            }).then(res => ({ type: 'invoice', results: res }))
        ];

        // Use allSettled to prevent one failure from blocking all results
        const resultsSettled = await Promise.allSettled(searchPromises);
        
        const results = resultsSettled
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value);

        // Flatten and format results
        const flatResults = results.flatMap(group =>
            (group.results.items || group.results).map(item => ({
                id: item.id,
                type: group.type,
                label: getItemLabel(group.type, item),
                subLabel: getItemSubLabel(group.type, item),
                link: getItemLink(group.type, item),
            }))
        );

        const total = flatResults.length;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const start = (page - 1) * limit;
        const paged = flatResults.slice(start, start + limit);
        return Response.json({ results: paged, pagination: { total, page, limit, totalPages } });

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
        case 'deceased': return `${item.first_name} ${item.last_name}`;
        case 'event': return item.title;
        case 'user': return item.full_name || 'System User';
        case 'notification': return 'Notification';
        case 'segment': return item.name;
        case 'condolence': return `Condolence from ${item.author_name}`;
        case 'invoice': return `Invoice #${item.invoice_number}`;
        default: return 'Unknown';
    }
}

function getItemSubLabel(type, item) {
    switch(type) {
        case 'member': return item.email_primary || item.phone_primary || item.comments?.substring(0, 30);
        case 'plot': return item.status;
        case 'reservation': return item.plot_id;
        case 'employee': return item.job_title;
        case 'vendor': return item.contact_name || item.email;
        case 'task': return item.status;
        case 'announcement': return item.date;
        case 'deceased': return `Buried: ${item.plot_location}`;
        case 'event': return formatEventDate(item.start_time);
        case 'user': return item.email;
        case 'notification': return item.message;
        case 'segment': return item.description;
        case 'condolence': return item.message?.substring(0, 30);
        case 'invoice': return `Amount: $${item.amount_owed} - ${item.status}`;
        default: return '';
    }
}

function getItemLink(type, item) {
    // Return keys to help frontend switch tabs/open dialogs
    if (type === 'deceased') return { path: `/search?q=${item.last_name}` };
    if (type === 'event') return { type: 'calendar', id: item.id };
    if (type === 'user') return { type: 'employees' }; 
    if (type === 'notification') return { type: 'overview' }; // Notifications are on overview
    if (type === 'segment') return { type: 'members' }; // Segments are in members
    if (type === 'condolence') return { path: `/Memorial?id=${item.deceased_id}` };
    if (type === 'invoice') return { type: 'vendors', id: item.vendor_id };
    return { type, id: item.id };
}

function formatEventDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
}