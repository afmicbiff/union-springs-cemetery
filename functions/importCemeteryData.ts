import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const fileUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/310123335_UnionSpringsCemeterySpreadsheet_as_of_12_04_20251.pdf";

        // Use InvokeLLM to extract a sample of data (safer for timeouts)
        // We limit to 50 records to ensure the function finishes within the 60s limit.
        const extractRes = await base44.integrations.Core.InvokeLLM({
            prompt: `
                Extract data from this cemetery registry PDF. 
                Focus on the table containing: Row, Grave, Status, Last Name, First Name, Birth Date, Death Date, Notes.
                
                IMPORTANT: Extract as many records as possible (up to 150) from the table.
                
                Return a JSON object with a "records" array.
                Each record should have: "row", "grave", "status", "first_name", "last_name", "birth_date", "death_date", "notes".
                Normalize status to one of: "Available", "Occupied", "Reserved", "Unavailable".
                
                If the document is very large, prioritizing recent or top rows is acceptable.
            `,
            file_urls: [fileUrl],
            response_json_schema: {
                "type": "object",
                "properties": {
                    "records": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "row": { "type": "string" },
                                "grave": { "type": "string" },
                                "status": { "type": "string" },
                                "first_name": { "type": "string" },
                                "last_name": { "type": "string" },
                                "birth_date": { "type": "string" },
                                "death_date": { "type": "string" },
                                "notes": { "type": "string" }
                            }
                        }
                    }
                }
            }
        });

        if (!extractRes.records) {
             // Fallback if LLM returns raw string or error
             console.error("LLM Extraction failed or returned invalid format:", extractRes);
             return Response.json({ error: "Could not extract records from PDF. Try converting to CSV." }, { status: 500 });
        }

        const records = extractRes.records;
        let plotsCreated = 0;
        let deceasedCreated = 0;

        for (const record of records) {
            const row = record.row || "Unknown";
            const grave = record.grave || "Unknown";
            const plotLocation = `${row}-${grave}`;
            
            // 1. Create/Update Plot
            // Check if plot exists
            const existingPlots = await base44.entities.Plot.filter({ row_number: row, plot_number: grave }, 1);
            let plotId;

            if (existingPlots.length > 0) {
                // Update status if needed, but don't overwrite if already occupied
                if (existingPlots[0].status === 'Available' && record.status !== 'Available') {
                     await base44.entities.Plot.update(existingPlots[0].id, { status: record.status });
                }
                plotId = existingPlots[0].id;
            } else {
                const newPlot = await base44.entities.Plot.create({
                    section: row.split('-')[0] || "Main",
                    row_number: row,
                    plot_number: grave,
                    status: record.status || "Available",
                    notes: "Imported from Legacy PDF"
                });
                plotId = newPlot.id;
                plotsCreated++;
            }

            // 2. Create Deceased Record if Occupied and has name
            if (record.status === 'Occupied' && record.last_name) {
                // Check for duplicates
                const existingDeceased = await base44.entities.Deceased.filter({
                    last_name: record.last_name,
                    plot_location: plotLocation
                }, 1);

                if (existingDeceased.length === 0) {
                    await base44.entities.Deceased.create({
                        first_name: record.first_name || "Unknown",
                        last_name: record.last_name,
                        date_of_birth: record.birth_date, // LLM usually formats this well, but validation could be added
                        date_of_death: record.death_date,
                        plot_location: plotLocation,
                        notes: record.notes,
                        burial_type: "Casket" // Default
                    });
                    deceasedCreated++;
                }
            }
        }

        return Response.json({ 
            success: true, 
            message: "Sample import successful",
            plots_processed: records.length, 
            plots_created: plotsCreated, 
            deceased_created: deceasedCreated 
        });

    } catch (error) {
        console.error("Function error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});