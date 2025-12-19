import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const STATUS_OPTIONS = [
    'Available',
    'Reserved',
    'Occupied',
    'Veteran',
    'Unavailable',
    'Unknown',
    'Not Usable'
];

// Helper to normalize status
function normalizeStatus(status) {
    if (!status) return 'Unknown';
    const clean = status.trim();
    // Case insensitive match
    const match = STATUS_OPTIONS.find(s => s.toLowerCase() === clean.toLowerCase());
    if (match) return match;
    
    // Fuzzy mapping
    if (/vet/i.test(clean)) return 'Veteran';
    if (/res/i.test(clean)) return 'Reserved';
    if (/occ/i.test(clean)) return 'Occupied';
    if (/avail/i.test(clean)) return 'Available';
    
    return 'Unknown';
}

// Helper to normalize date
function normalizeDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null; // Invalid date
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized: Admins only' }, { status: 401 });
        }

        const { plots: rawPlots } = await req.json();
        
        if (!Array.isArray(rawPlots) || rawPlots.length === 0) {
            return Response.json({ error: 'No data provided' }, { status: 400 });
        }

        const report = {
            total: rawPlots.length,
            created: 0,
            updated: 0,
            skipped: 0,
            corrections: [],
            errors: []
        };

        // Fetch existing plots for comparison (optimize by fetching all needed sections if possible, 
        // but for now fetch all or use loop lookup. 2000 is small enough for list)
        // Note: In a real large app, we'd batch check. Here we list all for simplicity/speed of implementation.
        const existingPlots = await base44.entities.Plot.list(null, 5000);
        
        // Create lookup map: Section|Row|Number -> Plot
        const plotMap = new Map();
        existingPlots.forEach(p => {
            const key = `${p.section?.toLowerCase()}|${p.row_number?.toLowerCase()}|${p.plot_number?.toLowerCase()}`;
            plotMap.set(key, p);
        });

        for (const raw of rawPlots) {
            try {
                // 1. Identify Key Fields
                const section = raw.section || raw.Section || 'Unassigned';
                const rowNum = raw.row_number || raw.Row || 'Unknown';
                const plotNum = raw.plot_number || raw.plot_number || raw.Grave; // Support both keys

                if (!plotNum) {
                    report.errors.push(`Skipped row: Missing Plot Number (${JSON.stringify(raw)})`);
                    report.skipped++;
                    continue;
                }

                // 2. Validate & Correct Data
                const corrections = [];
                const newData = {
                    section: section,
                    row_number: rowNum,
                    plot_number: String(plotNum),
                    first_name: raw.first_name || raw['First Name'] || null,
                    last_name: raw.last_name || raw['Last Name'] || null,
                    family_name: raw.family_name || raw['Family Name'] || null,
                    notes: raw.notes || raw.Notes || null,
                };

                // Status Correction
                const rawStatus = raw.status || raw.Status;
                const cleanStatus = normalizeStatus(rawStatus);
                if (rawStatus && cleanStatus !== rawStatus) {
                    corrections.push(`Status corrected from '${rawStatus}' to '${cleanStatus}'`);
                }
                newData.status = cleanStatus;

                // Date Correction
                const rawBirth = raw.birth_date || raw.Birth;
                const cleanBirth = normalizeDate(rawBirth);
                if (rawBirth && !cleanBirth) {
                    corrections.push(`Invalid Birth Date format '${rawBirth}' ignored`);
                }
                newData.birth_date = cleanBirth;

                const rawDeath = raw.death_date || raw.Death;
                const cleanDeath = normalizeDate(rawDeath);
                if (rawDeath && !cleanDeath) {
                    corrections.push(`Invalid Death Date format '${rawDeath}' ignored`);
                }
                newData.death_date = cleanDeath;

                // 3. Match Existing
                const key = `${section.toLowerCase()}|${rowNum.toLowerCase()}|${String(plotNum).toLowerCase()}`;
                const existing = plotMap.get(key);

                if (existing) {
                    // Update Logic
                    // Compare fields to see if update needed
                    const changes = {};
                    let hasChanges = false;
                    
                    // Simple field comparison
                    for (const k of ['status', 'first_name', 'last_name', 'family_name', 'birth_date', 'death_date', 'notes']) {
                        if (String(existing[k] || '') !== String(newData[k] || '')) {
                            changes[k] = { from: existing[k], to: newData[k] };
                            hasChanges = true;
                        }
                    }

                    if (hasChanges) {
                        await base44.entities.Plot.update(existing.id, newData);
                        report.updated++;
                        
                        // Log Audit
                        await base44.entities.PlotAuditLog.create({
                            plot_id: existing.id,
                            changed_by: user.email,
                            change_summary: 'CSV Import Update' + (corrections.length ? ' (with Auto-Corrections)' : ''),
                            details: { changes, auto_corrections: corrections },
                            timestamp: new Date().toISOString()
                        });

                        if (corrections.length > 0) {
                            report.corrections.push({ plot: `${section}-${rowNum}-${plotNum}`, notes: corrections });
                        }
                    } else {
                        report.skipped++;
                    }

                } else {
                    // Create Logic
                    const newPlot = await base44.entities.Plot.create(newData);
                    report.created++;
                    
                    // Log Audit for Creation (especially if corrected)
                    await base44.entities.PlotAuditLog.create({
                        plot_id: newPlot.id,
                        changed_by: user.email,
                        change_summary: 'Created via CSV Import',
                        details: { initial_data: newData, auto_corrections: corrections },
                        timestamp: new Date().toISOString()
                    });

                    if (corrections.length > 0) {
                        report.corrections.push({ plot: `${section}-${rowNum}-${plotNum}`, notes: corrections });
                    }
                }

            } catch (err) {
                console.error("Row Error", err);
                report.errors.push(`Error processing row ${raw.plot_number || 'unknown'}: ${err.message}`);
            }
        }

        return Response.json(report);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});