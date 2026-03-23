import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import * as XLSX from 'npm:xlsx@^0.18.5';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // 1. Authenticate
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Get file URL from payload
        const { file_url } = await req.json();
        if (!file_url) {
            return Response.json({ error: 'No file URL provided' }, { status: 400 });
        }

        // 3. Fetch the file
        const fileRes = await fetch(file_url);
        if (!fileRes.ok) {
            throw new Error(`Failed to fetch file: ${fileRes.statusText}`);
        }
        const arrayBuffer = await fileRes.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);

        // 4. Parse Workbook
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Get headers (first row) to map columns safely
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (jsonData.length === 0) {
            return Response.json({ message: 'Empty file' });
        }

        const headers = jsonData[0].map(h => (h || '').toString().toLowerCase().trim());
        const rows = jsonData.slice(1);

        // Helper to find value by possible header names
        const getValue = (row, possibleHeaders) => {
            const index = headers.findIndex(h => possibleHeaders.includes(h));
            if (index === -1) return null;
            return row[index];
        };

        let createdCount = 0;
        let updatedCount = 0;
        let errorCount = 0;

        // 5. Process Rows
        const plotsToUpsert = [];

        for (const row of rows) {
            if (!row || row.length === 0) continue;

            // Extract core fields
            const section = getValue(row, ['section', 'sec']) || '';
            const rowNum = getValue(row, ['row', 'row number', 'row_number']) || '';
            const plotNum = getValue(row, ['plot', 'plot number', 'plot_number', 'grave']) || '';

            if (!plotNum) {
                // Skip rows without at least a plot number
                continue;
            }

            const firstName = getValue(row, ['first name', 'first_name', 'firstname']) || '';
            const lastName = getValue(row, ['last name', 'last_name', 'lastname']) || '';
            const familyName = getValue(row, ['family name', 'family_name', 'familyname', 'owner']) || '';
            const statusRaw = getValue(row, ['status']) || 'Available';
            const notes = getValue(row, ['notes', 'comment', 'comments']) || '';
            const birthDate = getValue(row, ['birth date', 'dob', 'date of birth']);
            const deathDate = getValue(row, ['death date', 'dod', 'date of death']);

            // Normalize Status
            let status = 'Available';
            const s = (statusRaw || '').toString().toLowerCase();
            if (s.includes('occupied')) status = 'Occupied';
            else if (s.includes('reserved')) status = 'Reserved';
            else if (s.includes('unavailable') || s.includes('not usable')) status = 'Not Usable';
            else if (s.includes('veteran')) status = 'Veteran';
            else if (firstName || lastName) status = 'Occupied'; // Infer occupied if name present

            // Normalize Dates (Excel dates are sometimes numbers)
            const parseDate = (val) => {
                if (!val) return null;
                if (typeof val === 'number') {
                    // XLSX date number
                    const date = new Date(Math.round((val - 25569)*86400*1000));
                    return date.toISOString().split('T')[0];
                }
                // Try parsing string
                const d = new Date(val);
                if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
                return val; // Return raw string if fails parsing (might be MM/DD/YYYY)
            };

            const plotData = {
                section: section.toString(),
                row_number: rowNum.toString(),
                plot_number: plotNum.toString(),
                status,
                first_name: firstName.toString(),
                last_name: lastName.toString(),
                family_name: familyName.toString(),
                notes: notes.toString(),
                birth_date: parseDate(birthDate),
                death_date: parseDate(deathDate),
                // Default capacity
                capacity: 1,
                current_occupancy: (firstName || lastName) ? 1 : 0
            };

            plotsToUpsert.push(plotData);
        }

        // 6. Bulk Operations
        // We need to check existing plots to update them or create new ones.
        // To be efficient, we can fetch existing plots in batches or just search for them.
        // For simplicity and to avoid fetching 10000 plots every time, we'll try to match by section-row-plot.
        // However, list() is limited.
        // Let's assume we fetch all plots first to map IDs (if dataset is < 10k it's fine).
        
        const existingPlots = await base44.asServiceRole.entities.Plot.list(null, 10000);
        const plotMap = new Map();
        existingPlots.forEach(p => {
            const key = `${p.section || ''}-${p.row_number || ''}-${p.plot_number}`.toLowerCase();
            plotMap.set(key, p);
        });

        for (const p of plotsToUpsert) {
            try {
                const key = `${p.section || ''}-${p.row_number || ''}-${p.plot_number}`.toLowerCase();
                const existing = plotMap.get(key);

                if (existing) {
                    // Update
                    await base44.asServiceRole.entities.Plot.update(existing.id, p);
                    updatedCount++;
                } else {
                    // Create
                    await base44.asServiceRole.entities.Plot.create(p);
                    createdCount++;
                }
            } catch (err) {
                console.error("Error processing row:", p, err);
                errorCount++;
            }
        }

        return Response.json({ 
            success: true, 
            message: `Processed ${plotsToUpsert.length} rows. Created: ${createdCount}, Updated: ${updatedCount}, Errors: ${errorCount}`
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});