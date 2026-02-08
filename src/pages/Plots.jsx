import React, { useState, useEffect, useMemo, useDeferredValue, useCallback, useRef, lazy, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from "@/api/base44Client";
import { filterEntity, clearEntityCache } from "@/components/gov/dataClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Info, Map as MapIcon, Database, Loader2, ChevronDown, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { usePlotsMapData } from "@/components/plots/usePlotsMapData";
import { normalizeSectionKey } from "@/components/plots/normalizeSectionKey";
import debounce from 'lodash/debounce';

// Lazy load heavy components
const PlotEditDialog = lazy(() => import("@/components/plots/PlotEditDialog"));
const PlotFilters = lazy(() => import("@/components/plots/PlotFilters"));
const ZoomPan = lazy(() => import("@/components/common/ZoomPan"));
const PlotsTour = lazy(() => import("@/components/plots/PlotsTour"));


const Section1DnDGrid = lazy(() => import("@/components/plots/Section1DnDGrid"));
const Section2DnDGrid = lazy(() => import("@/components/plots/Section2DnDGrid"));
const DraggableSectionGrid = lazy(() => import("@/components/plots/DraggableSectionGrid"));
import { toast } from "sonner";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    try { console.error('Plots page runtime error:', error, info); } catch {}
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 text-red-800 p-6">
          <div className="max-w-3xl mx-auto bg-white border border-red-200 rounded-md p-4">
            <h2 className="text-lg font-semibold mb-2">There was a problem loading the Plots map</h2>
            <p className="text-sm mb-3">{String(this.state.error?.message || 'Unknown error')}</p>
            <button className="px-3 py-1.5 bg-red-600 text-white rounded" onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  'bg-green-100 border-green-300 text-green-900',         // Section 2
  'bg-rose-100 border-rose-300 text-rose-900',      // Section 3
  'bg-amber-100 border-amber-300 text-amber-900',   // Section 4
  'bg-purple-100 border-purple-300 text-purple-900',// Section 5 (purple)
  'bg-lime-100 border-lime-300 text-lime-900',
];

// Stable palette by section key
const getSectionPalette = (key) => {
  switch (String(key)) {
    case '1': return 'bg-blue-100 border-blue-300 text-blue-900';
    case '2': return 'bg-green-100 border-green-300 text-green-900';
    case '3': return 'bg-rose-100 border-rose-300 text-rose-900';
    case '4': return 'bg-amber-100 border-amber-300 text-amber-900';
    case '5': return 'bg-purple-100 border-purple-300 text-purple-900';
    default:  return 'bg-lime-100 border-lime-300 text-lime-900';
  }
};

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
            // All other plots in Section 5 that don't match these ranges will go to unplaced/fallback
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

// Simplified tooltip - removed SmartImage for performance
const Tooltip = React.memo(({ data, visible }) => {
  if (!visible || !data) return null;

  const isVeteran = data.Status === 'Veteran' || (data.Notes && data.Notes.toLowerCase().includes('vet'));
  const statusKey = isVeteran ? 'Veteran' : (STATUS_COLORS[data.Status] ? data.Status : 'Default');
  const bgClass = STATUS_COLORS[statusKey]?.split(' ').find(c => c.startsWith('bg-')) || 'bg-gray-400';

  return (
    <div className="fixed z-[9999] inset-0 flex items-center justify-center pointer-events-none">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-72 max-w-[85vw] pointer-events-none p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-3 h-3 rounded-full ${bgClass}`}></span>
          <span className="font-bold text-gray-900">Plot {data.Grave}</span>
          <span className="text-xs text-gray-500 ml-auto">{statusKey}</span>
        </div>
        <p className="text-sm text-gray-600">Row {data.Row} • {data.Section || 'Section'}</p>
        {(data['First Name'] || data['Last Name']) && (
          <p className="text-sm font-medium mt-2">{data['First Name']} {data['Last Name']}</p>
        )}
        {data.Birth && data.Death && (
          <p className="text-xs text-gray-500">{data.Birth} - {data.Death}</p>
        )}
      </div>
    </div>
  );
});

// Inject CSS for blinking animation once at module level
if (typeof document !== 'undefined' && !document.getElementById('plot-blink-style')) {
  const style = document.createElement('style');
  style.id = 'plot-blink-style';
  style.textContent = `
    @keyframes plotBlink {
      0%, 100% { 
        background-color: #22c55e; 
        border-color: #15803d; 
        box-shadow: 0 0 30px 15px rgba(34, 197, 94, 0.8), 0 0 60px 30px rgba(34, 197, 94, 0.4); 
      }
      50% { 
        background-color: #4ade80; 
        border-color: #22c55e; 
        box-shadow: 0 0 50px 25px rgba(74, 222, 128, 0.9), 0 0 80px 40px rgba(74, 222, 128, 0.5); 
      }
    }
    .animate-plot-blink {
      animation: plotBlink 0.7s ease-in-out infinite;
      position: relative;
      z-index: 9999 !important;
    }
  `;
  document.head.appendChild(style);
}

// Simplified GravePlot - removed useState for hover, simplified classes
const GravePlot = React.memo(({ data, baseColorClass, onHover, onEdit, computedSectionKey }) => {
  const plotNum = useMemo(() => parseInt(String(data?.Grave || '').replace(/\D/g, '')) || null, [data?.Grave]);
  const sectionForId = computedSectionKey || String(data?.Section || '').replace(/Section\s/i, '').trim();

  // Early return for spacers
  if (data?.isSpacer) {
    const hasEditHandler = typeof onEdit === 'function';
    return (
      <div 
        className={`w-16 h-8 m-0.5 border border-dashed border-gray-300 bg-gray-50/50 rounded-[1px] flex items-center justify-center plot-element ${hasEditHandler ? 'hover:bg-green-100 cursor-pointer' : ''}`}
        onClick={hasEditHandler ? (e) => { e.stopPropagation(); onEdit({ isSpacer: true, Section: data.Section || computedSectionKey, suggestedSection: computedSectionKey }); } : undefined}
      >
        {hasEditHandler && <span className="text-[8px] text-gray-400">+</span>}
      </div>
    );
  }

  const isVet = data.Notes?.toLowerCase().includes('vet') && data.Status === 'Occupied';
  const displayStatus = isVet ? 'Veteran' : data.Status;
  const statusBg = STATUS_COLORS[displayStatus]?.split(' ').find(cls => cls.startsWith('bg-')) || 'bg-gray-400';

  return (
    <div
      id={plotNum != null ? `plot-${sectionForId}-${plotNum}` : undefined}
      data-plot-num={plotNum}
      data-section={sectionForId}
      onClick={(e) => { e.stopPropagation(); if (onEdit && data) onEdit(data); }}
      onMouseEnter={(e) => onHover?.(e, data)}
      onMouseLeave={() => onHover?.(null, null)}
      className={`${baseColorClass} border rounded-[1px] flex items-center justify-between px-1.5 w-16 h-8 m-0.5 text-[8px] cursor-pointer hover:opacity-100 opacity-90 plot-element`}
      title={`${data.Grave} - ${data.Row}`}
    >
      <span className="text-[10px] font-black text-gray-800">{data.Grave}</span>
      <span className="text-[8px] text-gray-600 font-mono truncate">{data.Row}</span>
      <div className={`w-2.5 h-2.5 rounded-full ${statusBg}`}></div>
    </div>
  );
});

const LegendItem = React.memo(({ label, colorClass, onClick, active }) => {
    const bgClass = colorClass.split(' ').find(c => c.startsWith('bg-'));
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={!!active}
        className={`flex items-center gap-1 sm:gap-1.5 bg-white h-8 sm:h-10 px-2 sm:px-3 rounded-full border border-gray-200 shadow-sm transition-colors hover:bg-green-50 active:bg-green-100 ${active ? 'ring-2 ring-green-500' : ''} shrink-0 touch-manipulation`}
        data-legend={label}
      >
        <div className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full ${bgClass}`}></div>
        <span className="text-[10px] sm:text-xs font-semibold text-gray-600 whitespace-nowrap">{label}</span>
      </button>
    );
});

// Removed - Table view not used in production

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
          onHover,
          onMovePlot,
          onAddBlankAbove,
          onDeleteAndShift
      }) => {
    const [bgColor, borderColor, textColor] = palette.split(' ');

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
                          <React.Suspense fallback={<div className="text-xs text-gray-500">Loading layout…</div>}>
                            <Section1DnDGrid
                              plots={plots}
                              baseColorClass={`${bgColor.replace('100','100')} ${borderColor}`}
                              isAdmin={isAdmin}
                              onHover={onHover}
                              onEdit={onEdit}
                              statusColors={STATUS_COLORS}
                            />
                          </React.Suspense>
                    ) : sectionKey === '2' ? (
                          <div className="flex justify-center">
                            <React.Suspense fallback={<div className="text-xs text-gray-500">Loading layout…</div>}>
                              <Section2DnDGrid
                                plots={plots}
                                baseColorClass={`${bgColor.replace('100','100')} ${borderColor}`}
                                isAdmin={isAdmin}
                                onHover={onHover}
                                onEdit={onEdit}
                                statusColors={STATUS_COLORS}
                              />
                            </React.Suspense>
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
                                const TARGET_HEIGHT = 35; // Target rows for uniform square border

                                const pushBlanks = (arr, count, prefix) => { 
                                  for(let i=0;i<count;i++){ 
                                    arr.push({ isSpacer: true, _id: `${prefix||'sp'}-${i}-${Math.random().toString(36).slice(2,7)}`, Section: '3' }); 
                                  } 
                                };

                                // Leading spacer column
                                const leadingCol = (
                                  <div key="leading" className="flex flex-col-reverse gap-1 items-center justify-start min-w-[4rem] border-r border-dashed border-rose-200 pr-2">
                                    {Array.from({ length: TARGET_HEIGHT }).map((_, i) => (
                                      <GravePlot key={`lead-${i}`} data={{ isSpacer: true, _id: `lead-${i}`, Section: '3' }}
                                      computedSectionKey={sectionKey} baseColorClass={`${bgColor.replace('100','100')} ${borderColor}`} onHover={onHover} onEdit={onEdit} />
                                    ))}
                                  </div>
                                );

                                const cols = ranges.map((range, idx) => {
                                    const colPlots = plots
                                      .filter(p => {
                                        const num = parseInt(String(p.Grave).replace(/\D/g, '')) || 0;
                                        return num >= range.start && num <= range.end;
                                      })
                                      .sort((a,b) => (parseInt(String(a.Grave).replace(/\D/g, ''))||0) - (parseInt(String(b.Grave).replace(/\D/g, ''))||0));
                                    const plotsWithSpacers = (() => {
                                      // Special handling for 326-348: ensure continuous sequence from 326 (bottom) up to 348 (top)
                                      if (range.start === 326 && range.end === 348) {
                                        const byNum = new Map();
                                        colPlots.forEach(p => {
                                          const n = parseInt(String(p.Grave).replace(/\D/g, '')) || 0;
                                          byNum.set(n, p);
                                        });
                                        const seq = [];
                                        for (let n = 326; n <= 348; n++) {
                                          const p = byNum.get(n);
                                          if (p) {
                                            seq.push(p);
                                            renderedKeys.add(`${n}|${p._id}`);
                                          } else {
                                            seq.push({ isSpacer: true, _id: `sp-${n}`, Section: '3' });
                                          }
                                        }
                                        return seq;
                                      }
                                      // Default behavior for other ranges
                                      const arr = [];
                                      colPlots.forEach(plot => {
                                        const num = parseInt(String(plot.Grave).replace(/\D/g, '')) || 0;
                                        if (spacers.includes(num)) arr.push({ isSpacer: true, _id: `sp-${num}`, Section: '3' });
                                        arr.push(plot);
                                        renderedKeys.add(`${num}|${plot._id}`);
                                      });
                                      return arr;
                                    })();

                                    // Add top padding to reach TARGET_HEIGHT
                                    const topPadding = Math.max(0, TARGET_HEIGHT - plotsWithSpacers.length);
                                    const paddedPlots = [...plotsWithSpacers];
                                    pushBlanks(paddedPlots, topPadding, `c3-${idx}-top`);

                                    return (
                                      <div key={idx} className="flex flex-col-reverse gap-1 items-center justify-start min-w-[4rem] border-r border-dashed border-rose-200 last:border-0 pr-2">
                                        {paddedPlots.map((plot, pIdx) => (
                                          <GravePlot key={plot._id || `plot-${pIdx}`} data={plot}
                                          computedSectionKey={sectionKey} baseColorClass={`${bgColor.replace('100','100')} ${borderColor}`} onHover={onHover} onEdit={onEdit} />
                                        ))}
                                      </div>
                                    );
                                });
                                const { unplaced } = getUnplacedForSection('3', plots);
                                const fallbackCol = (
                                  <div key="fallback" className="flex flex-col-reverse gap-1 items-center justify-start min-w-[4rem] border-r border-dashed border-rose-200 pr-2">
                                    {unplaced
                                      .sort((a,b) => (parseInt(String(a.Grave).replace(/\D/g, ''))||0) - (parseInt(String(b.Grave).replace(/\D/g, ''))||0))
                                      .map((plot, pIdx) => (
                                        <GravePlot key={plot._id || `u3-${pIdx}`} data={plot}
                                  computedSectionKey={sectionKey} baseColorClass={`${bgColor.replace('100','100')} ${borderColor}`} onHover={onHover} onEdit={onEdit} />
                                      ))}
                                  </div>
                                );

                                // Trailing spacer column
                                const trailingCol = (
                                  <div key="trailing" className="flex flex-col-reverse gap-1 items-center justify-start min-w-[4rem] border-dashed border-rose-200 pl-2">
                                    {Array.from({ length: TARGET_HEIGHT }).map((_, i) => (
                                      <GravePlot key={`trail-${i}`} data={{ isSpacer: true, _id: `trail-${i}`, Section: '3' }}
                                      computedSectionKey={sectionKey} baseColorClass={`${bgColor.replace('100','100')} ${borderColor}`} onHover={onHover} onEdit={onEdit} />
                                    ))}
                                  </div>
                                );

                                return [leadingCol, ...cols, fallbackCol, trailingCol];
                            })()}
                        </div>
                    ) : sectionKey === '4' ? (
                        <div className="flex gap-4 justify-center overflow-x-auto pb-4">
                            {(() => {
                                const columnsConfig = [
                                    { ranges: [{ start: 208, end: 223 }], blanksStart: 14 },
                                    { ranges: [{ start: 269, end: 298 }] },
                                    { ranges: [{ start: 349, end: 378 }] },
                                    { ranges: [{ start: 431, end: 461 }], blanksEnd: 1 },
                                    { ranges: [{ start: 513, end: 542 }], blanksStart: 1 },
                                    { ranges: [{ start: 548, end: 559 }, { start: 560, end: 562 }, { start: 564, end: 576 }], spacers: [{ target: 559, position: 'after' }, { target: 562, position: 'after' }] },
                                    { ranges: [{ start: 630, end: 658 }], spacers: [{ target: 641, position: 'after' }] },
                                    { ranges: [{ start: 712, end: 719 }], spacers: [{ target: 712, position: 'before' }, { target: 713, position: 'after' }, { target: 716, position: 'after' }], blanksEnd: 19 },
                                    { ranges: [{ start: 789, end: 795 }, { start: 720, end: 737 }], spacers: [{ target: 720, position: 'after' }], customLayout: true },
                                    { ranges: [{ start: 844, end: 870 }], blanksStart: 1, spacers: [{ target: 854, position: 'after' }, { target: 861, position: 'after' }] },
                                    { ranges: [{ start: 923, end: 945 }], spacers: [{ target: 935, position: 'after' }], blanksEnd: 7 }
                                ];

                                const TARGET_HEIGHT = 35; // Target rows for uniform square border

                                const pushBlanks = (arr, count, prefix) => { 
                                  for(let i=0;i<count;i++){ 
                                    arr.push({ isSpacer: true, _id: `${prefix||'sp'}-${i}-${Math.random().toString(36).slice(2,7)}`, Section: '4' }); 
                                  } 
                                };

                                // Leading spacer column
                                const leadingCol = (
                                  <div key="leading4" className="flex flex-col-reverse gap-1 items-center justify-start min-w-[4rem] border-r border-dashed border-amber-200 pr-2">
                                    {Array.from({ length: TARGET_HEIGHT }).map((_, i) => (
                                      <GravePlot key={`lead4-${i}`} data={{ isSpacer: true, _id: `lead4-${i}`, Section: '4' }}
                                      computedSectionKey={sectionKey} baseColorClass={`${bgColor.replace('100','100')} ${borderColor}`} onHover={onHover} onEdit={onEdit} />
                                    ))}
                                  </div>
                                );

                                const cols = columnsConfig.map((col, idx) => {
                                    let plotsArr = [];
                                    col.ranges.forEach(r => {
                                        const rangePlots = plots.filter(p => {
                                            const num = parseInt(String(p.Grave).replace(/\D/g, '')) || 0;
                                            return num >= r.start && num <= r.end;
                                        });
                                        // For 513–542, sort ascending then reverse the column (flex-col-reverse) so 513 starts at the bottom next to 432
                                        if (r.start === 513 && r.end === 542) {
                                            rangePlots.sort((a,b) => (parseInt(String(a.Grave).replace(/\D/g, ''))||0) - (parseInt(String(b.Grave).replace(/\D/g, ''))||0));
                                        } else {
                                            rangePlots.sort((a,b) => (parseInt(String(a.Grave).replace(/\D/g, ''))||0) - (parseInt(String(b.Grave).replace(/\D/g, ''))||0));
                                        }
                                        plotsArr = [...plotsArr, ...rangePlots];
                                    });

                                    if (col.customLayout) {
                                        const r1 = plots.filter(p => { const n = parseInt(String(p.Grave)); return n >= 789 && n <= 795; }).sort((a,b)=>parseInt(a.Grave)-parseInt(b.Grave));
                                        const r2 = plots.filter(p => { const n = parseInt(String(p.Grave)); return n >= 720 && n <= 737; }).sort((a,b)=>parseInt(a.Grave)-parseInt(b.Grave));
                                        const r1PartA = r1.filter(p => parseInt(p.Grave) <= 794);
                                        const r1PartB = r1.filter(p => parseInt(p.Grave) > 794);
                                        const sixBlanks = Array(6).fill(null).map((_, i) => ({ isSpacer: true, _id: `sp-6b-${i}`, Section: '4' }));
                                        const r2WithSpacer = [];
                                        r2.forEach(p => { r2WithSpacer.push(p); if (parseInt(p.Grave) === 720) r2WithSpacer.push({ isSpacer: true, _id: 'sp-720', Section: '4' }); });
                                        plotsArr = [...r1PartA, ...sixBlanks, ...r1PartB, ...r2WithSpacer];
                                    } else if (col.spacers) {
                                        const withSpacers = [];
                                        plotsArr.forEach(p => {
                                            const num = parseInt(String(p.Grave).replace(/\D/g, '')) || 0;
                                            if (col.spacers.some(s => s.target === num && s.position === 'before')) withSpacers.push({ isSpacer: true, _id: `sp-b-${num}`, Section: '4' });
                                            withSpacers.push(p);
                                            if (col.spacers.some(s => s.target === num && s.position === 'after')) withSpacers.push({ isSpacer: true, _id: `sp-a-${num}`, Section: '4' });
                                        });
                                        plotsArr = withSpacers;
                                    }

                                    if (col.blanksStart) plotsArr = [...Array(col.blanksStart).fill(null).map((_, i) => ({ isSpacer: true, _id: `sp-start-${idx}-${i}`, Section: '4' })), ...plotsArr];
                                    if (col.blanksEnd) plotsArr = [...plotsArr, ...Array(col.blanksEnd).fill(null).map((_, i) => ({ isSpacer: true, _id: `sp-end-${idx}-${i}`, Section: '4' }))];

                                    // Add top padding to reach TARGET_HEIGHT
                                    const topPadding = Math.max(0, TARGET_HEIGHT - plotsArr.length);
                                    pushBlanks(plotsArr, topPadding, `c4-${idx}-top`);

                                    return (
                                        <div key={idx} className="flex flex-col-reverse gap-1 items-center justify-start min-w-[4rem] border-r border-dashed border-amber-200 last:border-0 pr-2">
                                            {plotsArr.map((plot, pIdx) => (
                                                <GravePlot key={plot._id || `plot-${idx}-${pIdx}`} data={plot}
                                                computedSectionKey={sectionKey} baseColorClass={`${bgColor.replace('100','100')} ${borderColor}`} onHover={onHover} onEdit={onEdit} />
                                            ))}
                                        </div>
                                    );
                                });

                                const { unplaced } = getUnplacedForSection('4', plots);
                                const fallbackCol = (
                                  <div key="fallback4" className="flex flex-col-reverse gap-1 justify-start min-w-[4rem] border-r border-dashed border-amber-200 pr-2">
                                    {unplaced.map((plot, pIdx) => (
                                        <GravePlot key={plot._id || `u4-${pIdx}`} data={plot}
                                    computedSectionKey={sectionKey} baseColorClass={`${bgColor.replace('100','100')} ${borderColor}`} onHover={onHover} onEdit={onEdit} />
                                    ))}
                                  </div>
                                );

                                // Trailing spacer column
                                const trailingCol = (
                                  <div key="trailing4" className="flex flex-col-reverse gap-1 items-center justify-start min-w-[4rem] border-dashed border-amber-200 pl-2">
                                    {Array.from({ length: TARGET_HEIGHT }).map((_, i) => (
                                      <GravePlot key={`trail4-${i}`} data={{ isSpacer: true, _id: `trail4-${i}`, Section: '4' }}
                                      computedSectionKey={sectionKey} baseColorClass={`${bgColor.replace('100','100')} ${borderColor}`} onHover={onHover} onEdit={onEdit} />
                                    ))}
                                  </div>
                                );

                                return [leadingCol, ...cols, fallbackCol, trailingCol];
                            })()}
                        </div>
                    ) : sectionKey === '5' ? (
                        <React.Suspense fallback={<div className="text-xs text-gray-500">Loading layout…</div>}>
                        {(() => {
                            const sectionPlots = plots;
                            const byExact = (label) => sectionPlots.find(p => String(p.Grave).trim() === String(label).trim());
                            const byNum = (n) => sectionPlots.filter(p => parseInt(String(p.Grave).replace(/\D/g, '')) === n).sort((a,b)=>String(a.Grave).localeCompare(String(b.Grave)));
                            const pushRange = (arr, start, end) => { for (let i=start;i<=end;i++){ const found = byNum(i); if (found.length>0) arr.push(...found); } };
                            const pushLabels = (arr, labels) => { labels.forEach(lbl => { const f = byExact(lbl); if (f) arr.push(f); }); };
                            const pushBlanks = (arr, count, prefix, startNum) => { 
                              for(let i=0;i<count;i++){ 
                                arr.push({ 
                                  isSpacer: true, 
                                  _id: `${prefix||'sp'}-${i}-${Math.random().toString(36).slice(2,7)}`, 
                                  Section: '5',
                                  expectedPlotNumber: startNum ? startNum + i : null
                                }); 
                              } 
                            };

                            const TARGET_HEIGHT = 35;
                            const columns = [];

                            // Col 0: Leading empty column
                            (() => { const col=[]; pushBlanks(col, TARGET_HEIGHT, 'c0-lead'); columns.push(col); })();
                            // Col 1: 224-236 + top padding
                            (() => { const col=[]; pushRange(col,224,236); pushBlanks(col, TARGET_HEIGHT - 13, 'c1-top'); columns.push(col); })();
                            // Col 1.5: Full spacer column
                            (() => { const col=[]; pushBlanks(col, TARGET_HEIGHT, 'c1half'); columns.push(col); })();
                            // Col 2: 299-302, 4 blanks, 1001-1014
                            (() => { const col=[]; pushRange(col,299,302); pushBlanks(col,4,'c2'); pushRange(col,1001,1014); pushBlanks(col, TARGET_HEIGHT - 22, 'c2-top'); columns.push(col); })();
                            // Col 3: 379-382, 4 blanks, 1015-1026
                            (() => { const col=[]; pushRange(col,379,382); pushBlanks(col,4,'c3'); pushRange(col,1015,1026); pushBlanks(col, TARGET_HEIGHT - 20, 'c3-top'); columns.push(col); })();
                            // Col 4: 462-465, 4 blanks, 1029-1042
                            (() => { const col=[]; pushRange(col,462,465); pushBlanks(col,4,'c4'); pushRange(col,1029,1042); pushBlanks(col, TARGET_HEIGHT - 22, 'c4-top'); columns.push(col); })();
                            // Col 5: 543-546, 4 blanks, 1043-1056
                            (() => { const col=[]; pushRange(col,543,546); pushBlanks(col,4,'c5'); pushRange(col,1043,1056); pushBlanks(col, TARGET_HEIGHT - 22, 'c5-top'); columns.push(col); })();
                            // Col 6: 577-580, 4 blanks, 1057-1070, labels
                            (() => { const col=[]; pushRange(col,577,580); pushBlanks(col,4,'c6'); pushRange(col,1057,1070); pushLabels(col,["1070-A U-7","1070-B U-7"]); pushBlanks(col, TARGET_HEIGHT - 22, 'c6-top'); columns.push(col); })();
                            // Col 7: 659-664, 2 blanks, 1071-1084, labels
                            (() => { const col=[]; pushRange(col,659,664); pushBlanks(col,2,'c7'); pushRange(col,1071,1084); pushLabels(col,["1084-A U-7","1084-B U-7"]); pushBlanks(col, TARGET_HEIGHT - 24, 'c7-top'); columns.push(col); })();
                            // Col 8: 7 blanks, 1085-1102
                            (() => { const col=[]; pushBlanks(col,7,'c8'); pushRange(col,1085,1102); pushBlanks(col, TARGET_HEIGHT - 25, 'c8-top'); columns.push(col); })();
                            // Col 8.5: Full spacer column
                            (() => { const col=[]; pushBlanks(col, TARGET_HEIGHT, 'c8half'); columns.push(col); })();
                            // Col 9: 738, 1 blank, 739-742, 20 blanks
                            (() => { const col=[]; col.push(...byNum(738)); pushBlanks(col,1,'c9'); pushRange(col,739,742); pushBlanks(col,20,'c9e'); pushBlanks(col, TARGET_HEIGHT - 26, 'c9-top'); columns.push(col); })();
                            // Col 10: 871-874, 11 blanks
                            (() => { const col=[]; pushRange(col,871,874); pushBlanks(col,11,'c10'); pushBlanks(col, TARGET_HEIGHT - 15, 'c10-top'); columns.push(col); })();
                            // Col 11: spacer column
                            (() => { const col=[]; pushBlanks(col, TARGET_HEIGHT, 'c11'); columns.push(col); })();
                            // Col 12: Trailing empty column
                            (() => { const col=[]; pushBlanks(col, TARGET_HEIGHT, 'c12-trail'); columns.push(col); })();

                            // Add unplaced plots as final column
                            const { unplaced } = getUnplacedForSection('5', plots);
                            if (unplaced.length > 0) {
                                columns.push(unplaced);
                            }

                            return (
                                <DraggableSectionGrid
                                    sectionKey="5"
                                    columns={columns}
                                    baseColorClass={`${bgColor.replace('100','100')} ${borderColor}`}
                                    statusColors={STATUS_COLORS}
                                    isAdmin={isAdmin}
                                    onHover={onHover}
                                    onEdit={onEdit}
                                    onMovePlot={onMovePlot}
                                    onAddBlankAbove={onAddBlankAbove}
                                    onDeleteAndShift={onDeleteAndShift}
                                />
                            );
                        })()}
                        </React.Suspense>
                    ) : (
                        <>
                            <div className="flex flex-col-reverse gap-2 content-center items-center">
                                {(isExpanded ? (plots || []) : (plots || []).slice(0, 120)).map((plot) => (
                                    <GravePlot 
                                        key={`${plot.Section}-${plot.Row}-${plot.Grave}`} 
                                        data={plot}
                                  computedSectionKey={sectionKey} 
                                        baseColorClass={`${bgColor.replace('100', '100')} ${borderColor}`}
                                        onHover={onHover}
                                        onEdit={onEdit}
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
    queryClient.invalidateQueries({ queryKey: ['plotsMap_v3_all'] });
  }, [queryClient]);

  const [hoverData, setHoverData] = useState(null);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [collapsedSections, setCollapsedSections] = useState({ '1': false, '2': false, '3': false, '4': false, '5': false });
  const [isTourOpen, setIsTourOpen] = useState(false);
  // When coming from search, expand all sections so user can see all plots, but scroll to target
        useEffect(() => {
          const params = new URLSearchParams(window.location.search);
          const rawSection = params.get('section') || '';
          const rawPlot = params.get('plot') || '';
          const fromSearch = params.get('from') === 'search';
          if (!rawSection && !rawPlot) return;
          
          // If coming from search, expand all sections so all plots are visible
          if (fromSearch) {
            setCollapsedSections({ '1': false, '2': false, '3': false, '4': false, '5': false });
          } else {
            // Direct deep link - collapse other sections
            const rawNorm = rawSection.replace(/Section\s/i, '').trim();
            const targetKey = (/^Row\s*[A-D]/i.test(rawSection) || /^[A-D]$/i.test(rawNorm)) ? '1' : (rawNorm || '');
            if (targetKey && ['1','2','3','4','5'].includes(targetKey)) {
              setCollapsedSections({ '1': true, '2': true, '3': true, '4': true, '5': true, [targetKey]: false });
            }
          }
        }, []);
  const openSections = useMemo(() => Object.keys(collapsedSections).filter((k) => !collapsedSections[k]), [collapsedSections]);
  const [expandedSections, setExpandedSections] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSetSearchQuery = useMemo(() => debounce((v) => setSearchQuery(v || ''), 250), []);
  const deferredSearch = useDeferredValue(searchQuery);

  const location = useLocation();
  const zoomPanRef = useRef(null);
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



  // Editing State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPlotForModal, setSelectedPlotForModal] = useState(null);


  // DATA FETCHING - with caching
  const { data: user } = useQuery({
      queryKey: ['currentUser'],
      queryFn: () => base44.auth.me().catch(() => null),
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
  });
  
  const isAdmin = user?.role === 'admin';

  const { data: plotEntities = [], isLoading } = usePlotsMapData({
            activeTab: 'map',
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

    const fix326to348ToSection3 = async () => {
      const nums = Array.from({ length: (348 - 326 + 1) }, (_, i) => String(326 + i));
      const results = await base44.entities.Plot.filter({ plot_number: { $in: nums } }, '-updated_date', 1000);
      const arr = Array.isArray(results) ? results : (results || []);

      await Promise.all(
        arr.map(async (p) => {
          const sect = String(p.section || '').replace(/Section\s/i, '').trim();
          if (sect !== '3') {
            await base44.entities.Plot.update(p.id, { section: 'Section 3' });
          }
        })
      );

      clearEntityCache('Plot');
      queryClient.invalidateQueries({ queryKey: ['plots'] });
      invalidatePlotsMap();
      toast.success('Updated plots 326–348 to Section 3');
    };

    // MAP ENTITIES TO UI FORMAT
  const parsedData = useMemo(() => {
      const arr = (plotEntities || []).map((p) => ({
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
        photo_url: p.photo_url,
        photo_url_small: p.photo_url_small,
        photo_url_medium: p.photo_url_medium,
        photo_url_large: p.photo_url_large,
        ...p,
      })).filter(r => r.Grave);
      return arr;
  }, [plotEntities]);

  // Index for instant hover lookups
  const plotIndex = useMemo(() => {
      const m = new Map();
      (parsedData || []).forEach((p) => { if (p?._id) m.set(p._id, p); });
      return m;
  }, [parsedData]);

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
        let sectionKey = rawSection ? rawSection.replace(/Section\s/i, '').trim() : '';

        // Force key ranges into Section 4 to ensure proper rendering
        const graveNum = parseInt(String(item.Grave).replace(/\D/g, '')) || 0;
        if ((graveNum >= 513 && graveNum <= 542) ||
            (graveNum >= 548 && graveNum <= 559) ||
            (graveNum >= 560 && graveNum <= 562) ||
            (graveNum >= 564 && graveNum <= 576)) {
            sectionKey = '4';
        }

        // Handle plots with just numeric section (e.g., "5" instead of "Section 5")
        if (!grouped[sectionKey] && /^\d+$/.test(sectionKey)) {
            // Already a number, keep it
        } else if (!grouped[sectionKey]) {
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

  // Target plot from Deceased Search (?from=search&plot=...)
  const selectedPlotNum = React.useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const p = parseInt(params.get('plot') || '', 10);
    return Number.isFinite(p) ? p : null;
  }, [location.search]);

  // No longer use single plot mode - always show all plots
  const singlePlotMode = false;

  const selectedSectionKeyForPlot = React.useMemo(() => {
    if (selectedPlotNum == null) return null;
    for (const key of Object.keys(sections)) {
      const items = sections[key] || [];
      if (items.some(it => {
        const n = parseInt(String(it.Grave).replace(/\D/g, '')) || 0;
        return n === selectedPlotNum;
      })) return key;
    }
    return null;
  }, [selectedPlotNum, sections]);

  // Expand target section when coming from search
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const rawSection = params.get('section') || '';
      const rawPlot = params.get('plot') || '';
      if (!rawSection && !rawPlot) return;

      const rawNorm = rawSection.replace(/Section\s/i, '').trim();
      const sectionNorm = (/^Row\s*[A-D]/i.test(rawSection) || /^[A-D]$/i.test(rawNorm)) ? '1' : rawNorm;
      if (sectionNorm) {
        setCollapsedSections(prev => ({ ...prev, [sectionNorm]: false }));
      }
  }, []);

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

  // Optimized hover - throttled for performance
  const handleHover = useCallback((e, data) => {
    if (!data) {
      setIsTooltipVisible(false);
      return;
    }
    setHoverData(data);
    setIsTooltipVisible(true);
  }, []);

  const handleEditClick = useCallback((plot) => {
    setSelectedPlotForModal(plot);
    setIsEditModalOpen(true);
  }, []);

  const handleCreatePlot = useCallback(async (newPlotData) => {
    const entityData = {
      section: newPlotData.Section,
      row_number: newPlotData.Row,
      plot_number: newPlotData.Grave,
      status: newPlotData.Status,
      first_name: newPlotData['First Name'],
      last_name: newPlotData['Last Name'],
      family_name: newPlotData['Family Name'],
      birth_date: newPlotData.Birth,
      death_date: newPlotData.Death,
      notes: newPlotData.Notes,
      capacity: newPlotData.capacity,
      current_occupancy: newPlotData.current_occupancy,
      burial_type: newPlotData.burial_type,
      burial_type_options: newPlotData.burial_type_options,
      container_type: newPlotData.container_type,
      liner_vault_options: newPlotData.liner_vault_options
    };
    try {
      await base44.entities.Plot.create(entityData);
      clearEntityCache('Plot');
      queryClient.invalidateQueries({ queryKey: ['plots'] });
      invalidatePlotsMap();
      toast.success("Plot created successfully");
    } catch (err) {
      toast.error(`Failed to create plot: ${err.message}`);
    }
  }, [queryClient, invalidatePlotsMap]);

  const handleAddBlankAbove = useCallback(async (plot) => {
    if (!plot) return;
    
    try {
      const plotNumber = plot.Grave || plot.plot_number;
      const section = plot.Section || plot.section || 'Section 5';
      const row = plot.Row || plot.row_number || '';
      
      // Create a new blank plot with a unique plot number (add 'A' suffix or increment)
      const newPlotNumber = `${plotNumber}-NEW`;
      
      await base44.entities.Plot.create({
        section: section,
        row_number: row,
        plot_number: newPlotNumber,
        status: 'Available',
        notes: `Blank plot added above ${plotNumber}`
      });
      
      clearEntityCache('Plot');
      queryClient.removeQueries({ queryKey: ['plots'] });
      queryClient.removeQueries({ queryKey: ['plotsMap_v3_all'] });
      await queryClient.refetchQueries({ queryKey: ['plotsMap_v3_all'], type: 'active' });
      
      toast.success(`Added blank plot above #${plotNumber}`);
    } catch (err) {
      console.error('Add blank plot error:', err);
      toast.error(`Failed to add plot: ${err.message}`);
    }
  }, [queryClient]);

  const handleDeleteAndShift = useCallback(async (plot) => {
    if (!plot || !plot._id) return;
    
    try {
      const plotNumber = plot.Grave || plot.plot_number;
      
      // Check if plot has occupant data
      const hasOccupant = plot.first_name || plot.last_name || plot['First Name'] || plot['Last Name'];
      if (hasOccupant) {
        toast.error("Cannot delete plot with occupant data");
        return;
      }
      
      // Delete the plot
      await base44.entities.Plot.delete(plot._id);
      
      clearEntityCache('Plot');
      queryClient.removeQueries({ queryKey: ['plots'] });
      queryClient.removeQueries({ queryKey: ['plotsMap_v3_all'] });
      await queryClient.refetchQueries({ queryKey: ['plotsMap_v3_all'], type: 'active' });
      
      toast.success(`Deleted plot #${plotNumber} and shifted others`);
    } catch (err) {
      console.error('Delete plot error:', err);
      toast.error(`Failed to delete plot: ${err.message}`);
    }
  }, [queryClient]);

  const handleMovePlot = useCallback(async ({ plotId, targetSection, plot }) => {
    if (!plotId || !targetSection) return;

    try {
      const plotToMove = plot || parsedData.find(p => p._id === plotId);
      if (!plotToMove) {
        toast.error("Could not find plot to move");
        return;
      }

      const plotNumber = plotToMove.Grave || plotToMove.plot_number;
      
      console.log('handleMovePlot called:', plotId, 'to section:', targetSection);
      
      // Only update section - plot keeps its original plot_number
      await base44.entities.Plot.update(plotId, {
        section: `Section ${targetSection}`
      });

      console.log('Plot updated, invalidating caches...');
      
      // Clear all caches aggressively
      clearEntityCache('Plot');
      
      // Remove all plot-related queries from cache
      queryClient.removeQueries({ queryKey: ['plots'] });
      queryClient.removeQueries({ queryKey: ['plotsMap_v3_all'] });
      
      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ['plots'] });
      await queryClient.invalidateQueries({ queryKey: ['plotsMap_v3_all'] });
      
      // Force immediate refetch
      await queryClient.refetchQueries({ queryKey: ['plotsMap_v3_all'], type: 'active' });
      
      toast.success(`Moved plot #${plotNumber} to Section ${targetSection}`);
    } catch (err) {
      console.error('Move plot error:', err);
      toast.error(`Failed to move plot: ${err.message}`);
    }
  }, [parsedData, queryClient]);



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
          notes: updatedPlot.Notes,
          capacity: updatedPlot.capacity,
          current_occupancy: updatedPlot.current_occupancy,
          burial_type: updatedPlot.burial_type,
          burial_type_options: updatedPlot.burial_type_options,
          container_type: updatedPlot.container_type,
          liner_vault_options: updatedPlot.liner_vault_options
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

  // Quick Locate (in-memory) -------------------------------------------------
  

  const normalize = useCallback((s) => (s ? String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() : ''), []);

  const quickIndex = useMemo(() => {
    return (parsedData || []).map((p) => {
      let sectionKey = String(p.Section || '').replace(/Section\s/i, '').trim();
      const raw = String(p.Section || '');
      if (/^Row\s*[A-D]/i.test(raw) || /^[A-D]$/i.test(sectionKey)) sectionKey = '1';
      const plotNum = parseInt(String(p.Grave).replace(/\D/g, '')) || null;
      const text = normalize([
        p.Grave,
        p.Row,
        p.Section,
        p['First Name'],
        p['Last Name'],
        p['Family Name'],
        p._id,
      ].filter(Boolean).join(' '));
      return { sectionKey, plotNum, text, p };
    });
  }, [parsedData, normalize]);

  

  const centerElement = useCallback((el, callback) => {
    if (!el) return;
    try {
      if (zoomPanRef.current && zoomPanRef.current.centerOnElement) {
        zoomPanRef.current.centerOnElement(el, 'center', callback);
      } else {
        // Fallback to native scroll if ZoomPan ref not available
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        const hContainer = el.closest('[class*="overflow-x-auto"]');
        if (hContainer) {
          const elRect = el.getBoundingClientRect();
          const cRect = hContainer.getBoundingClientRect();
          const targetLeft = hContainer.scrollLeft + (elRect.left - cRect.left) - (hContainer.clientWidth / 2) + (elRect.width / 2);
          hContainer.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
        }
        // For fallback, call callback after a delay
        if (typeof callback === 'function') {
          setTimeout(callback, 500);
        }
      }
    } catch (err) {
      console.warn('centerElement error:', err);
      if (typeof callback === 'function') callback();
    }
  }, []);

  const findPlotElement = useCallback((sectionKey, plotNum) => {
    if (!plotNum) return null;
    
    // Try exact ID match first (most performant)
    let el = document.getElementById(`plot-${sectionKey}-${plotNum}`);
    if (el) return el;
    
    // Try data attributes match
    if (sectionKey) {
      el = document.querySelector(`[data-section="${sectionKey}"][data-plot-num="${plotNum}"]`);
      if (el) return el;
    }
    
    // Try any section with matching plot number
    el = document.querySelector(`[data-plot-num="${plotNum}"]`);
    if (el) return el;
    
    // Try partial ID match
    el = document.querySelector(`[id^="plot-"][id$="-${plotNum}"]`);
    if (el) return el;
    
    // Try without section in ID
    const allPlotElements = document.querySelectorAll('.plot-element');
    for (const plotEl of allPlotElements) {
      const elPlotNum = plotEl.getAttribute('data-plot-num');
      if (elPlotNum && parseInt(elPlotNum, 10) === plotNum) {
        return plotEl;
      }
    }
    
    return null;
  }, []);

  const doQuickSearch = useCallback((q) => {
                  const nq = normalize(q);
                  if (!nq) return;
                  let match = quickIndex.find((it) => it.text.includes(nq));
                  if (!match) {
                    const tokens = nq.split(' ').filter(Boolean);
                    match = quickIndex.find((it) => tokens.every((t) => it.text.includes(t)));
                  }
                  if (match && match.sectionKey && match.plotNum) {
                    setCollapsedSections(prev => ({
                      ...prev,
                      [match.sectionKey]: false,
                    }));
                    let attempts = 0;
                    const maxAttempts = 240;
                    const tryFind = () => {
                      attempts++;
                      const el = findPlotElement(match.sectionKey, match.plotNum);
                      if (el) {
                        centerElement(el);
                        return;
                      }
                      if (attempts < maxAttempts) {
                        requestAnimationFrame(tryFind);
                      }
                    };
                    requestAnimationFrame(tryFind);
                  }
                }, [quickIndex, normalize, findPlotElement, centerElement]);

  // Auto-center on search input when possible (moved below doQuickSearch to avoid TDZ)
  useEffect(() => {
    if (!deferredSearch) return;
    doQuickSearch(deferredSearch);
  }, [deferredSearch, doQuickSearch]);

  // Auto-center on target plot when coming from deceased search and trigger blinking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetPlot = params.get('plot');
    const targetSection = params.get('section');
    const fromSearch = params.get('from') === 'search';
    const shouldHighlight = params.get('highlight') === 'true';

    if (!fromSearch || !targetPlot) return;

    const normalizedSection = normalizeSectionKey(targetSection || '');
    const plotNum = parseInt(targetPlot, 10);

    if (!Number.isFinite(plotNum)) return;

    // Wait for sections to expand and DOM to render, then center
    let attempts = 0;
    const maxAttempts = 500; // ~8 seconds to allow for lazy loading
    let hasCentered = false;
    let isCancelled = false;

    const tryCenter = () => {
      if (isCancelled) return;
      attempts++;
      
      const el = findPlotElement(normalizedSection, plotNum);

      if (el && !hasCentered) {
        // Verify element is actually rendered and visible
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          // Element exists but not yet laid out, keep trying
          if (attempts < maxAttempts) {
            requestAnimationFrame(tryCenter);
          }
          return;
        }

        hasCentered = true;
        
        // Double RAF to ensure paint is complete
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (isCancelled) return;
            
            // Use ZoomPan's centerOnElement with callback for precise timing
            if (zoomPanRef.current && zoomPanRef.current.centerOnElement) {
              zoomPanRef.current.centerOnElement(el, 'center', () => {
                // Callback fires after centering animation completes
                if (isCancelled) return;
                
                // Small delay to ensure transform is applied before blinking
                setTimeout(() => {
                  if (isCancelled) return;
                  if (shouldHighlight || fromSearch) {
                    window.dispatchEvent(new CustomEvent('plot-start-blink', {
                      detail: { targetPlotNum: plotNum, targetSection: normalizedSection }
                    }));
                  }
                }, 50);
              });
            } else {
              // Fallback: native scroll with delayed blink
              el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
              if (shouldHighlight || fromSearch) {
                setTimeout(() => {
                  if (isCancelled) return;
                  window.dispatchEvent(new CustomEvent('plot-start-blink', {
                    detail: { targetPlotNum: plotNum, targetSection: normalizedSection }
                  }));
                }, 600);
              }
            }
          });
        });
        return;
      }

      if (attempts < maxAttempts) {
        requestAnimationFrame(tryCenter);
      }
    };

    // Start trying after a delay to let React render, sections expand, and ZoomPan initialize
    const startTimer = setTimeout(() => {
      requestAnimationFrame(tryCenter);
    }, 400);

    // Cleanup on unmount or dependency change
    return () => {
      isCancelled = true;
      clearTimeout(startTimer);
    };
  }, [findPlotElement]);

  const debouncedSearchRef = useRef(null);
  useEffect(() => {
    debouncedSearchRef.current = debounce((val) => doQuickSearch(val), 200);
    return () => { if (debouncedSearchRef.current?.cancel) debouncedSearchRef.current.cancel(); };
  }, [doQuickSearch]);

  const onQuickLocateChange = useCallback((e) => {
          const v = e.target.value || '';
          if (debouncedSearchRef.current) debouncedSearchRef.current(v);
        }, []);



        

  return (
    <div className="min-h-screen flex flex-col font-sans relative" style={{ 
      backgroundImage: 'url(https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/9be70da29_SVGGraveyardPICadobe2.svg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed'
    }}>
          
       
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-6 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/44a8ffe54_Gemini_Generated_Image_mbje5gmbje5gmbje.png" 
              alt="Union Springs Logo" 
              className="h-12 w-12 sm:h-14 sm:w-auto rounded-full"
              loading="eager"
              width={56}
              height={56}
            />
            <div className="flex flex-col">
              <span className="text-2xl md:text-3xl font-serif tracking-wider uppercase text-teal-600">Union Springs</span>
              <span className="text-[0.7rem] md:text-xs text-stone-500 tracking-[0.2em] uppercase">Cemetery - Shongaloo, LA</span>
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Old Plots and Maps</h1>
              <p className="text-sm text-gray-500">Explore our historic cemetery plots and their locations.</p>
            </div>
          
          <div className="flex items-center space-x-3">


            {isAdmin && (
            <div className="flex gap-2">
                <label className="flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-teal-700 text-white rounded-lg cursor-pointer hover:bg-teal-800 transition shadow-sm active:scale-95 touch-manipulation">
                    {createPlotsMutation.isPending ? <Loader2 className="animate-spin mr-1.5 sm:mr-2" size={14} /> : <Upload size={14} className="mr-1.5 sm:mr-2" />}
                    <span className="font-medium text-xs sm:text-sm">Import</span>
                    <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" disabled={createPlotsMutation.isPending} />
                </label>



            </div>
            )}
          </div>
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


      {/* Filter Bar - lazy loaded */}
      <div id="plots-filters">
        <Suspense fallback={<div className="bg-white border-b border-gray-200 px-6 py-4 h-16" />}>
          <PlotFilters 
              filters={filters} 
              onFilterChange={setFilters} 
              statusOptions={Object.keys(STATUS_COLORS).filter(k => k !== 'Default')} 
          />
        </Suspense>
      </div>

      {/* Main Area - Map only, table removed */}
      <Suspense fallback={<div className="p-6 text-sm text-gray-500 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin mr-2" />Loading map…</div>}>

            {/* Legend - simplified for mobile */}
            <div className="bg-white border-b border-gray-200 py-2 sm:py-3 px-4 sm:px-6 overflow-x-auto z-20">
                <div className="max-w-7xl mx-auto flex items-center gap-2 sm:gap-3 justify-start">
                    <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center shrink-0">
                        <Info size={12} className="mr-1 sm:mr-1.5" /> Status
                    </span>
                    <LegendItem label="Available" colorClass={STATUS_COLORS.Available} onClick={() => setFilters(prev => ({ ...prev, status: prev.status === 'Available' ? 'All' : 'Available' }))} active={filters.status === 'Available'} />
                    <LegendItem label="Reserved" colorClass={STATUS_COLORS.Reserved} onClick={() => setFilters(prev => ({ ...prev, status: prev.status === 'Reserved' ? 'All' : 'Reserved' }))} active={filters.status === 'Reserved'} />
                    <LegendItem label="Occupied" colorClass={STATUS_COLORS.Occupied} onClick={() => setFilters(prev => ({ ...prev, status: prev.status === 'Occupied' ? 'All' : 'Occupied' }))} active={filters.status === 'Occupied'} />
                    <LegendItem label="Veteran" colorClass={STATUS_COLORS.Veteran} onClick={() => setFilters(prev => ({ ...prev, status: prev.status === 'Veteran' ? 'All' : 'Veteran' }))} active={filters.status === 'Veteran'} />
                    <LegendItem label="Unavailable" colorClass={STATUS_COLORS.Unavailable} onClick={() => setFilters(prev => ({ ...prev, status: prev.status === 'Unavailable' ? 'All' : 'Unavailable' }))} active={filters.status === 'Unavailable'} />
                </div>
            </div>

            {/* Map Canvas */}
            <main className="flex-grow p-6 overflow-y-auto">
                <div className="max-w-7xl mx-auto space-y-10 pb-20">
                    {/* Sections 1-5 Sorted Descending with Zoom/Pan */}

                    <Suspense fallback={<div className="w-full min-h-[70vh] bg-white rounded-lg border border-gray-200 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>}>
                    <ZoomPan ref={zoomPanRef} className="w-full min-h-[60vh] md:min-h-[70vh] bg-white rounded-lg border border-gray-200 overflow-hidden" minScale={0.4} maxScale={2} initialScale={0.85}>
                      <div className="p-4 inline-block min-w-max space-y-10">
                        {/* Always show all plots, scroll/center to target if from search */}
                        {Object.keys(sections).sort((a, b) => {
                            const numA = parseInt(a);
                            const numB = parseInt(b);
                            if (!isNaN(numA) && !isNaN(numB)) return numB - numA; // DESCENDING order (5 -> 1)
                            return b.localeCompare(a);
                          }).map((sectionKey) => {
                            const palette = getSectionPalette(sectionKey);
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
                                onEdit={isAdmin ? handleEditClick : undefined}
                                onHover={handleHover}
                                onMovePlot={isAdmin ? handleMovePlot : undefined}
                                onAddBlankAbove={isAdmin ? handleAddBlankAbove : undefined}
                                onDeleteAndShift={isAdmin ? handleDeleteAndShift : undefined}
                                />
                                );
                                })}
                      </div>
                    </ZoomPan>
                    </Suspense>

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
      </Suspense>



      {/* Tooltip Portal - conditionally rendered */}
      {isTooltipVisible && hoverData && <Tooltip data={hoverData} visible={isTooltipVisible} />}



      {/* Guided Tour - only render when open */}
      {isTourOpen && (
        <Suspense fallback={null}>
          <PlotsTour open={isTourOpen} onClose={() => setIsTourOpen(false)} />
        </Suspense>
      )}
      
      {/* Edit Dialog - only render when open */}
      {isEditModalOpen && (
        <Suspense fallback={null}>
          <PlotEditDialog 
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            plot={selectedPlotForModal}
            onSave={handleUpdatePlot}
            onCreate={handleCreatePlot}
          />
        </Suspense>
      )}
    </div>
  );
}