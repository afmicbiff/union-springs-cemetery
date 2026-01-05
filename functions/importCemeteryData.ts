import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Papa from 'npm:papaparse@5.4.1';
import { format, parse } from 'npm:date-fns@3.6.0';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // Admin-only access
        const user = await base44.auth.me().catch(() => null);
        if (!user) { return Response.json({ error: 'Unauthorized' }, { status: 401 }); }
        if (user.role !== 'admin') { return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 }); }
        // Resolve source file from request or environment
        let fileUrl = '';
        let body = null;
        try { body = await req.json(); } catch {}
        const inputFileUrl = body?.file_url;
        const inputFileUri = body?.file_uri;
        if (inputFileUrl) {
            fileUrl = inputFileUrl;
        } else if (inputFileUri) {
            const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: inputFileUri });
            fileUrl = signed?.signed_url || '';
        } else {
            const envUrl = Deno.env.get('CEMETERY_IMPORT_FILE_URL') || '';
            if (envUrl) fileUrl = envUrl;
        }
        if (!fileUrl) {
            return Response.json({ error: 'No file provided. Pass file_url or file_uri, or set CEMETERY_IMPORT_FILE_URL.' }, { status: 400 });
        }

        // 1. Fetch File
        const fileRes = await fetch(fileUrl);
        if (!fileRes.ok) throw new Error(`Failed to fetch file: ${fileRes.status}`);
        const fileText = await fileRes.text();

        // 2. Pre-process text (find header)
        const lines = fileText.split(/\r?\n/); // Handle both \n and \r\n
        const headerIndex = lines.findIndex(line => 
            line.toLowerCase().includes('grave') && 
            line.toLowerCase().includes('row') && 
            line.toLowerCase().includes('status')
        );
        
        if (headerIndex === -1) {
            throw new Error("Could not find header row (Grave, Row, Status) in file");
        }

        const cleanCsvContent = lines.slice(headerIndex).join('\n');

        // 3. Parse CSV/TSV
        const { data: records, errors } = Papa.parse(cleanCsvContent, {
            header: true,
            skipEmptyLines: true,
            delimiter: "", // Auto-detect delimiter (tab or comma)
            transformHeader: (h) => h.trim()
        });

        if (records.length === 0) {
            return Response.json({ success: false, message: "No records found after parsing." });
        }

        // 4. Fetch Existing Data for De-duplication
        // Fetching all might be heavy, but necessary for de-dup. 
        // We'll limit to 2000 recent ones or rely on loop checks if bulk fetch fails.
        // Assuming < 5000 total plots for now.
        const allPlots = await base44.entities.Plot.list({ limit: 5000 });
        const plotMap = new Map();
        allPlots.forEach(p => plotMap.set(`${p.row_number}-${p.plot_number}`, p));

        // 5. Prepare Batches
        const plotsToCreate = [];
        const plotsToUpdate = []; // We'll process these one-by-one later or skip
        const deceasedToCreate = [];
        
        // Helper: Date Formatter
        const formatDate = (dateStr) => {
            if (!dateStr || dateStr.trim() === '') return undefined;
            try {
                // Remove potential typos like 6/151938 -> 6/15/1938 if needed, but let's stick to standard parsing first
                // Fix missing slash year typo (e.g. 4/262011 -> 4/26/2011)
                let cleanStr = dateStr.trim();
                if (/^\d{1,2}\/\d{1,2}\d{4}$/.test(cleanStr)) {
                    // insert slash before last 4 digits
                    cleanStr = cleanStr.slice(0, -4) + '/' + cleanStr.slice(-4);
                }

                const parsed = parse(cleanStr, 'M/d/yyyy', new Date());
                if (isNaN(parsed.getTime())) return undefined;
                return format(parsed, 'yyyy-MM-dd');
            } catch (e) {
                return undefined;
            }
        };

        const newPlotIds = new Map(); // Key: "Row-Grave", Value: "temp_id" (not real ID, used for correlation if needed)
        // Note: For deceased creation, we need the REAL plot ID. 
        // So we must create plots FIRST, get their IDs, then create deceased.
        
        // Processing Loop
        for (const record of records) {
            const getVal = (key) => record[key]?.trim();
            const row = getVal('Row');
            const grave = getVal('Grave');
            
            if (!row || !grave) continue;

            const plotKey = `${row}-${grave}`;
            
            // Normalize Status
            const statusRaw = getVal('Status') || 'Available';
            let status = 'Available';
            const sLower = statusRaw.toLowerCase();
            if (sLower.includes('occupied')) status = 'Occupied';
            else if (sLower.includes('reserved')) status = 'Reserved';
            else if (sLower.includes('unavailable')) status = 'Unavailable';
            else if (sLower.includes('not usable')) status = 'Not Usable';

            // Plot Logic
            let plotId = null;
            if (plotMap.has(plotKey)) {
                const existingPlot = plotMap.get(plotKey);
                plotId = existingPlot.id;
                // Check if update needed
                if (existingPlot.status !== status) {
                    plotsToUpdate.push({ id: existingPlot.id, status });
                }
            } else {
                // Prepare for creation
                // We'll create them one-by-one in the next step to get IDs
                // Or use bulkCreate but we won't get IDs mapped back easily to "Row-Grave" without re-fetching.
                // Strategy: Add to a processing list.
            }

            // Deceased Logic Preparation
            const lastName = getVal('Last Name');
            if (status === 'Occupied' && lastName) {
                deceasedToCreate.push({
                    plotKey, // Temporary link
                    first_name: getVal('First Name') || "Unknown",
                    last_name: lastName,
                    family_name: getVal('Family Name'),
                    date_of_birth: formatDate(getVal('Birth')),
                    date_of_death: formatDate(getVal('Death')),
                    notes: getVal('Notes'),
                    plot_location: plotKey,
                    burial_type: "Casket",
                    veteran_status: (getVal('Notes') || "").toLowerCase().includes('vet')
                });
            }
        }

        // 6. Execution Phase - Plots
        
        // A. Create New Plots (One by one to get IDs? Or bulk then re-fetch?)
        // To be safe and simple: Create one by one if not too many. 
        // If many, bulk create then re-fetch all.
        // Let's re-fetch strategy.
        
        const plotsToCreatePayload = [];
        const recordsToProcess = records.filter(r => r['Row'] && r['Grave']);
        
        for (const record of recordsToProcess) {
            const row = record['Row']?.trim();
            const grave = record['Grave']?.trim();
            const plotKey = `${row}-${grave}`;
            if (!plotMap.has(plotKey)) {
                // Avoid duplicates in payload
                if (!plotsToCreatePayload.find(p => p.row_number === row && p.plot_number === grave)) {
                    let status = 'Available';
                    const sRaw = record['Status']?.toLowerCase() || '';
                    if (sRaw.includes('occupied')) status = 'Occupied';
                    else if (sRaw.includes('reserved')) status = 'Reserved';
                    else if (sRaw.includes('unavailable')) status = 'Unavailable';

                    plotsToCreatePayload.push({
                        section: row.split('-')[0] || "Main",
                        row_number: row,
                        plot_number: grave,
                        status: status,
                        notes: "Imported"
                    });
                }
            }
        }

        if (plotsToCreatePayload.length > 0) {
            // Bulk Create
            // Note: split into chunks of 100 to be safe
            for (let i = 0; i < plotsToCreatePayload.length; i += 100) {
                const chunk = plotsToCreatePayload.slice(i, i + 100);
                await base44.entities.Plot.bulkCreate(chunk);
            }
            
            // Re-fetch all plots to update map with new IDs
            const updatedAllPlots = await base44.entities.Plot.list({ limit: 5000 });
            updatedAllPlots.forEach(p => plotMap.set(`${p.row_number}-${p.plot_number}`, p));
        }

        // B. Update Existing Plots (Concurrent limit)
        // Use a concurrency limiter helper
        const updatePlot = async (p) => base44.entities.Plot.update(p.id, { status: p.status });
        // Process in chunks of 20
        for (let i = 0; i < plotsToUpdate.length; i += 20) {
            const chunk = plotsToUpdate.slice(i, i + 20);
            await Promise.all(chunk.map(updatePlot));
        }

        // 7. Execution Phase - Deceased
        // Filter out existing deceased to avoid duplicates
        // We'll list all deceased first
        const allDeceased = await base44.entities.Deceased.list({ limit: 5000 });
        const deceasedMap = new Set(allDeceased.map(d => `${d.last_name}|${d.plot_location}`));

        const finalDeceasedPayload = [];
        for (const d of deceasedToCreate) {
            const key = `${d.last_name}|${d.plot_location}`;
            if (!deceasedMap.has(key)) {
                // Ensure plot exists (it should now)
                // We don't strictly need the plot ID relation in the Deceased entity based on schema 
                // (it uses "plot_location" string), but if it did, we'd use plotMap.
                finalDeceasedPayload.push(d);
                deceasedMap.add(key); // Prevent double adding in same batch
            }
        }

        // Bulk Create Deceased
        for (let i = 0; i < finalDeceasedPayload.length; i += 100) {
            const chunk = finalDeceasedPayload.slice(i, i + 100);
            // Remove 'plotKey' helper prop before creating
            const cleanChunk = chunk.map(({ plotKey, ...rest }) => rest);
            await base44.entities.Deceased.bulkCreate(cleanChunk);
        }

        return Response.json({ 
            success: true, 
            message: "Import completed",
            plots_created: plotsToCreatePayload.length, 
            plots_updated: plotsToUpdate.length,
            deceased_created: finalDeceasedPayload.length 
        });

    } catch (error) {
        console.error("Function error:", error);
        return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
});