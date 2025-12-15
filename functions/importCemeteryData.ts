import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // 1. Extract Data
        const fileUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/310123335_UnionSpringsCemeterySpreadsheet_as_of_12_04_20251.pdf";
        
        // Use InvokeLLM for potentially better handling of PDF tables
        const extractRes = await base44.integrations.Core.InvokeLLM({
            prompt: "Extract the tabular data from the cemetery records file. Return a JSON object with a 'records' key containing an array of objects. Fields: Grave, Row, Status, Last Name, First Name, Birth, Death, Family Name, Notes. \n\nIMPORTANT: Return ALL rows found in the file.",
            file_urls: [fileUrl],
            response_json_schema: {
                "type": "object",
                "properties": {
                    "records": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "Grave": {"type": "string"},
                                "Row": {"type": "string"},
                                "Status": {"type": "string"},
                                "Last Name": {"type": "string"},
                                "First Name": {"type": "string"},
                                "Birth": {"type": "string"},
                                "Death": {"type": "string"},
                                "Family Name": {"type": "string"},
                                "Notes": {"type": "string"}
                            }
                        }
                    }
                }
            }
        });

        if (!extractRes.records) {
            return Response.json({ error: "Extraction failed", details: extractRes }, { status: 500 });
        }

        const records = extractRes.records;
        let plotsCreated = 0;
        let deceasedCreated = 0;

        // 2. Process Records
        for (const record of records) {
            const row = record["Row"] || "";
            const grave = record["Grave"] || "";
            const statusRaw = record["Status"] || "Available";
            const plotLocation = `${row}-${grave}`;

            // Map Status
            let status = "Available";
            if (statusRaw.toLowerCase().includes("occupied")) status = "Occupied";
            else if (statusRaw.toLowerCase().includes("reserved")) status = "Reserved";
            else if (statusRaw.toLowerCase().includes("not usable")) status = "Not Usable";
            else if (statusRaw.toLowerCase().includes("unavailable")) status = "Unavailable";

            // Create/Update Plot
            // We use 'row' as row_number and 'grave' as plot_number. 
            // Ideally we'd check if it exists, but for bulk import we might just create.
            // Check existence logic is omitted for speed, we assume clean slate or just append. 
            // To be safer, we can filter.
            const existingPlots = await base44.entities.Plot.filter({ row_number: row, plot_number: grave }, 1);
            let plotId;

            if (existingPlots.length > 0) {
                 await base44.entities.Plot.update(existingPlots[0].id, { status });
                 plotId = existingPlots[0].id;
            } else {
                 const newPlot = await base44.entities.Plot.create({
                    section: row.split('-')[0] || "Main", // Infer section from Row (e.g. A-1 -> A)
                    row_number: row,
                    plot_number: grave,
                    status: status
                });
                plotId = newPlot.id;
                plotsCreated++;
            }

            // Create Deceased if Occupied
            if (status === "Occupied" && record["Last Name"]) {
                const firstName = record["First Name"] || "Unknown";
                const lastName = record["Last Name"];
                
                // Date Parsing helper
                const parseDate = (dateStr) => {
                    if (!dateStr) return null;
                    try {
                        const d = new Date(dateStr);
                        if (isNaN(d.getTime())) return null;
                        return d.toISOString().split('T')[0];
                    } catch { return null; }
                };

                const birthDate = parseDate(record["Birth"]);
                const deathDate = parseDate(record["Death"]);
                const isVet = (record["Notes"] || "").toLowerCase().includes("vet");

                // Check if deceased exists to avoid dupes
                const existingDeceased = await base44.entities.Deceased.filter({ 
                    first_name: firstName, 
                    last_name: lastName,
                    plot_location: plotLocation
                }, 1);

                if (existingDeceased.length === 0) {
                    await base44.entities.Deceased.create({
                        first_name: firstName,
                        last_name: lastName,
                        family_name: record["Family Name"],
                        date_of_birth: birthDate,
                        date_of_death: deathDate,
                        notes: record["Notes"],
                        plot_location: plotLocation,
                        veteran_status: isVet
                    });
                    deceasedCreated++;
                }
            }
        }

        return Response.json({ 
            success: true, 
            plots_processed: records.length, 
            plots_created: plotsCreated, 
            deceased_created: deceasedCreated 
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});