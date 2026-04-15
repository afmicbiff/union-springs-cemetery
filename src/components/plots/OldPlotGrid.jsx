import React, { memo, useMemo } from "react";
import OldPlotCell from "./OldPlotCell";

/**
 * Old Cemetery Plot Grid — flat 101 rows × 19 columns.
 * No row letters, no column headers, no section labels.
 * Plots are placed by their plot_number into a grid via row/col mapping.
 */

const ROWS = 101;
const COLS = 19;

export default memo(function OldPlotGrid({ plots, isAdmin, onHover, onEdit }) {
  // Build a lookup: plotNumber -> plot data
  const plotsByNumber = useMemo(() => {
    const map = new Map();
    for (const p of (plots || [])) {
      const num = parseInt(String(p.Grave || p.plot_number || '').replace(/\D/g, ''), 10);
      if (!Number.isFinite(num)) continue;
      const existing = map.get(num);
      if (!existing || new Date(p._updated || 0) > new Date(existing._updated || 0)) {
        map.set(num, p);
      }
    }
    return map;
  }, [plots]);

  // Map plot number to grid position {row, col}.
  // Plots 1-23: column 0, bottom-to-top (plot 1 at row 100, plot 23 at row 78).
  // Additional plot ranges will be mapped here as they are defined.
  function plotPosition(plotNum) {
    if (plotNum >= 1 && plotNum <= 23) {
      return { row: ROWS - plotNum, col: 0 }; // bottom-up in col 0
    }
    if (plotNum >= 24 && plotNum <= 46) {
      return { row: ROWS - (plotNum - 23), col: 1 }; // bottom-up in col 1
    }
    if (plotNum >= 47 && plotNum <= 69) {
      return { row: ROWS - (plotNum - 46), col: 2 }; // bottom-up in col 2
    }
    if (plotNum >= 70 && plotNum <= 92) {
      return { row: ROWS - (plotNum - 69), col: 3 }; // bottom-up in col 3
    }
    if (plotNum >= 93 && plotNum <= 115) {
      return { row: ROWS - (plotNum - 92), col: 4 }; // bottom-up in col 4
    }
    if (plotNum >= 116 && plotNum <= 138) {
      return { row: ROWS - (plotNum - 115), col: 5 }; // bottom-up in col 5
    }
    if (plotNum >= 139 && plotNum <= 161) {
      return { row: ROWS - (plotNum - 138), col: 6 }; // bottom-up in col 6
    }
    if (plotNum >= 162 && plotNum <= 184) {
      return { row: ROWS - (plotNum - 161), col: 7 }; // bottom-up in col 7
    }
    // 38 blank rows after plot 184 in col 7, then plots 943-963
    if (plotNum >= 943 && plotNum <= 963) {
      // plot 184 is at row 78, skip 38 blanks (rows 77-40), 943 starts at row 39
      return { row: 39 - (plotNum - 943), col: 7 }; // bottom-up in col 7
    }
    // Col 8: plots 185-207, bottom-up beside 162-184 in col 7
    if (plotNum >= 185 && plotNum <= 207) {
      return { row: ROWS - (plotNum - 184), col: 8 }; // bottom-up in col 8
    }
    // Col 8: 39 blank rows after plot 207, then plots 208-226 beside 943-963 in col 7
    // Plot 207 is at row 78. Skip 39 blanks (rows 77-39). 208 starts at row 38 going up.
    if (plotNum >= 208 && plotNum <= 226) {
      return { row: 38 - (plotNum - 208), col: 8 }; // 208 at row 38, 226 at row 20
    }
    // Col 10 (index 9): 228-268 bottom-up, 6 blanks, 269-302, 4 blanks, 1001-1014
    if (plotNum >= 228 && plotNum <= 268) {
      return { row: ROWS - (plotNum - 227), col: 9 }; // 228 at row 100, 268 at row 60
    }
    if (plotNum >= 269 && plotNum <= 302) {
      return { row: 52 - (plotNum - 269), col: 9 }; // 269 at row 52, 302 at row 19
    }
    if (plotNum >= 1001 && plotNum <= 1014) {
      return { row: 14 - (plotNum - 1001), col: 9 }; // 1001 at row 14, 1014 at row 1
    }
    // Col 11 (index 10): 303-348 bottom-up, 2 blanks, 349-382, 4 blanks, 1015-1028
    if (plotNum >= 303 && plotNum <= 348) {
      return { row: ROWS - (plotNum - 302), col: 10 }; // 303 at row 100, 348 at row 55
    }
    if (plotNum >= 349 && plotNum <= 382) {
      return { row: 52 - (plotNum - 349), col: 10 }; // 349 at row 52, 382 at row 19
    }
    if (plotNum >= 1015 && plotNum <= 1028) {
      return { row: 14 - (plotNum - 1015), col: 10 }; // 1015 at row 14, 1028 at row 1
    }
    // Col 12 (index 11): 383-464 bottom-up, 4 blanks, 1029-1042
    if (plotNum >= 383 && plotNum <= 464) {
      return { row: ROWS - (plotNum - 382), col: 11 }; // 383 at row 100, 464 at row 19
    }
    if (plotNum >= 1029 && plotNum <= 1042) {
      return { row: 14 - (plotNum - 1029), col: 11 }; // 1029 at row 14, 1042 at row 1
    }
    // Col 13 (index 12): 466-507 bottom-up, 1 unusable, 508-547 continue up, 3 blanks, 1043-1056
    if (plotNum >= 466 && plotNum <= 507) {
      return { row: ROWS - (plotNum - 465), col: 12 }; // 466 at row 100, 507 at row 59
    }
    if (plotNum >= 508 && plotNum <= 547) {
      return { row: 57 - (plotNum - 508), col: 12 }; // 508 at row 57, 547 at row 18
    }
    if (plotNum >= 1043 && plotNum <= 1056) {
      return { row: 14 - (plotNum - 1043), col: 12 }; // 1043 at row 14, 1056 at row 1
    }
    // Col 14 (index 13): 582-629 bottom-up, then 548-581
    if (plotNum >= 582 && plotNum <= 629) {
      return { row: ROWS - (plotNum - 581), col: 13 }; // 582 at row 100, 629 at row 53
    }
    if (plotNum >= 548 && plotNum <= 559) {
      return { row: 52 - (plotNum - 548), col: 13 }; // 548 at row 52, 559 at row 41
    }
    if (plotNum >= 560 && plotNum <= 581) {
      return { row: 39 - (plotNum - 560), col: 13 }; // 560 at row 39, 581 at row 18
    }
    if (plotNum >= 1057 && plotNum <= 1070) {
      return { row: 14 - (plotNum - 1057), col: 13 }; // 1057 at row 14, 1070 at row 1
    }
    // Col 15 (index 14): 667-709 bottom-up, then 665, then MOW at row 100
    if (plotNum >= 667 && plotNum <= 709) {
      return { row: 98 - (plotNum - 667), col: 14 }; // 667 at row 98, 709 at row 56
    }
    if (plotNum >= 710 && plotNum <= 711) {
      return { row: 54 - (plotNum - 710), col: 14 }; // 710 at row 54, 711 at row 53
    }
    if (plotNum >= 630 && plotNum <= 641) {
      return { row: 52 - (plotNum - 630), col: 14 }; // 630 at row 52, 641 at row 41
    }
    if (plotNum >= 642 && plotNum <= 664) {
      return { row: 39 - (plotNum - 642), col: 14 }; // 642 at row 39, 664 at row 17
    }
    if (plotNum >= 1071 && plotNum <= 1084) {
      return { row: 14 - (plotNum - 1071), col: 14 }; // 1071 at row 14, 1084 at row 1
    }
    if (plotNum === 665) {
      return { row: 99, col: 14 }; // 665 at row 99, MOW at row 100
    }
    // Col 16 (index 15): 743-786 bottom-up above MOW
    if (plotNum >= 743 && plotNum <= 786) {
      return { row: 99 - (plotNum - 743), col: 15 }; // 743 at row 99, 786 at row 56
    }
    // Col 16 continued: 787-788 at rows 54-53
    if (plotNum >= 787 && plotNum <= 788) {
      return { row: 54 - (plotNum - 787), col: 15 }; // 787 at row 54, 788 at row 53
    }
    // Col 16: 712-713 at rows 51-50
    if (plotNum >= 712 && plotNum <= 713) {
      return { row: 51 - (plotNum - 712), col: 15 }; // 712 at row 51, 713 at row 50
    }
    // Col 16: 714-716 at rows 48-46
    if (plotNum >= 714 && plotNum <= 716) {
      return { row: 48 - (plotNum - 714), col: 15 }; // 714 at row 48, 715 at 47, 716 at 46
    }
    // Col 16: 717-719 at rows 44-42
    if (plotNum >= 717 && plotNum <= 719) {
      return { row: 44 - (plotNum - 717), col: 15 }; // 717 at row 44, 718 at 43, 719 at 42
    }
    // Col 16: 1085-1100 at rows 15-0 (26 blanks above 719, then these plots)
    if (plotNum >= 1085 && plotNum <= 1100) {
      return { row: 15 - (plotNum - 1085), col: 15 }; // 1085 at row 15, 1100 at row 0
    }
    // Col 17 (index 16): 799-840 bottom-up above MOW
    if (plotNum >= 799 && plotNum <= 840) {
      return { row: 99 - (plotNum - 799), col: 16 }; // 799 at row 99, 840 at row 58
    }
    return null; // unmapped plots don't appear on grid yet
  }

  const grid = useMemo(() => {
    // Initialize empty grid
    const rows = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    // Place each plot by its number
    for (const [num, plot] of plotsByNumber) {
      const pos = plotPosition(num);
      if (pos && pos.row >= 0 && pos.row < ROWS && pos.col >= 0 && pos.col < COLS) {
        rows[pos.row][pos.col] = plot;
      }
    }
    // Insert virtual "Not Usable" plots (not in database)
    rows[58][12] = { Grave: 'N/U', Status: 'Not Usable', _virtual: true }; // between 507 and 508
    rows[40][13] = { Grave: 'N/U', Status: 'Not Usable', _virtual: true }; // between 559 and 560
    // Insert virtual "MOW" plots at bottom of columns 15-18 (not in database)
    rows[100][14] = { Grave: 'MOW', Status: 'Not Usable', _virtual: true };
    rows[100][15] = { Grave: 'MOW', Status: 'Not Usable', _virtual: true };
    rows[100][16] = { Grave: 'MOW', Status: 'Not Usable', _virtual: true };
    rows[100][17] = { Grave: 'MOW', Status: 'Not Usable', _virtual: true };
    // Virtual "Unknown" placeholder above 709 in col 15
    rows[55][14] = { Grave: 'N/U', Status: 'Not Usable', _virtual: true };
    // Virtual N/U above 641 in col 15
    rows[40][14] = { Grave: 'N/U', Status: 'Not Usable', _virtual: true };
    // 2 blank spacer plots between 664 and 1071 in col 15
    rows[16][14] = { Grave: '', Status: '', _virtual: true };
    rows[15][14] = { Grave: '', Status: '', _virtual: true };
    // Col 16 virtual plots
    rows[55][15] = { Grave: '?', Status: 'Unknown', _virtual: true }; // Unknown above 786
    rows[52][15] = { Grave: '', Status: '', _virtual: true }; // blank between 788 and 712
    rows[49][15] = { Grave: '', Status: '', _virtual: true }; // blank between 713 and 714
    rows[45][15] = { Grave: '', Status: '', _virtual: true }; // blank between 716 and 717
    return rows;
  }, [plotsByNumber]);

  if (!plots || plots.length === 0) {
    return <div className="text-gray-400 text-center py-12">No plot data loaded</div>;
  }

  return (
    <div className="inline-block select-none">
      <div className="border border-gray-300 rounded overflow-hidden bg-white">
        {grid.map((row, rIdx) => (
          <div key={rIdx} className="flex border-b border-gray-100 last:border-b-0">
            {row.map((item, cIdx) => (
              <OldPlotCell
                key={cIdx}
                item={item}
                isAdmin={isAdmin}
                onHover={onHover}
                onEdit={onEdit}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-4 flex-wrap">
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Legend:</span>
        {[
          ['bg-green-500', 'Available'],
          ['bg-yellow-400', 'Reserved'],
          ['bg-red-500', 'Occupied'],
          ['bg-blue-600', 'Veteran'],
          ['bg-gray-500', 'Unavailable'],
          ['bg-purple-500', 'Unknown'],
          ['bg-gray-400', 'Not Usable'],
        ].map(([bg, label]) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-full ${bg}`} />
            <span className="text-[10px] text-gray-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
});