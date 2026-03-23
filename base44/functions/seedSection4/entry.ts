import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) { return Response.json({ error: 'Unauthorized' }, { status: 401 }); }
        if (user.role !== 'admin') { return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 }); }
        
        // Ranges for Section 4
        // Note: Col 9 has two disjoint ranges.
        const ranges = [
            { start: 208, end: 223 },
            { start: 269, end: 298 },
            { start: 349, end: 378 },
            { start: 431, end: 461 },
            { start: 513, end: 542 },
            { start: 546, end: 576 },
            { start: 630, end: 658 },
            { start: 712, end: 719 }, // Including 719
            { start: 789, end: 795 }, // Col 9 Part 1
            { start: 720, end: 737 }, // Col 9 Part 2
            { start: 844, end: 870 }, // Assuming 670 was typo for 870
            { start: 923, end: 945 }
        ];

        let createdCount = 0;
        let skippedCount = 0;

        // Fetch existing plots for Section 4
        const existingSection4 = await base44.asServiceRole.entities.Plot.list(null, 2000); 
        const existingNumbers = new Set(
            existingSection4
                .filter(p => p.section === '4' || p.section === 'Section 4')
                .map(p => parseInt(p.plot_number))
        );

        for (const r of ranges) {
            for (let num = r.start; num <= r.end; num++) {
                if (existingNumbers.has(num)) {
                    skippedCount++;
                    continue;
                }

                let row = 'Grid';
                if (num === 942) row = 'N-9';
                if (num >= 943 && num <= 945) row = 'O-9';

                await base44.asServiceRole.entities.Plot.create({
                    section: '4',
                    row_number: row,
                    plot_number: num.toString(),
                    status: 'Available',
                    notes: `Seeded for Section 4 Grid`
                });
                createdCount++;
            }
        }

        return Response.json({ 
            message: `Section 4 Seeding Complete`, 
            created: createdCount, 
            skipped: skippedCount 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});