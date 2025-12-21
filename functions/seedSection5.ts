import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Ranges for Section 5
        const ranges = [
            { start: 224, end: 236 },
            { start: 299, end: 302 },
            { start: 1001, end: 1014 },
            { start: 379, end: 382 },
            { start: 1015, end: 1026 },
            { start: 462, end: 465 },
            { start: 1029, end: 1042 },
            { start: 543, end: 546 },
            { start: 1043, end: 1056 },
            { start: 577, end: 580 },
            { start: 1057, end: 1069 }, // 1070 is special
            { start: 659, end: 664 },
            { start: 1071, end: 1083 }, // 1084 is special
            { start: 1085, end: 1102 },
            { start: 738, end: 738 },
            { start: 739, end: 742 },
            { start: 871, end: 874 }
        ];

        let createdCount = 0;
        let skippedCount = 0;

        // Fetch existing plots for Section 5
        const existingSection5 = await base44.asServiceRole.entities.Plot.list(null, 2000); 
        const existingNumbers = new Set(
            existingSection5
                .filter(p => p.section === '5' || p.section === 'Section 5')
                .map(p => p.plot_number)
        );

        // Helper to create plot
        const createPlot = async (num, row = 'Grid', suffix = '') => {
            const plotNum = `${num}${suffix}`;
            if (existingNumbers.has(plotNum)) {
                skippedCount++;
                return;
            }

            await base44.asServiceRole.entities.Plot.create({
                section: '5',
                row_number: row,
                plot_number: plotNum,
                status: 'Available',
                notes: `Seeded for Section 5 Grid`
            });
            createdCount++;
        };

        // Seed Standard Ranges
        for (const r of ranges) {
            for (let num = r.start; num <= r.end; num++) {
                await createPlot(num);
            }
        }

        // Seed Special Plots
        // 1070-A U-7, 1070-B U-7
        await createPlot('1070', 'U-7', '-A');
        await createPlot('1070', 'U-7', '-B');

        // 1084-A U-7, 1084-B U-7
        await createPlot('1084', 'U-7', '-A');
        await createPlot('1084', 'U-7', '-B');


        return Response.json({ 
            message: `Section 5 Seeding Complete`, 
            created: createdCount, 
            skipped: skippedCount 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});