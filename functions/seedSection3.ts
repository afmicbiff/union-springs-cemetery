import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Define the ranges for Section 3
        // Each object represents a column with start and end plot numbers
        const columns = [
            { start: 251, end: 268, col: 1 },
            { start: 326, end: 348, col: 2 }, // Extended to 348
            { start: 406, end: 430, col: 3 },
            { start: 489, end: 512, col: 4 },
            { start: 605, end: 633, col: 5 }, // Extended to 633
            { start: 688, end: 711, col: 6 },
            { start: 765, end: 788, col: 7 },
            { start: 821, end: 843, col: 8 },
            { start: 898, end: 930, col: 9 }  // Extended to 930
        ];

        let createdCount = 0;
        let skippedCount = 0;

        // Fetch existing plots for Section 3 to avoid duplicates
        // Note: list() might be paginated, so robust checking would need comprehensive fetch.
        // For this seed, we'll just try to create and handle unique constraint if enforced, 
        // or check existence one by one or in batches if possible.
        // Base44 list limit is usually high enough for a section.
        const existingSection3 = await base44.asServiceRole.entities.Plot.list(null, 2000); 
        const existingNumbers = new Set(
            existingSection3
                .filter(p => p.section === '3' || p.section === 'Section 3')
                .map(p => parseInt(p.plot_number))
        );

        for (const col of columns) {
            for (let num = col.start; num <= col.end; num++) {
                if (existingNumbers.has(num)) {
                    skippedCount++;
                    continue;
                }

                await base44.asServiceRole.entities.Plot.create({
                    section: '3',
                    row_number: `Col ${col.col}`, // Storing column info in row_number for reference
                    plot_number: num.toString(),
                    status: 'Available',
                    notes: `Seeded for Section 3 Grid (Col ${col.col})`
                });
                createdCount++;
            }
        }

        return Response.json({ 
            message: `Section 3 Seeding Complete`, 
            created: createdCount, 
            skipped: skippedCount 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});