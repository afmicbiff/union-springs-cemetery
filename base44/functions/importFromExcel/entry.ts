import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import * as XLSX from 'npm:xlsx@0.18.5';

const ADMIN_ROLES = ['admin', 'President', 'Vice President', 'Legal', 'Treasurer', 'Secretary', 'Caretaker', 'Administrator'];

/**
 * Parse a cell string like:
 *   "RESERVED       Caughman                #1014   U-8"
 *   "Caughman, Erma Fay Nealy                 #1010   T-5"
 *   "AVAILABLE                 #1028  U-6"
 *   "NOT USABLE                #963  M-5"
 *   "IRON CROSS                 #532  N-7"
 *   "MOW LANE                 #185   A-5"
 */
function parseCell(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const cell = raw.trim();
  if (!cell) return null;

  // Extract plot number: #1014 or #963 etc
  const numMatch = cell.match(/#\s*(\d+[A-Za-z\-]*)/);
  if (!numMatch) return null;
  const plotNumber = numMatch[1].trim();
  if (!plotNumber || !/^\d/.test(plotNumber)) return null;

  // Extract row-column: U-8, T-5, A-1, etc (letter-number at end)
  const rowColMatch = cell.match(/([A-Z])\s*-\s*(\d+)\s*$/i);
  const rowLetter = rowColMatch ? rowColMatch[1].toUpperCase() : '';
  const colNumber = rowColMatch ? rowColMatch[2] : '';

  // Determine status
  let status = 'Occupied';
  let firstName = '';
  let lastName = '';
  let familyName = '';
  const upper = cell.toUpperCase();

  if (upper.startsWith('AVAILABLE')) {
    status = 'Available';
  } else if (upper.startsWith('NOT US') || upper.startsWith('NOT USUA')) {
    status = 'Not Usable';
  } else if (upper.startsWith('UNKNOWN')) {
    status = 'Unknown';
  } else if (upper.startsWith('IRON CROSS')) {
    status = 'Unknown';
  } else if (upper.startsWith('MOW LANE')) {
    status = 'Not Usable';
  } else if (upper.startsWith('BRICK')) {
    status = 'Unknown';
  } else if (upper.startsWith('ROCK')) {
    status = 'Unknown';
  } else if (upper.startsWith('MARKER')) {
    status = 'Unknown';
  } else if (upper.startsWith('RESERVED')) {
    status = 'Reserved';
    const afterReserved = cell.replace(/^RESERVED\s+/i, '').replace(/#.*$/, '').trim();
    if (afterReserved) {
      const parts = afterReserved.split(',').map(s => s.trim());
      if (parts.length >= 2) {
        lastName = parts[0];
        firstName = parts.slice(1).join(' ').trim();
      } else {
        familyName = parts[0];
      }
    }
  } else {
    status = 'Occupied';
    const nameStr = cell.replace(/#.*$/, '').trim();
    const parts = nameStr.split(',').map(s => s.trim());
    if (parts.length >= 2) {
      lastName = parts[0];
      firstName = parts.slice(1).join(' ').trim();
    } else {
      lastName = parts[0];
    }
    familyName = lastName;
  }

  // Section by plot number range
  const pn = parseInt(plotNumber) || 0;
  let section = 'Section 2';
  if (pn >= 1 && pn <= 184) section = 'Section 1';
  else if (pn >= 1001 && pn <= 1200) section = 'Section 5';

  return {
    plot_number: String(pn),
    row_number: rowLetter ? `${rowLetter}-${colNumber}` : '',
    section,
    status,
    first_name: firstName,
    last_name: lastName,
    family_name: familyName,
    notes: upper.includes('ASHES') ? 'Ashes' : (upper.includes('MARKER ONLY') ? 'Marker Only' : (upper.includes('NOT BURIED HERE') ? 'Not Buried Here' : ''))
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !ADMIN_ROLES.includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { dry_run, file_url, rows: inputRows } = body;

    let allCellValues = [];

    if (file_url) {
      // Fetch and parse XLSX
      const resp = await fetch(file_url);
      const buf = await resp.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      
      // Get all cell values
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let r = range.s.r; r <= range.e.r; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell = ws[addr];
          if (cell && cell.v) {
            allCellValues.push(String(cell.v));
          }
        }
      }
    } else if (inputRows && Array.isArray(inputRows)) {
      for (const row of inputRows) {
        for (const val of Object.values(row)) {
          if (val && typeof val === 'string') allCellValues.push(val);
        }
      }
    } else {
      return Response.json({ error: 'Provide file_url or rows' }, { status: 400 });
    }

    // Parse all cell values
    const parsed = [];
    const seen = new Set();
    
    for (const val of allCellValues) {
      const record = parseCell(val);
      if (record && record.plot_number && !seen.has(record.plot_number)) {
        seen.add(record.plot_number);
        parsed.push(record);
      }
    }

    if (dry_run) {
      return Response.json({ 
        total_cells: allCellValues.length,
        total_parsed: parsed.length, 
        sample: parsed.slice(0, 30),
        statuses: parsed.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {}),
        sections: parsed.reduce((acc, p) => { acc[p.section || 'Unknown'] = (acc[p.section || 'Unknown'] || 0) + 1; return acc; }, {})
      });
    }

    // Fetch existing plots
    const existing = await base44.asServiceRole.entities.Plot.list('-created_date', 10000);
    const existingByNum = new Map();
    for (const p of existing) {
      if (p.plot_number) existingByNum.set(String(parseInt(String(p.plot_number).replace(/\D/g, '')) || 0), p);
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    const BATCH = 5;
    for (let i = 0; i < parsed.length; i += BATCH) {
      const batch = parsed.slice(i, i + BATCH);
      for (const record of batch) {
        try {
          const ex = existingByNum.get(record.plot_number);
          if (ex) {
            const updates = {};
            if (record.section && record.section !== ex.section) updates.section = record.section;
            if (record.row_number && record.row_number !== ex.row_number) updates.row_number = record.row_number;
            if (record.status && record.status !== ex.status) updates.status = record.status;
            if (record.first_name && record.first_name !== ex.first_name) updates.first_name = record.first_name;
            if (record.last_name && record.last_name !== ex.last_name) updates.last_name = record.last_name;
            if (record.family_name && record.family_name !== ex.family_name) updates.family_name = record.family_name;
            if (record.notes && !ex.notes) updates.notes = record.notes;

            if (Object.keys(updates).length > 0) {
              await base44.asServiceRole.entities.Plot.update(ex.id, updates);
              updated++;
            } else {
              skipped++;
            }
          } else {
            await base44.asServiceRole.entities.Plot.create(record);
            created++;
          }
        } catch (err) {
          errors.push({ plot: record.plot_number, error: err.message });
        }
      }
      // Small delay between batches to avoid rate limiting
      if (i + BATCH < parsed.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    return Response.json({
      success: true,
      total_parsed: parsed.length,
      created,
      updated,
      skipped,
      errors: errors.slice(0, 20),
      error_count: errors.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});