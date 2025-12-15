import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Papa from 'npm:papaparse@5.4.1';
import { format, parse } from 'npm:date-fns@3.6.0';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const fileUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/31609118e_UnionSpringsCemeterySpreadsheet_as_of_12_04_20251ssssss.txt";

        console.log("Fetching file...");
        const fileRes = await fetch(fileUrl);
        if (!fileRes.ok) throw new Error("Failed to fetch file");
        const fileText = await fileRes.text();

        console.log("Parsing CSV/TSV...");
        
        // Pre-process: Find the header row (skipping title lines)
        const lines = fileText.split('\n');
        const headerIndex = lines.findIndex(line => 
            line.includes('Grave') && line.includes('Row') && line.includes('Status')
        );
        
        if (headerIndex === -1) {
            throw new Error("Could not find header row (Grave, Row, Status) in file");
        }

        const cleanCsvContent = lines.slice(headerIndex).join('\n');

        // Parse TSV data
        const { data: records, errors } = Papa.parse(cleanCsvContent, {
            header: true,
            skipEmptyLines: true,
            delimiter: '\t', // Explicitly setting tab delimiter based on the file content
            transformHeader: (h) => h.trim() // Clean headers
        });

        if (errors.length > 0) {
            console.warn("Parse errors:", errors);
        }

        console.log(`Parsed ${records.length} records. Processing...`);

        let plotsCreated = 0;
        let plotsUpdated = 0;
        let deceasedCreated = 0;

        // Fetch existing plots to minimize DB calls (batch fetching)
        // Optimization: Fetch all plots. If too many, might need pagination, but for <5000 it's usually fine in memory.
        const allPlots = await base44.entities.Plot.list({ limit: 5000 });
        const plotMap = new Map(allPlots.map(p => [`${p.row_number}-${p.plot_number}`, p]));

        // Helper to format date from M/D/YYYY to YYYY-MM-DD
        const formatDate = (dateStr) => {
            if (!dateStr) return undefined;
            try {
                // Try parsing M/D/YYYY
                const parsed = parse(dateStr, 'M/d/yyyy', new Date());
                if (isNaN(parsed)) return undefined;
                return format(parsed, 'yyyy-MM-dd');
            } catch (e) {
                return undefined;
            }
        };

        // Process in chunks to avoid overwhelming the loop
        for (const record of records) {
            // Clean keys (sometimes headers have artifacts)
            const getVal = (key) => record[key]?.trim();

            const row = getVal('Row');
            const grave = getVal('Grave');
            if (!row || !grave) continue;

            const plotKey = `${row}-${grave}`;
            const statusRaw = getVal('Status') || 'Available';
            
            // Normalize status
            let status = 'Available';
            if (statusRaw.toLowerCase().includes('occupied')) status = 'Occupied';
            else if (statusRaw.toLowerCase().includes('reserved')) status = 'Reserved';
            else if (statusRaw.toLowerCase().includes('unavailable')) status = 'Unavailable';
            else if (statusRaw.toLowerCase().includes('not usable')) status = 'Not Usable';

            // 1. Handle Plot
            let plotId;
            if (plotMap.has(plotKey)) {
                const existingPlot = plotMap.get(plotKey);
                // Only update if status changed significantly or logic dictates
                // For this import, we assume the file is the source of truth
                if (existingPlot.status !== status) {
                    await base44.entities.Plot.update(existingPlot.id, { status });
                    plotsUpdated++;
                }
                plotId = existingPlot.id;
            } else {
                const newPlot = await base44.entities.Plot.create({
                    section: row.split('-')[0] || "Main",
                    row_number: row,
                    plot_number: grave,
                    status: status,
                    notes: "Imported via CSV"
                });
                plotMap.set(plotKey, newPlot); // Add to map for future ref
                plotId = newPlot.id;
                plotsCreated++;
            }

            // 2. Handle Deceased (Only if Occupied and has name)
            const lastName = getVal('Last Name');
            const firstName = getVal('First Name');
            
            if (status === 'Occupied' && lastName) {
                // Simple duplicate check: Last Name + Plot Location
                // Note: Ideally we'd fetch all deceased too, but let's check one-by-one for safety or optimistically create
                // To save time, we'll check existence.
                const existingDeceased = await base44.entities.Deceased.filter({
                    last_name: lastName,
                    plot_location: plotKey
                }, 1);

                if (existingDeceased.length === 0) {
                    await base44.entities.Deceased.create({
                        first_name: firstName || "Unknown",
                        last_name: lastName,
                        family_name: getVal('Family Name'),
                        date_of_birth: formatDate(getVal('Birth')),
                        date_of_death: formatDate(getVal('Death')),
                        plot_location: plotKey,
                        notes: getVal('Notes'),
                        burial_type: "Casket",
                        veteran_status: (getVal('Notes') || "").toLowerCase().includes('vet')
                    });
                    deceasedCreated++;
                }
            }
        }

        return Response.json({ 
            success: true, 
            message: "Full import completed",
            plots_created: plotsCreated, 
            plots_updated: plotsUpdated,
            deceased_created: deceasedCreated 
        });

    } catch (error) {
        console.error("Function error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});