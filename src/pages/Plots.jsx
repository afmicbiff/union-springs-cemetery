import React, { useState, useEffect, useMemo, useDeferredValue, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from "@/api/base44Client";
import { filterEntity, clearEntityCache } from "@/components/gov/dataClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Info, Map as MapIcon, FileText, Pencil, Save, X, MoreHorizontal, Database, Loader2, ChevronDown, ChevronRight, ArrowLeft, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PlotEditDialog from "@/components/plots/PlotEditDialog";
import PlotFilters from "@/components/plots/PlotFilters";
import { usePlotsMapData } from "@/components/plots/usePlotsMapData";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import debounce from 'lodash/debounce';

// --- CONFIGURATION ---

const STATUS_COLORS = {
  'Available': 'bg-green-500 border-green-700',
  'Reserved': 'bg-yellow-400 border-yellow-600',
  'Occupied': 'bg-red-500 border-red-700',
  'Veteran': 'bg-blue-600 border-blue-800',
  'Unavailable': 'bg-gray-600 border-gray-800',
  'Unknown': 'bg-purple-500 border-purple-700',
  'Default': 'bg-gray-300 border-gray-500'
};

// Distinct colors for different Sections
const SECTION_PALETTES = [
  'bg-blue-100 border-blue-300 text-blue-900',         // Section 1 / Row D
  'bg-blue-100 border-blue-300 text-blue-900',         // Section 2
  'bg-rose-100 border-rose-300 text-rose-900',      // Section 3
  'bg-amber-100 border-amber-300 text-amber-900',   // Section 4
  'bg-cyan-100 border-cyan-300 text-cyan-900',      // Section 5
  'bg-lime-100 border-lime-300 text-lime-900',
];

const INITIAL_CSV = `Grave,Row,Status,Last Name,First Name,Birth,Death,Family Name,Notes,Find A Grave,Section
1,A-1,Available,,,,,,,,Section 1
2,A-1,Occupied,Boutwell,Paul Marshall,5/25/1901,9/3/1982,Boutwell,,Find a Grave,Section 1
3,A-1,Occupied,Boutwell,Clara Martin,11/15/1907,1/31/1995,Boutwell,,Find a Grave,Section 1
4,B-1,Reserved,,,,,"Slack, Hoyt",,,Section 1
5,B-1,Reserved,,,,,"Slack, Hoyt",,,Section 1
6,B-1,Reserved,,,,,"Slack, Hoyt",,,Section 1
7,B-1,Reserved,,,,,"Slack, Hoyt",,,Section 1
8,B-1,Occupied,Slack,Zachary Neal,11/11/1984,4/9/1999,Slack,,Find a Grave,Section 1
9,C-1,Reserved,Slack,Tom L.,7/6/1941,,Slack,,,Section 1
10,C-1,Occupied,Slack,Pamela D.,12/29/1940,4/2/1999,Slack,,Find a Grave,Section 1
11,C-1,Occupied,Slack,Hoyt,12/27/1907,1/30/1998,Slack,,Find a Grave,Section 1
12,C-1,Reserved,Slack,Barbara,,,"Slack, Hoyt",,,Section 1
13,C-1,Available,,,,,,,,Section 1
14,D-1,Occupied,Roach,Pauline Dollar,,,,,,,Row D
15,D-1,Occupied,Roach,Pauline Dollar,,,,,,,Row D
16,D-1,Occupied,Roach,Pauline Dollar,,,,,,,Row D
17,D-1,Occupied,Roach,Pauline Dollar,,,,,,,Row D
18,D-1,Occupied,Roach,Magee,,,,,,,Row D
19,D-1,Occupied,Dollar,Pauline,,,,,,,Row D
20,D-1,Occupied,Mills,Ronald Edward,,,,,,,Row D
21,D-1,Occupied,Dollar,Pauline,,,,,,,Row D
22,D-1,Occupied,Rives,"Francis C. ""Jack""",,,,,,,Row D
23,D-1,Occupied,Rives,Treable,,,,,,,Row D
`;

// --- HELPERS ---

const getUnplacedForSection = (sectionKey, plots) => {
    const toNum = (g) => {
        const n = parseInt(String(g || '').replace(/\D/g, ''));
        return Number.isFinite(n) && n > 0 ? n : null;
    };
    const included = new Set();
    const addRange = (start, end) => { for (let i = start; i <= end; i++) included.add(i); };

    switch (String(sectionKey)) {
        case '3':
            [
                [251,268],[326,348],[406,430],[489,512],[605,633],[688,711],[765,788],[821,843],[898,930]
            ].forEach(([s,e]) => addRange(s,e));
            break;
        case '4':
            [
                [208,223],[269,298],[349,378],[431,461],[513,542],[546,576],[630,658],[712,719],
                [720,737],[789,795],[844,870],[923,945]
            ].forEach(([s,e]) => addRange(s,e));
            break;
        case '5':
            [
                [224,236],[299,302],[1001,1014],[379,382],[1015,1026],[462,465],[1029,1042],
                [543,546],[1043,1056],[577,580],[1057,1070],[659,664],[1071,1084],[1085,1102],
                [738,738],[739,742],[871,874]
            ].forEach(([s,e]) => addRange(s,e));
            break;
        default:
            plots.forEach(p => { const n = toNum(p.Grave); if (n) included.add(n); });
    }

    const unplaced = (plots || []).filter(p => {
        const n = toNum(p.Grave);
        if (!n) return true;
        return !included.has(n);
    });
    return { included, unplaced, placedCount: (plots || []).length - unplaced.length };
};

// --- COMPONENTS ---

const Tooltip = React.memo(({ data, position, visible }) => {
  if (!visible || !data) return null;

  const isVeteran = data.Status === 'Veteran' || (data.Notes && data.Notes.toLowerCase().includes('vet'));
  const isOccupied = data.Status === 'Occupied' || isVeteran;
  
  const statusKey = isVeteran ? 'Veteran' : (STATUS_COLORS[data.Status] ? data.Status : 'Default');
  const statusColor = STATUS_COLORS[statusKey];
  const bgClass = statusColor.split(' ').find(c => c.startsWith('bg-'));

  return (
    <div 
      className="fixed z-50 bg-white p-4 rounded-lg shadow-2xl border border-gray-200 w-72 text-sm pointer-events-none transition-all duration-200 ease-out transform translate-y-2"
      style={{ 
        left: `${position.x + 15}px`, 
        top: `${position.y + 15}px`,
        opacity: visible ? 1 : 0,
      }}
    >
      <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
        <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${bgClass}`}></span>
            <span className="font-bold text-gray-800 text-lg">Plot {data.Grave}</span>
        </div>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Row {data.Row}</span>
      </div>
      
      {isOccupied ? (
        <div className="space-y-2">
          <div className="bg-gray-50 p-2 rounded border border-gray-100">
            <p className="text-xs text-gray-400 uppercase font-bold">Occupant</p>
            <p className="font-bold text-gray-800 text-base">{data['First Name']} {data['Last Name']}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
                <p className="text-xs text-gray-400">Born</p>
                <p className="font-medium text-gray-700">{data.Birth || 'Unknown'}</p>
            </div>
            <div>
                <p className="text-xs text-gray-400">Died</p>
                <p className="font-medium text-gray-700">{data.Death || 'Unknown'}</p>
            </div>
          </div>
          {(data.Notes || data['Family Name']) && (
             <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400">Details</p>
                {data['Family Name'] && <p className="text-xs text-gray-600">Family: {data['Family Name']}</p>}
                {data.Notes && <p className="text-xs text-gray-600 italic">{data.Notes}</p>}
             </div>
          )}
        </div>
      ) : (
        <div className="text-gray-500 py-2 italic text-center bg-gray-50 rounded">
          {data.Status === 'Reserved' 
            ? `Reserved for: ${data['Family Name'] || data.Notes || 'Unknown Family'}` 
            : `Status: ${data.Status}`}
        </div>
      )}
    </div>
  );
});

const GravePlot = React.memo(({ data, baseColorClass, onHover, onEdit }) => {
  const [isHovered, setIsHovered] = useState(false);

  if (data.isSpacer) {
      return (
          <div className="w-16 h-8 m-0.5 border border-dashed border-gray-300 bg-gray-50/50 rounded-[1px]"></div>
      );
  }

  const params = new URLSearchParams(window.location.search);
  const targetSectionRaw = (params.get('section') || '').replace(/Section\s*/i, '').trim();
  const targetPlotNum = parseInt(params.get('plot') || '', 10);
  const plotNum = parseInt(String(data.Grave).replace(/\D/g, '')) || null;
  const sectionNorm = String(data.Section || '').replace(/Section\s*/i, '').trim();
  const isSelected = Number.isFinite(targetPlotNum) && Number.isFinite(plotNum) && plotNum === targetPlotNum;

  let displayStatus = data.Status;
  if (data.Notes && data.Notes.toLowerCase().includes('vet') && data.Status === 'Occupied') {
      displayStatus = 'Veteran';
  }

  const statusColorFull = STATUS_COLORS[displayStatus] || STATUS_COLORS.Default;
  const statusBg = statusColorFull.split(' ').find(cls => cls.startsWith('bg-')) || 'bg-gray-400';

  const baseClass = `${baseColorClass} opacity-90 hover:opacity-100 transition-transform`;
  const hoverClass = `${baseColorClass.replace('100', '200')} scale-110 z-20 shadow-xl ring-2 ring-blue-400 ring-opacity-75`;
  const selectedClass = 'bg-green-300 border-green-700 ring-8 ring-green-500 ring-offset-2 ring-offset-white scale-110 z-30 shadow-2xl animate-pulse';
  const activeClass = isSelected ? selectedClass : (isHovered ? hoverClass : baseClass);

  return (
  <div
      id={plotNum != null ? `plot-${sectionNorm}-${plotNum}` : undefined}
      onClick={(e) => {
      e.stopPropagation();
      if (onEdit && data && data._entity === 'Plot') onEdit(data);
      }}
      onMouseEnter={(e) => {
      setIsHovered(true);
      onHover(e, data);
      }}
      onMouseLeave={() => {
      setIsHovered(false);
      onHover(null, null);
      }}
      className={`
      relative transition-all duration-200 ease-in-out cursor-pointer
      border rounded-[1px] 
      flex flex-row items-center justify-between px-1.5
      w-16 h-8 m-0.5 text-[8px] overflow-hidden select-none font-bold shadow-sm
      ${activeClass}
      `}
      title={`Row: ${data.Row}, Grave: ${data.Grave}`}
  >
      <span className="text-[10px] leading-none font-black text-gray-800">{data.Grave}</span>
      <span className="text-[8px] leading-none text-gray-600 font-mono tracking-tighter truncate max-w-full">
      {data.Row}
      </span>
      <div className={`w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm ${statusBg}`}></div>
  </div>
  );
});

const LegendItem = React.memo(({ label, colorClass }) => {
    const bgClass = colorClass.split(' ').find(c => c.startsWith('bg-'));
    return (
        <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm whitespace-nowrap">
            <div className={`w-4 h-4 rounded-full border border-gray-300 ${bgClass}`}></div>
            <span className="text-xs font-semibold text-gray-600">{label}</span>
        </div>
    );
});

const PlotTableRow = React.memo(({ 
    row, 
    editingId, 
    inlineEditData, 
    STATUS_COLORS, 
    handleInlineChange, 
    handleInlineSave, 
    handleInlineCancel, 
    handleInlineEditStart, 
    handleEditClick,
    isAdmin
}) => {
    const isEditing = editingId === row._id;
    return (
        <tr className="hover:bg-gray-50 transition-colors">
            <td className="px-4 py-4 font-bold text-gray-700">
                {isEditing ? <Input value={inlineEditData.Section || ''} onChange={e => handleInlineChange('Section', e.target.value)} className="h-8 w-24" /> : row.Section}
            </td>
            <td className="px-4 py-4 font-mono text-gray-900">
                {isEditing ? <Input value={inlineEditData.Grave || ''} onChange={e => handleInlineChange('Grave', e.target.value)} className="h-8 w-16" /> : row.Grave}
            </td>
            <td className="px-4 py-4 text-gray-500">
                {isEditing ? <Input value={inlineEditData.Row || ''} onChange={e => handleInlineChange('Row', e.target.value)} className="h-8 w-16" /> : row.Row}
            </td>
            <td className="px-4 py-4">
                {isEditing ? (
                    <select 
                        value={inlineEditData.Status} 
                        onChange={e => handleInlineChange('Status', e.target.value)}
                        className="h-8 text-sm border rounded px-2"
                    >
                        {Object.keys(STATUS_COLORS).filter(k => k !== 'Default').map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                ) : (
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[row.Status]?.split(' ').filter(c=>c.startsWith('bg') || c.startsWith('text')).join(' ')} bg-opacity-10`}>
                        {row.Status}
                    </span>
                )}
            </td>
            <td className="px-4 py-4 font-medium text-gray-900">
                {isEditing ? <Input value={inlineEditData['Last Name'] || ''} onChange={e => handleInlineChange('Last Name', e.target.value)} className="h-8 w-32" /> : row['Last Name']}
            </td>
            <td className="px-4 py-4 text-gray-500">
                {isEditing ? <Input value={inlineEditData['First Name'] || ''} onChange={e => handleInlineChange('First Name', e.target.value)} className="h-8 w-32" /> : row['First Name']}
            </td>
            <td className="px-4 py-4 text-gray-500 text-xs">
                {isEditing ? (
                    <div className="flex flex-col gap-1">
                        <Input value={inlineEditData.Birth || ''} onChange={e => handleInlineChange('Birth', e.target.value)} placeholder="Birth" className="h-7 w-24 text-xs" />
                        <Input value={inlineEditData.Death || ''} onChange={e => handleInlineChange('Death', e.target.value)} placeholder="Death" className="h-7 w-24 text-xs" />
                    </div>
                ) : (
                    row.Birth && row.Death ? `${row.Birth} - ${row.Death}` : '-'
                )}
            </td>
            <td className="px-4 py-4">
                {isEditing ? (
                    <div className="flex gap-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={handleInlineSave}>
                            <Save className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleInlineCancel}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    (isAdmin && row._entity === 'Plot') && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleInlineEditStart(row)}>
                                <Pencil className="mr-2 h-4 w-4" /> Quick Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditClick(row)}>
                                <FileText className="mr-2 h-4 w-4" /> Full Details
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    )
                )}
            </td>
        </tr>
    );
});

const SectionRenderer = React.memo(({ 
    sectionKey, 
    plots, 
    palette, 
    isCollapsed, 
    onToggle, 
    isExpanded, 
    onExpand, 
    isAdmin, 
    onEdit, 
    onHover
}) => {
    const [bgColor, borderColor, textColor] = palette.split(' ');

    // Hide Section 2 from map view
    if (sectionKey === '2') return null;

    return (
        <div id={`section-${sectionKey}`} className="relative">
            <div 
                className="flex items-end mb-3 ml-1 cursor-pointer group select-none"
                onClick={() => onToggle(sectionKey)}
            >
                <div className={`mr-2 mb-1 p-1 rounded-full transition-colors ${isCollapsed ? 'bg-gray-200 text-gray-600' : `bg-white text-${textColor.split('-')[1]}-600 shadow-sm`}`}>
                    {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                </div>
                <h2 className={`text-2xl font-bold ${textColor.replace('text', 'text-opacity-80 text')}`}>
                    {sectionKey === 'Unassigned' ? 'Unassigned Plots' : `Section ${sectionKey.replace('Section', '').trim()}`}
                </h2>
                <div className="ml-4 h-px flex-grow bg-gray-200 mb-2 group-hover:bg-gray-300 transition-colors"></div>
                <span className="mb-1 text-xs font-mono text-gray-400 ml-2">
                    {plots.length} Plots
                </span>
                {(['3','4','5'].includes(sectionKey)) && (() => { const c = getUnplacedForSection(sectionKey, plots); return (<span className="mb-1 text-xs text-gray-400 ml-2">• {c.placedCount} placed, {c.unplaced.length} fallback</span>); })()}
            </div>
            
            {!isCollapsed && (
                <div className={`
                    rounded-xl border-2 border-dashed p-6 transition-colors duration-500
                    ${borderColor} ${bgColor} bg-opacity-30
                    overflow-x-auto
                `}>
                    {sectionKey === '1' ? (
                        <div className="flex gap-4 justify-center">
                            {(() => {
                                const nums = plots
                                  .map(p => parseInt(String(p.Grave).replace(/\D/g, '')) || 0)
                                  .filter(n => n > 0);
                                const maxNum = nums.length ? Math.max(...nums) : 0;
                                const cols = 8;
                                const perCol = Math.ceil(maxNum / cols) || 0;
                                const ranges = Array.from({ length: cols }, (_, i) => ({
                                  start: i * perCol + 1,
                                  end: Math.min((i + 1) * perCol, maxNum)
                                }));

                                return ranges.map((range, idx) => {
                                  const colPlots = plots.filter(p => {
                                    const num = parseInt(String(p.Grave).replace(/\D/g, '')) || 0;
                                    return num >= range.start && num <= range.end;
                                  }).sort((a, b) => {
                                    const numA = parseInt(String(a.Grave).replace(/\D/g, '')) || 0;
                                    const numB = parseInt(String(b.Grave).replace(/\D/g, '')) || 0;
                                    return numB - numA;
                                  });

                                  return (
                                    <div key={idx} className="flex flex-col gap-1 justify-end">
                                      {colPlots.map((plot) => (
                                        <GravePlot
                                          key={`${plot.Section}-${plot.Row}-${plot.Grave}`}
                                          data={plot}
                                          baseColorClass={`${bgColor.replace('100', '100')} ${borderColor}`}
                                          onHover={onHover}
                                          onEdit={isAdmin ? onEdit : undefined}
                                        />
                                      ))}
                                    </div>
                                  );
                                });
                            })()}
                        </div>
                    ) : sectionKey === '2' ? (
                        <div className="flex justify-center overflow-x-auto">
                             <div className="grid grid-flow-col gap-3" style={{ gridTemplateRows: 'repeat(24, minmax(0, 1fr))', gridTemplateColumns: 'repeat(10, max-content)', gridAutoColumns: 'max-content' }}>
                                {(() => {
                                    const byNum = (g) => parseInt(String(g || '').replace(/\D/g, '')) || 0;
                                    const ordered = [...plots].sort((a, b) => {
                                      const na = byNum(a.Grave), nb = byNum(b.Grave);
                                      if (na !== nb) return na - nb;
                                      return String(a.Grave).localeCompare(String(b.Grave));
                                    });
                                    // Ensure 228-A renders directly after 228
                                    const idx228A = ordered.findIndex(p => String(p.Grave).trim() === '228-A');
                                    if (idx228A !== -1) {
                                      const p228A = ordered.splice(idx228A, 1)[0];
                                      const idx228 = ordered.findIndex(p => byNum(p.Grave) === 228);
                                      const insertAt = idx228 !== -1 ? idx228 + 1 : ordered.length;
                                      ordered.splice(insertAt, 0, p228A);
                                    }
                                    const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
                                    // Remove plot 185 from display
                                    const orderedFiltered = ordered.filter(p => byNum(p.Grave) !== 185);
                                    let columns = chunk(orderedFiltered, 24).slice(0, 10);

                                    const getNum = (g) => parseInt(String(g || '').replace(/\D/g, '')) || null;
                                    const findPos = (cols, num) => {
                                      for (let c = 0; c < cols.length; c++) {
                                        const r = cols[c].findIndex(p => getNum(p.Grave) === num);
                                        if (r !== -1) return { c, r };
                                      }
                                      return null;
                                    };
                                    const insertIntoColumn = (cols, c, r, item) => {
                                      cols[c].splice(r, 0, item);
                                      // Maintain max 24 rows per column: spill last item to next column
                                      for (let i = c; i < cols.length; i++) {
                                        if (cols[i].length <= 24) break;
                                        const spill = cols[i].pop();
                                        if (i + 1 < cols.length) {
                                          cols[i + 1].unshift(spill);
                                        }
                                      }
                                    };
                                    const moveUnder = (cols, movingNum, targetNum) => {
                                      const posT = findPos(cols, targetNum);
                                      const posM = findPos(cols, movingNum);
                                      if (!posT || !posM) return;
                                      const item = cols[posM.c].splice(posM.r, 1)[0];
                                      // Adjust indices if removal was from the same column and above target
                                      const targetPos = findPos(cols, targetNum) || posT;
                                      const insertRow = Math.max(targetPos.r - 1, 0); // -1 because columns will be reversed on render (visual "under")
                                      insertIntoColumn(cols, targetPos.c, insertRow, item);
                                    };

                                    // Reorder columns: move the whole column containing 186 next to the column containing 228
                                    const pos186 = findPos(columns, 186);
                                    const pos228 = findPos(columns, 228);
                                    if (pos186 && pos228 && pos186.c !== pos228.c) {
                                      const movedCol = columns.splice(pos186.c, 1)[0];
                                      const newPos228 = findPos(columns, 228) || pos228;
                                      const insertAt = Math.min((newPos228.c ?? 0) + 1, columns.length);
                                      columns.splice(insertAt, 0, movedCol);
                                    }

                                    const pairs = [
                                      [228, 229],
                                      [304, 305],
                                      [470, 471],
                                      [587, 588],
                                      [671, 872],
                                      [750, 751],
                                      [803, 804],
                                    ];
                                    pairs.forEach(([m, t]) => moveUnder(columns, m, t));

                                    // Shift the row containing plot 303 two columns to the right and leave blanks under plot 304
                                    const pos303 = findPos(columns, 303);
                                    if (pos303) {
                                      const r = pos303.r;
                                      const makeSpacer = (i) => ({ isSpacer: true, _id: `sp-303-${r}-${i}-${Math.random().toString(36).slice(2,7)}` });
                                      const rowCells = columns.map(col => col[r]);
                                      const newRow = Array(columns.length).fill(null).map((_, i) => makeSpacer(i));
                                      for (let c = 0; c < columns.length; c++) {
                                        const toC = c + 2;
                                        if (toC < columns.length) newRow[toC] = rowCells[c];
                                      }
                                      for (let c = 0; c < columns.length; c++) {
                                        columns[c][r] = newRow[c];
                                      }
                                    }

                                    const renderData = columns.flatMap(col => [...col].reverse()).filter(Boolean);

                                    return renderData.map((plot, idx) => (
                                        <GravePlot 
                                            key={plot._id || `s2-${idx}`} 
                                            data={plot} 
                                            baseColorClass={`${bgColor.replace('100', '100')} ${borderColor}`}
                                            onHover={onHover}
                                            onEdit={isAdmin ? onEdit : undefined}
                                        />
                                    ));
                                })()}
                             </div>
                        </div>
                    ) : sectionKey === '3' ? (
                        <div className="flex gap-4 justify-center overflow-x-auto pb-4">
                            {(() => {
                                const ranges = [
                                    { start: 251, end: 268 },
                                    { start: 326, end: 348 },
                                    { start: 406, end: 430 },
                                    { start: 489, end: 512 },
                                    { start: 605, end: 633 },
                                    { start: 688, end: 711 },
                                    { start: 765, end: 788 },
                                    { start: 821, end: 843 },
                                    { start: 898, end: 930 }
                                ];
                                const spacers = [507,709,773,786,633,840,841,930];
                                const renderedKeys = new Set();
                                const cols = ranges.map((range, idx) => {
                                    const colPlots = plots
                                      .filter(p => {
                                        const num = parseInt(String(p.Grave).replace(/\D/g, '')) || 0;
                                        return num >= range.start && num <= range.end;
                                      })
                                      .sort((a,b) => (parseInt(String(b.Grave).replace(/\D/g, ''))||0) - (parseInt(String(a.Grave).replace(/\D/g, ''))||0));
                                    const plotsWithSpacers = [];
                                    colPlots.forEach(plot => {
                                      const num = parseInt(String(plot.Grave).replace(/\D/g, '')) || 0;
                                      if (spacers.includes(num)) plotsWithSpacers.push({ isSpacer: true, _id: `sp-${num}` });
                                      plotsWithSpacers.push(plot);
                                      renderedKeys.add(`${num}|${plot._id}`);
                                    });
                                    return (
                                      <div key={idx} className="flex flex-col gap-1 justify-end min-w-[4rem] border-r border-dashed border-rose-200 last:border-0 pr-2">
                                        {plotsWithSpacers.map((plot, pIdx) => (
                                          <GravePlot key={plot._id || `plot-${pIdx}`} data={plot} baseColorClass={`${bgColor.replace('100','100')} ${borderColor}`} onHover={onHover} onEdit={isAdmin ? onEdit : undefined} />
                                        ))}
                                      </div>
                                    );
                                });
                                const { unplaced } = getUnplacedForSection('3', plots);
                                const fallbackCol = (
                                  <div key="fallback" className="flex flex-col gap-1 justify-end min-w-[4rem] border-dashed border-rose-200 pl-2">
                                    {unplaced.map((plot, pIdx) => (
                                      <GravePlot key={plot._id || `u3-${pIdx}`} data={plot} baseColorClass={`${bgColor.replace('100','100')} ${borderColor}`} onHover={onHover} onEdit={isAdmin ? onEdit : undefined} />
                                    ))}
                                  </div>
                                );
                                return [...cols, fallbackCol];
                            })()}
                        </div>
                    ) : sectionKey === '4' ? (
                        <div className="flex gap-4 justify-center overflow-x-auto pb-4">
                            {(() => {
                                const columnsConfig = [
                                    { ranges: [{ start: 208, end: 223 }], blanksStart: 14 },
                                    { ranges: [{ start: 269, end: 298 }] },
                                    { ranges: [{ start: 349, end: 378 }] },
                                    { ranges: [{ start: 431, end: 461 }] },
                                    { ranges: [{ start: 513, end: 542 }], spacers: [{ target: 513, position: 'before' }] },
                                    { ranges: [{ start: 546, end: 576 }], spacers: [{ target: 562, position: 'after' }, { target: 559, position: 'after' }] },
                                    { ranges: [{ start: 630, end: 658 }], spacers: [{ target: 641, position: 'after' }] },
                                    { ranges: [{ start: 712, end: 719 }], spacers: [{ target: 712, position: 'before' }, { target: 713, position: 'after' }, { target: 716, position: 'after' }], blanksEnd: 19 },
                                    { ranges: [{ start: 789, end: 795 }, { start: 720, end: 737 }], spacers: [{ target: 720, position: 'after' }], customLayout: true },
                                    { ranges: [{ start: 844, end: 870 }], blanksStart: 1, spacers: [{ target: 854, position: 'after' }, { target: 861, position: 'after' }] },
                                    { ranges: [{ start: 923, end: 945 }], spacers: [{ target: 935, position: 'after' }], blanksEnd: 7 }
                                ];

                                const cols = columnsConfig.map((col, idx) => {
                                    let plotsArr = [];
                                    col.ranges.forEach(r => {
                                        const rangePlots = plots.filter(p => {
                                            const num = parseInt(String(p.Grave).replace(/\D/g, '')) || 0;
                                            return num >= r.start && num <= r.end;
                                        }).sort((a,b) => (parseInt(String(a.Grave).replace(/\D/g, ''))||0) - (parseInt(String(b.Grave).replace(/\D/g, ''))||0));
                                        plotsArr = [...plotsArr, ...rangePlots];
                                    });

                                    if (col.customLayout && idx === 8) {
                                        const r1 = plots.filter(p => { const n = parseInt(String(p.Grave)); return n >= 789 && n <= 795; }).sort((a,b)=>parseInt(a.Grave)-parseInt(b.Grave));
                                        const r2 = plots.filter(p => { const n = parseInt(String(p.Grave)); return n >= 720 && n <= 737; }).sort((a,b)=>parseInt(a.Grave)-parseInt(b.Grave));
                                        const r1PartA = r1.filter(p => parseInt(p.Grave) <= 794);
                                        const r1PartB = r1.filter(p => parseInt(p.Grave) > 794);
                                        const sixBlanks = Array(6).fill({ isSpacer: true });
                                        const r2WithSpacer = [];
                                        r2.forEach(p => { r2WithSpacer.push(p); if (parseInt(p.Grave) === 720) r2WithSpacer.push({ isSpacer: true, _id: 'sp-720' }); });
                                        plotsArr = [...r1PartA, ...sixBlanks, ...r1PartB, ...r2WithSpacer];
                                    } else if (col.spacers) {
                                        const withSpacers = [];
                                        plotsArr.forEach(p => {
                                            const num = parseInt(String(p.Grave).replace(/\D/g, '')) || 0;
                                            if (col.spacers.some(s => s.target === num && s.position === 'before')) withSpacers.push({ isSpacer: true, _id: `sp-b-${num}` });
                                            withSpacers.push(p);
                                            if (col.spacers.some(s => s.target === num && s.position === 'after')) withSpacers.push({ isSpacer: true, _id: `sp-a-${num}` });
                                        });
                                        plotsArr = withSpacers;
                                    }

                                    if (col.blanksStart) plotsArr = [...Array(col.blanksStart).fill({ isSpacer: true }), ...plotsArr];
                                    if (col.blanksEnd) plotsArr = [...plotsArr, ...Array(col.blanksEnd).fill({ isSpacer: true })];

                                    return (
                                        <div key={idx} className="flex flex-col-reverse gap-1 items-center justify-start min-w-[4rem] border-r border-dashed border-cyan-200 last:border-0 pr-2">
                                            {plotsArr.map((plot, pIdx) => (
                                                <GravePlot key={plot._id || `plot-${idx}-${pIdx}`} data={plot} baseColorClass={`${bgColor.replace('100','100')} ${borderColor}`} onHover={onHover} onEdit={isAdmin ? onEdit : undefined} />
                                            ))}
                                        </div>
                                    );
                                });

                                const { unplaced } = getUnplacedForSection('4', plots);
                                const fallbackCol = (
                                  <div key="fallback4" className="flex flex-col gap-1 justify-end min-w-[4rem] border-dashed border-cyan-200 pl-2">
                                    {unplaced.map((plot, pIdx) => (
                                      <GravePlot key={plot._id || `u4-${pIdx}`} data={plot} baseColorClass={`${bgColor.replace('100','100')} ${borderColor}`} onHover={onHover} onEdit={isAdmin ? onEdit : undefined} />
                                    ))}
                                  </div>
                                );
                                return [...cols, fallbackCol];
                            })()}
                        </div>
                    ) : sectionKey === '5' ? (
                        <div className="flex gap-4 justify-center overflow-x-auto pb-4">
                            {(() => {
                                const sectionPlots = plots;
                                const byExact = (label) => sectionPlots.find(p => String(p.Grave).trim() === String(label).trim());
                                const byNum = (n) => sectionPlots.filter(p => parseInt(String(p.Grave).replace(/\D/g, '')) === n).sort((a,b)=>String(a.Grave).localeCompare(String(b.Grave)));
                                const pushRange = (arr, start, end) => { for (let i=start;i<=end;i++){ const found = byNum(i); if (found.length>0) arr.push(...found); } };
                                const pushLabels = (arr, labels) => { labels.forEach(lbl => { const f = byExact(lbl); if (f) arr.push(f); }); };
                                const pushBlanks = (arr, count, prefix) => { for(let i=0;i<count;i++){ arr.push({ isSpacer: true, _id: `${prefix||'sp'}-${i}-${Math.random().toString(36).slice(2,7)}` }); } };

                                const columns = [];

                                // Col 1: 224-236
                                (() => { const plots=[]; pushRange(plots,224,236); columns.push(plots); })();
                                // Col 2: 299-302, 4 blanks, 1001-1014
                                (() => { const plots=[]; pushRange(plots,299,302); pushBlanks(plots,4,'c2'); pushRange(plots,1001,1014); columns.push(plots); })();
                                // Col 3: 379-382, 4 blanks, 1015-1026
                                (() => { const plots=[]; pushRange(plots,379,382); pushBlanks(plots,4,'c3'); pushRange(plots,1015,1026); columns.push(plots); })();
                                // Col 4: 462-465, 4 blanks, 1029-1042
                                (() => { const plots=[]; pushRange(plots,462,465); pushBlanks(plots,4,'c4'); pushRange(plots,1029,1042); columns.push(plots); })();
                                // Col 5: 543-546, 4 blanks, 1043-1056
                                (() => { const plots=[]; pushRange(plots,543,546); pushBlanks(plots,4,'c5'); pushRange(plots,1043,1056); columns.push(plots); })();
                                // Col 6: 577-580, 4 blanks, 1057-1070, 1070-A U-7, 1070-B U-7
                                (() => { const plots=[]; pushRange(plots,577,580); pushBlanks(plots,4,'c6'); pushRange(plots,1057,1070); pushLabels(plots,["1070-A U-7","1070-B U-7"]); columns.push(plots); })();
                                // Col 7: 659-664, 2 blanks, 1071-1084, 1084-A U-7, 1084-B U-7
                                (() => { const plots=[]; pushRange(plots,659,664); pushBlanks(plots,2,'c7'); pushRange(plots,1071,1084); pushLabels(plots,["1084-A U-7","1084-B U-7"]); columns.push(plots); })();
                                // Col 8: 7 blanks, 1085-1102
                                (() => { const plots=[]; pushBlanks(plots,7,'c8'); pushRange(plots,1085,1102); columns.push(plots); })();
                                // Col 9: 738, 1 blank, 739-742, 20 blanks
                                (() => { const plots=[]; plots.push(...byNum(738)); pushBlanks(plots,1,'c9'); pushRange(plots,739,742); pushBlanks(plots,20,'c9e'); columns.push(plots); })();
                                // Col 10: 871-874, 11 blanks
                                (() => { const plots=[]; pushRange(plots,871,874); pushBlanks(plots,11,'c10'); columns.push(plots); })();
                                // Col 11: 16 blanks
                                (() => { const plots=[]; pushBlanks(plots,16,'c11'); columns.push(plots); })();

                                const mapped = columns.map((plots, idx) => (
                                    <div key={idx} className="flex flex-col-reverse gap-1 items-center justify-start min-w-[4rem] border-r border-dashed border-cyan-200 last:border-0 pr-2">
                                        {plots.map((plot, pIdx) => (
                                            <GravePlot
                                                key={plot._id || `s5-${idx}-${pIdx}`}
                                                data={plot}
                                                baseColorClass={`${bgColor.replace('100','100')} ${borderColor}`}
                                                onHover={onHover}
                                                onEdit={isAdmin && !plot.isSpacer ? onEdit : undefined}
                                            />
                                        ))}
                                    </div>
                                ));

                                const { unplaced } = getUnplacedForSection('5', plots);
                                const fallbackCol = (
                                    <div key="fallback5" className="flex flex-col-reverse gap-1 items-center justify-start min-w-[4rem] border-dashed border-cyan-200 pl-2">
                                        {unplaced.map((plot, pIdx) => (
                                            <GravePlot
                                                key={plot._id || `u5-${pIdx}`}
                                                data={plot}
                                                baseColorClass={`${bgColor.replace('100','100')} ${borderColor}`}
                                                onHover={onHover}
                                                onEdit={isAdmin ? onEdit : undefined}
                                            />
                                        ))}
                                    </div>
                                );

                                return [...mapped, fallbackCol];
                            })()}
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col-reverse gap-2 content-center items-center">
                                {(isExpanded ? (plots || []) : (plots || []).slice(0, 120)).map((plot) => (
                                    <GravePlot 
                                        key={`${plot.Section}-${plot.Row}-${plot.Grave}`} 
                                        data={plot} 
                                        baseColorClass={`${bgColor.replace('100', '100')} ${borderColor}`}
                                        onHover={onHover}
                                        onEdit={isAdmin ? onEdit : undefined}
                                    />
                                ))}
                            </div>
                            {!isExpanded && ((plots?.length || 0) > 120) && (
                                <div className="mt-3">
                                    <button
                                        type="button"
                                        onClick={onExpand}
                                        className="text-sm text-teal-700 hover:underline"
                                    >
                                        Show more ({(plots?.length || 0) - 120} more)
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
});

// --- MAIN APP COMPONENT ---

export default function PlotsPage() {
  const queryClient = useQueryClient();
        
  const invalidatePlotsMap = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['plotsMap'] });
  }, [queryClient]);

  const [hoverData, setHoverData] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('map'); 
  const [errorMessage, setErrorMessage] = useState('');
  const [collapsedSections, setCollapsedSections] = useState({ '1': true, '2': false, '3': true, '4': true, '5': false });
  const openSections = useMemo(() => Object.keys(collapsedSections).filter((k) => !collapsedSections[k]), [collapsedSections]);
  const [expandedSections, setExpandedSections] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSetSearchQuery = useMemo(() => debounce((v) => setSearchQuery(v || ''), 250), []);
  const deferredSearch = useDeferredValue(searchQuery);
  const [isCentering, setIsCentering] = useState(false);
  const location = useLocation();
  const backSearchUrl = location.state?.search ? `${createPageUrl('Search')}${location.state.search}` : createPageUrl('Search');
  const showBackToSearch = (new URLSearchParams(window.location.search)).get('from') === 'search';
  
  // Filtering State
  const [filters, setFilters] = useState({
          search: '',
          status: 'All',
          birthYearStart: '',
          birthYearEnd: '',
          deathYearStart: '',
          deathYearEnd: '',
          owner: '',
          plot: ''
      });

  // Table View State
  const [groupBy, setGroupBy] = useState('none');
  const [sortBy, setSortBy] = useState('Grave');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.status, filters.birthYearStart, filters.birthYearEnd, filters.deathYearStart, filters.deathYearEnd]);

  // Editing State
  const [editingId, setEditingId] = useState(null);
  const [inlineEditData, setInlineEditData] = useState({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPlotForModal, setSelectedPlotForModal] = useState(null);

  // DATA FETCHING
  const { data: user } = useQuery({
      queryKey: ['currentUser'],
      queryFn: () => base44.auth.me().catch(() => null),
  });
  
  const isAdmin = user?.role === 'admin';

  const { data: plotEntities = [], isLoading } = usePlotsMapData({
            activeTab,
            openSections,
            filterEntity,
          });

  // MUTATIONS
  const updatePlotMutation = useMutation({
      mutationFn: async ({ id, data }) => {
          const response = await base44.functions.invoke('updatePlot', { id, data });
          if (response.data && response.data.error) {
              throw new Error(response.data.error);
          }
          return response.data;
      },
      onSuccess: () => {
                      clearEntityCache('Plot');
                      
                      queryClient.invalidateQueries({ queryKey: ['plots'] });
                      invalidatePlotsMap();
                      toast.success("Plot updated successfully");
                  },
      onError: (err) => {
          toast.error(`Update failed: ${err.message}`);
      }
  });

  const createPlotsMutation = useMutation({
      mutationFn: async (plots) => {
          const response = await base44.functions.invoke('importPlots', { plots });
          if (response.data && response.data.error) {
              throw new Error(response.data.error);
          }
          return response.data;
      },
      onSuccess: (data) => {
                      clearEntityCache('Plot');
                      
                      queryClient.invalidateQueries({ queryKey: ['plots'] });
                      invalidatePlotsMap();
                      toast.success(data.message || "Imported plots successfully");
                  },
      onError: (err) => {
          toast.error(`Import failed: ${err.message}`);
      }
  });

  const addNotUsablePlots = async () => {
    const targets = [
      { section: '5', plot_number: '227', status: 'Not Usable' },
      { section: '5', plot_number: '302', status: 'Not Usable' },
    ];

    await Promise.all(targets.map(async (t) => {
      const existingArr = await base44.entities.Plot.filter(
        { $and: [
            { plot_number: t.plot_number },
            { $or: [ { section: '5' }, { section: 'Section 5' } ] }
          ] },
        '-updated_date',
        1
      );
      const existing = Array.isArray(existingArr) ? existingArr[0] : existingArr?.[0];
      if (existing?.id) {
        if (existing.status !== t.status) {
          await base44.entities.Plot.update(existing.id, { status: t.status });
        }
      } else {
        await base44.entities.Plot.create(t);
      }
    }));

    clearEntityCache('Plot');
    queryClient.invalidateQueries({ queryKey: ['plots'] });
    invalidatePlotsMap();
    toast.success('Added/updated plots 227 and 302 as Not Usable in Section 5');
    };

    const relocatePlot227ToSection2 = async () => {
    const target = { section: '2', plot_number: '228-A', status: 'Not Usable' };
    const originalArr = await base44.entities.Plot.filter(
      { $and: [
          { plot_number: '227' },
          { $or: [ { section: '5' }, { section: 'Section 5' } ] }
        ] },
      '-updated_date',
      1
    );
    const original = Array.isArray(originalArr) ? originalArr[0] : originalArr?.[0];
    if (original?.id) {
      await base44.entities.Plot.update(original.id, target);
    } else {
      const existingArr = await base44.entities.Plot.filter(
        { $and: [
            { plot_number: target.plot_number },
            { $or: [ { section: '2' }, { section: 'Section 2' } ] }
          ] },
        '-updated_date',
        1
      );
      const existing = Array.isArray(existingArr) ? existingArr[0] : existingArr?.[0];
      if (existing?.id) {
        if (existing.status !== target.status) {
          await base44.entities.Plot.update(existing.id, { status: target.status });
        }
      } else {
        await base44.entities.Plot.create(target);
      }
    }
    clearEntityCache('Plot');
    queryClient.invalidateQueries({ queryKey: ['plots'] });
    invalidatePlotsMap();
    toast.success('Moved 227 to Section 2 as 228-A (Not Usable)');
    };

  // MAP ENTITIES TO UI FORMAT
  const parsedData = useMemo(() => {
      return (plotEntities || []).map((p) => ({
        _id: p.id,
        _entity: 'Plot',
        Section: p.section,
        Row: p.row_number,
        Grave: p.plot_number,
        Status: p.status || 'Unknown',
        'First Name': p.first_name,
        'Last Name': p.last_name,
        'Family Name': p.family_name,
        Birth: p.birth_date,
        Death: p.death_date,
        Notes: p.notes || '',
        ...p,
      })).filter(r => r.Grave);
  }, [plotEntities]);

  // Filtered Data Computation
  const filteredData = useMemo(() => {
      return parsedData.filter(item => {
          // 1. General Search (debounced + deferred)
          if (deferredSearch) {
              const term = deferredSearch.toLowerCase();
              const searchable = [
                  item.Grave, 
                  item.Row, 
                  item['First Name'], 
                  item['Last Name'], 
                  item['Family Name'],
                  item.Notes,
                  item.Section
              ].join(' ').toLowerCase();
              if (!searchable.includes(term)) return false;
          }

          // 2. Owner Name (Family)
          if (filters.owner) {
              const owner = String(item['Family Name'] || '').toLowerCase();
              if (!owner.includes(filters.owner.toLowerCase())) return false;
          }

          // 3. Plot Number
          if (filters.plot) {
              const plotStr = String(item.Grave || '').toLowerCase();
              const wanted = filters.plot.toLowerCase();
              const numItem = parseInt(plotStr.replace(/\D/g, '')) || 0;
              const numWanted = /^[0-9]+$/.test(wanted) ? parseInt(wanted, 10) : null;
              if (numWanted != null) {
                  if (numItem !== numWanted) return false;
              } else if (!plotStr.includes(wanted)) {
                  return false;
              }
          }

          // 4. Status Filter
          if (filters.status !== 'All' && item.Status !== filters.status) {
              const isVeteran = item.Status === 'Veteran' || (item.Notes && item.Notes.toLowerCase().includes('vet') && item.Status === 'Occupied');
              if (filters.status === 'Veteran' && !isVeteran) return false;
              if (filters.status !== 'Veteran' && item.Status !== filters.status) return false;
          }

          // 5. Date Filters (Year)
          const getYear = (dateStr) => {
              if (!dateStr) return null;
              const date = new Date(dateStr);
              return isNaN(date.getFullYear()) ? null : date.getFullYear();
          };

          if (filters.birthYearStart || filters.birthYearEnd) {
              const birthYear = getYear(item.Birth);
              if (!birthYear) return false;
              if (filters.birthYearStart && birthYear < parseInt(filters.birthYearStart)) return false;
              if (filters.birthYearEnd && birthYear > parseInt(filters.birthYearEnd)) return false;
          }

          if (filters.deathYearStart || filters.deathYearEnd) {
              const deathYear = getYear(item.Death);
              if (!deathYear) return false;
              if (filters.deathYearStart && deathYear < parseInt(filters.deathYearStart)) return false;
              if (filters.deathYearEnd && deathYear > parseInt(filters.deathYearEnd)) return false;
          }

          return true;
      });
  }, [parsedData, deferredSearch, filters.owner, filters.plot, filters.status, filters.birthYearStart, filters.birthYearEnd, filters.deathYearStart, filters.deathYearEnd]);

  // Sync debounced search with filters.search
  useEffect(() => {
    debouncedSetSearchQuery((filters.search || '').toString());
    return () => { if (debouncedSetSearchQuery.cancel) debouncedSetSearchQuery.cancel(); };
  }, [filters.search, debouncedSetSearchQuery]);

  // Grouped and Sorted Data for Table View
  const processedTableData = useMemo(() => {
    // 1. Sort Data
    const sorted = [...filteredData].sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        // Handle Dates
        if (sortBy === 'Death') {
             valA = a.Death ? new Date(a.Death).getTime() : 0;
             valB = b.Death ? new Date(b.Death).getTime() : 0;
        } 
        // Handle Grave Numbers (Numeric Sort)
        else if (sortBy === 'Grave') {
            const numA = parseInt(String(valA).replace(/\D/g, '')) || 0;
            const numB = parseInt(String(valB).replace(/\D/g, '')) || 0;
            if (numA !== numB) return numA - numB;
            return String(valA).localeCompare(String(valB));
        }
        
        // Default String Sort
        if (valA < valB) return -1;
        if (valA > valB) return 1;
        return 0;
    });

    if (sortOrder === 'desc') sorted.reverse();

    // 2. Group Data (if applicable)
    if (groupBy !== 'none') {
        const groups = {};
        sorted.forEach(item => {
            const groupKey = item[groupBy] || 'Unassigned';
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(item);
        });
        return Object.keys(groups).sort().map(key => ({
            group: key,
            items: groups[key]
        }));
    }

    return sorted;
  }, [filteredData, groupBy, sortBy, sortOrder]);

  const sections = useMemo(() => {
    const grouped = {
        '1': [],
        '2': [],
        '3': [],
        '4': [],
        '5': []
    };

    filteredData.forEach(item => {
        const rawSection = (item.Section || '').trim();
        const rowVal = String(item.Row || '');
        let sectionKey = rawSection ? rawSection.replace(/Section\s*/i, '').trim() : '';

        if (!grouped[sectionKey]) {
            if (/^Row\s+[A-D]\b/i.test(rawSection) || (/^Row\s+/i.test(rawSection) && /-1\b/.test(rowVal))) {
                sectionKey = '1';
            }
        }

        if (grouped[sectionKey]) {
            grouped[sectionKey].push(item);
        }
    });

    Object.keys(grouped).forEach(key => {
        grouped[key].sort((a, b) => {
            const numA = parseInt(String(a.Grave).replace(/\D/g, '')) || 0;
            const numB = parseInt(String(b.Grave).replace(/\D/g, '')) || 0;
            if (numA !== numB) return numA - numB;
            return String(a.Grave).localeCompare(String(b.Grave));
        });
    });

    return grouped;
  }, [filteredData]);

  // Robustly scroll into view for a target section/plot (?section=...&plot=...)
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const rawSection = params.get('section') || '';
      const rawPlot = params.get('plot') || '';
      if (!rawSection && !rawPlot) return;

      if (isLoading) return;

      setActiveTab('map');
      setIsCentering(true);

      const sectionNorm = rawSection.replace(/Section\s*/i, '').trim();
      const plotNum = parseInt(rawPlot, 10);

      let attempts = 0;
      const maxAttempts = 180;
      let done = false;
      let sectionScrolled = false;

      const tryScroll = () => {
          if (done) return;
          attempts += 1;

          if (!isNaN(plotNum) && sectionNorm) {
              let plotEl = document.getElementById(`plot-${sectionNorm}-${plotNum}`);
              if (!plotEl) {
                  plotEl = document.querySelector(`[id^="plot-"][id$="-${plotNum}"]`);
              }
              if (plotEl) {
                  plotEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                  done = true;
                  setTimeout(() => setIsCentering(false), 400);
                  return;
              }
          }

          if (!sectionScrolled && sectionNorm) {
              const sectionEl = document.getElementById(`section-${sectionNorm}`) || document.getElementById(`section-${(rawSection.match(/\d+/) || [sectionNorm])[0]}`);
              if (sectionEl) {
                  sectionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  sectionScrolled = true;
              }
          }

          if (attempts < maxAttempts) {
              requestAnimationFrame(tryScroll);
          } else {
              done = true;
              setIsCentering(false);
          }
      };

      requestAnimationFrame(tryScroll);
  }, [sections, isLoading]);

  useEffect(() => {
    if (!isCentering) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isCentering]);

  // CSV Parser
  const parseCSV = useCallback((text) => {
    const lines = text.trim().split(/\r?\n/);
    
    let headerIndex = -1;
    for(let i=0; i<lines.length && i<10; i++) {
        if(lines[i].toLowerCase().includes('grave') && lines[i].toLowerCase().includes('status')) {
            headerIndex = i;
            break;
        }
    }

    if (headerIndex === -1) {
        setErrorMessage("Could not find a valid header row containing 'Grave' and 'Status'.");
        return [];
    }

    setErrorMessage('');
    const headers = lines[headerIndex].split(',').map(h => h.trim());
    
    return lines.slice(headerIndex + 1).map((line, idx) => {
        const values = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') { inQuotes = !inQuotes; }
            else if (char === ',' && !inQuotes) { values.push(current.trim().replace(/^"|"$/g, '')); current = ''; }
            else { current += char; }
        }
        values.push(current.trim().replace(/^"|"$/g, ''));
        
        const entry = {};
        headers.forEach((h, index) => { entry[h] = values[index] || ''; });
        
        return {
            section: entry['Section'],
            row_number: entry['Row'],
            plot_number: entry['Grave'],
            status: entry['Status'],
            first_name: entry['First Name'],
            last_name: entry['Last Name'],
            family_name: entry['Family Name'],
            birth_date: entry['Birth'],
            death_date: entry['Death'],
            notes: entry['Notes']
        };
    }).filter(row => row.plot_number);
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        const data = parseCSV(evt.target.result);
        if(data && data.length > 0) {
            createPlotsMutation.mutate(data);
        }
    };
    reader.readAsText(file);
  };

  const handleSeedData = () => {
    const data = parseCSV(INITIAL_CSV);
    if(data && data.length > 0) {
        createPlotsMutation.mutate(data);
    }
  };

  const handleHover = useCallback((e, data) => {
    if (!data) {
        setIsTooltipVisible(false);
        return;
    }
    const rect = e.target.getBoundingClientRect();
    setMousePos({ x: rect.right, y: rect.top });
    setHoverData(data);
    setIsTooltipVisible(true);
  }, []);

  const handleEditClick = useCallback((plot) => {
    setSelectedPlotForModal(plot);
    setIsEditModalOpen(true);
  }, []);

  const handleInlineEditStart = useCallback((plot) => {
    setEditingId(plot._id);
    setInlineEditData({ ...plot });
  }, []);

  const handleInlineChange = useCallback((field, value) => {
    setInlineEditData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleInlineSave = () => {
    handleUpdatePlot(inlineEditData);
    setEditingId(null);
    setInlineEditData({});
  };

  const handleInlineCancel = useCallback(() => {
    setEditingId(null);
    setInlineEditData({});
  }, []);

  const handleUpdatePlot = useCallback((updatedPlot) => {
      const entityData = {
          section: updatedPlot.Section,
          row_number: updatedPlot.Row,
          plot_number: updatedPlot.Grave,
          status: updatedPlot.Status,
          first_name: updatedPlot['First Name'],
          last_name: updatedPlot['Last Name'],
          family_name: updatedPlot['Family Name'],
          birth_date: updatedPlot.Birth,
          death_date: updatedPlot.Death,
          notes: updatedPlot.Notes
      };
      updatePlotMutation.mutate({ id: updatedPlot._id, data: entityData });
  }, [updatePlotMutation]);

  const toggleSection = useCallback((sectionKey) => {
    setCollapsedSections(prev => ({
        ...prev,
        [sectionKey]: !prev[sectionKey]
    }));
  }, []);

  const handleExpandSection = useCallback((sectionKey) => {
     setExpandedSections(prev => ({ ...prev, [sectionKey]: true }));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
       
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-5 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3"></div>
          
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex space-x-1 bg-gray-100 p-1 rounded-lg mr-4">
                <button 
                    onClick={() => setActiveTab('map')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${activeTab === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex items-center space-x-1">
                        <MapIcon size={14} /> <span>Map View</span>
                    </div>
                </button>
                <button 
                    onClick={() => setActiveTab('data')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${activeTab === 'data' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex items-center space-x-1">
                        <FileText size={14} /> <span>Data List</span>
                    </div>
                </button>
            </div>

            {isAdmin && (
            <div className="flex gap-2">
                <label className="flex items-center px-4 py-2 bg-teal-700 text-white rounded-lg cursor-pointer hover:bg-teal-800 transition shadow-sm active:transform active:scale-95">
                    {createPlotsMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : <Upload size={16} className="mr-2" />}
                    <span className="font-medium text-sm">Import CSV</span>
                    <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" disabled={createPlotsMutation.isPending} />
                </label>

                <Button
                  variant="outline"
                  onClick={async () => {
                    const res = await base44.functions.invoke('ensureSection1BottomRows', {});
                    const msg = res.data?.message || 'Completed';
                    const created = res.data?.results?.filter(r => r.status === 'created').length || 0;
                    const exists = res.data?.results?.filter(r => r.status === 'exists').length || 0;
                    toast.success(`${msg}: ${created} created, ${exists} already existed.`);
                                              queryClient.invalidateQueries({ queryKey: ['plots'] });
                                              invalidatePlotsMap();
                  }}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Missing Bottom Rows
                </Button>

                <Button
                  variant="outline"
                  onClick={addNotUsablePlots}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Plots 227 & 302 (Not Usable)
                </Button>

                <Button
                  variant="outline"
                  onClick={relocatePlot227ToSection2}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" /> Move 227 → 228-A (Sec 2) 								 				 				 				 				 		 	 	 	 	 	 	 	 	 	 	 	 	 	 	 	 	 	 	 	 	  					 	 	 	 	 	 	 	 	 	 	 	 	 	 	 	 	 	 	 	 	 	  























































































































































































                  <Plus className="w-4 h-4" /> Move 227                                             















                </Button>
            </div>
            )}
          </div>
        </div>
      </header>

      {showBackToSearch && (
        <div className="bg-stone-100 border-b border-stone-200 px-6 py-2">
          <div className="max-w-7xl mx-auto">
            <Link to={backSearchUrl} className="inline-flex items-center text-teal-800 hover:text-teal-900 font-medium">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Deceased Search
            </Link>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-4" role="alert">
            <p className="font-bold">Error Loading File</p>
            <p>{errorMessage}</p>
        </div>
      )}

      {/* Filter Bar */}
      <PlotFilters 
          filters={filters} 
          onFilterChange={setFilters} 
          statusOptions={Object.keys(STATUS_COLORS).filter(k => k !== 'Default')} 
      />

      {/* Main Area */}
      {activeTab === 'map' ? (
          <>
            {/* Legend */}
            <div className="bg-white border-b border-gray-200 py-3 px-6 overflow-x-visible sm:overflow-x-auto z-20">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 sm:min-w-max">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center">
                        <Info size={14} className="mr-1" /> Status Legend
                    </span>
                    <LegendItem label="Available" colorClass={STATUS_COLORS.Available} />
                    <LegendItem label="Reserved" colorClass={STATUS_COLORS.Reserved} />
                    <LegendItem label="Occupied" colorClass={STATUS_COLORS.Occupied} />
                    <LegendItem label="Veteran" colorClass={STATUS_COLORS.Veteran} />
                    <LegendItem label="Unavailable" colorClass={STATUS_COLORS.Unavailable} />
                </div>
            </div>

            {/* Map Canvas */}
            <main className="flex-grow p-6 overflow-y-auto">
                <div className="max-w-7xl mx-auto space-y-10 pb-20">
                    {/* Sections 1-5 Sorted Descending */}
                    {Object.keys(sections).sort((a, b) => {
                        const numA = parseInt(a);
                        const numB = parseInt(b);
                        if (!isNaN(numA) && !isNaN(numB)) return numB - numA; // DESCENDING order (5 -> 1)
                        return b.localeCompare(a);
                    }).map((sectionKey, index) => {
                        const palette = SECTION_PALETTES[index % SECTION_PALETTES.length];
                        
                        return (
                            <SectionRenderer
                                key={sectionKey}
                                sectionKey={sectionKey}
                                plots={sections[sectionKey]}
                                palette={palette}
                                isCollapsed={collapsedSections[sectionKey]}
                                onToggle={toggleSection}
                                isExpanded={expandedSections[sectionKey]}
                                onExpand={() => handleExpandSection(sectionKey)}
                                isAdmin={isAdmin}
                                onEdit={handleEditClick}
                                onHover={handleHover}
                            />
                        );
                    })}

                    {Object.keys(sections).length === 0 && !isLoading && (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-300 rounded-xl">
                            <Database size={48} className="mb-4 opacity-50" />
                            <p className="text-lg font-medium">No plots found in database</p>
                            <p className="text-sm mb-4">Import a CSV or initialize with sample data</p>
                            {isAdmin && (
                            <Button variant="outline" onClick={handleSeedData} disabled={createPlotsMutation.isPending}>
                                {createPlotsMutation.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : null}
                                Load Sample Data
                            </Button>
                            )}
                        </div>
                    )}
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <Loader2 size={48} className="mb-4 animate-spin text-blue-500" />
                            <p className="text-lg font-medium">Loading Plots...</p>
                        </div>
                    )}
                </div>
            </main>
          </>
      ) : (
          /* Data Table View */
          <main className="flex-grow p-6 max-w-7xl mx-auto w-full overflow-y-auto">
              <div className="flex flex-wrap gap-4 mb-4 items-center justify-end bg-gray-50 p-2 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase">Group By:</span>
                      <div className="flex bg-white rounded-md shadow-sm border border-gray-200 p-0.5">
                          {['none', 'Section', 'Row', 'Status'].map(g => (
                              <button
                                  key={g}
                                  onClick={() => setGroupBy(g)}
                                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${groupBy === g ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                              >
                                  {g === 'none' ? 'None' : g}
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="flex items-center gap-2 border-l border-gray-300 pl-4">
                      <span className="text-xs font-semibold text-gray-500 uppercase">Sort By:</span>
                      <select 
                          value={sortBy} 
                          onChange={(e) => setSortBy(e.target.value)}
                          className="text-xs h-7 border-gray-200 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                          <option value="Grave">Grave #</option>
                          <option value="Last Name">Last Name</option>
                          <option value="First Name">First Name</option>
                          <option value="Death">Death Date</option>
                      </select>
                      <button 
                          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                          className="text-xs bg-white border border-gray-200 rounded px-2 py-1 shadow-sm hover:bg-gray-50 text-gray-600 font-medium w-16"
                      >
                          {sortOrder === 'asc' ? 'Asc' : 'Desc'}
                      </button>
                  </div>
              </div>

              <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                          <tr>
                              {['Section', 'Grave', 'Row', 'Status', 'Last Name', 'First Name', 'Dates', 'Actions'].map(h => (
                                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                              ))}
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                          {groupBy === 'none' ? (
                              // Flat List Render
                              processedTableData.map((row) => (
                                  <PlotTableRow 
                                      key={row._id} 
                                      row={row} 
                                      editingId={editingId} 
                                      inlineEditData={inlineEditData}
                                      STATUS_COLORS={STATUS_COLORS}
                                      handleInlineChange={handleInlineChange}
                                      handleInlineSave={handleInlineSave}
                                      handleInlineCancel={handleInlineCancel}
                                      handleInlineEditStart={handleInlineEditStart}
                                      handleEditClick={handleEditClick}
                                      isAdmin={isAdmin}
                                  />
                              ))
                          ) : (
                              // Grouped Render
                              processedTableData.map((group) => (
                                  <React.Fragment key={group.group}>
                                      <tr className="bg-gray-100">
                                          <td colSpan={8} className="px-6 py-2 text-sm font-bold text-gray-700 uppercase tracking-wide border-t border-b border-gray-300">
                                              {groupBy}: {group.group} <span className="text-gray-400 font-normal ml-2">({group.items.length})</span>
                                          </td>
                                      </tr>
                                      {group.items.map((row) => (
                                          <PlotTableRow 
                                              key={row._id} 
                                              row={row} 
                                              editingId={editingId} 
                                              inlineEditData={inlineEditData}
                                              STATUS_COLORS={STATUS_COLORS}
                                              handleInlineChange={handleInlineChange}
                                              handleInlineSave={handleInlineSave}
                                              handleInlineCancel={handleInlineCancel}
                                              handleInlineEditStart={handleInlineEditStart}
                                              handleEditClick={handleEditClick}
                                              isAdmin={isAdmin}
                                          />
                                      ))}
                                  </React.Fragment>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
          </main>
      )}

      {/* Centering Overlay */}
      {isCentering && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-full p-5 shadow-lg border border-stone-200">
            <Loader2 className="w-7 h-7 animate-spin text-teal-700" />
          </div>
        </div>
      )}

      {/* Tooltip Portal */}
      <Tooltip data={hoverData} visible={isTooltipVisible} position={mousePos} />
      
      {/* Edit Dialog */}
      <PlotEditDialog 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        plot={selectedPlotForModal}
        onSave={handleUpdatePlot}
      />
    </div>
  );
}