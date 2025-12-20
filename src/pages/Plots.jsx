import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Info, Map as MapIcon, Layers, FileText, AlertCircle, Pencil, Save, X, MoreHorizontal, Database, Loader2, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PlotEditDialog from "@/components/plots/PlotEditDialog";
import PlotFilters from "@/components/plots/PlotFilters";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

// --- MOCK DATA ---
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

// Helper Component for Table Row to reduce duplication
const PlotTableRow = ({ 
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
                    isAdmin && (
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
};

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

// --- COMPONENTS ---

// Tooltip Component
const Tooltip = ({ data, position, visible }) => {
  if (!visible || !data) return null;

  // Determine actual status including Veteran logic
  const isVeteran = data.Status === 'Veteran' || (data.Notes && data.Notes.toLowerCase().includes('vet'));
  const isOccupied = data.Status === 'Occupied' || isVeteran;
  
  const statusKey = isVeteran ? 'Veteran' : (STATUS_COLORS[data.Status] ? data.Status : 'Default');
  const statusColor = STATUS_COLORS[statusKey];
  // Extract just the bg color for the dot
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
};

// Individual Burial Plot Component
const GravePlot = ({ data, baseColorClass, onHover, onEdit }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Handle specific "Veteran" checks in notes if strictly labeled "Occupied"
  let displayStatus = data.Status;
  if (data.Notes && data.Notes.toLowerCase().includes('vet') && data.Status === 'Occupied') {
      displayStatus = 'Veteran';
  }

  // Get the color string for the status circle
  const statusColorFull = STATUS_COLORS[displayStatus] || STATUS_COLORS.Default;
  // Extract background color for the circle (e.g., 'bg-red-500')
  const statusBg = statusColorFull.split(' ').find(cls => cls.startsWith('bg-')) || 'bg-gray-400';

  // ORIENTATION UPDATE: 
  // Changed from w-8 h-16 (Portrait) to w-16 h-8 (Landscape) to rotate 90 degrees.
  const activeClass = isHovered 
    ? `${baseColorClass.replace('100', '200')} scale-110 z-20 shadow-xl ring-2 ring-blue-400 ring-opacity-75` 
    : `${baseColorClass} opacity-90 hover:opacity-100`;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onEdit && onEdit(data);
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
      {/* 1. Grave Number */}
      <span className="text-[10px] leading-none font-black text-gray-800">{data.Grave}</span>
      
      {/* 2. Row Number (Small) */}
      <span className="text-[8px] leading-none text-gray-600 font-mono tracking-tighter truncate max-w-full">
        {data.Row}
      </span>

      {/* 3. Status Circle */}
      <div className={`w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm ${statusBg}`}></div>
    </div>
  );
};

const LegendItem = ({ label, colorClass }) => {
    const bgClass = colorClass.split(' ').find(c => c.startsWith('bg-'));
    return (
        <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm whitespace-nowrap">
            <div className={`w-4 h-4 rounded-full border border-gray-300 ${bgClass}`}></div>
            <span className="text-xs font-semibold text-gray-600">{label}</span>
        </div>
    );
};

// --- MAIN APP COMPONENT ---

export default function PlotsPage() {
  const queryClient = useQueryClient();
  const [sections, setSections] = useState({});
  const [hoverData, setHoverData] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('map'); 
  const [errorMessage, setErrorMessage] = useState('');
  const [collapsedSections, setCollapsedSections] = useState({});
  
  // Filtering State
  const [filters, setFilters] = useState({
      search: '',
      status: 'All',
      birthYearStart: '',
      birthYearEnd: '',
      deathYearStart: '',
      deathYearEnd: ''
  });

  // Table View State
  const [groupBy, setGroupBy] = useState('none');
  const [sortBy, setSortBy] = useState('Grave');
  const [sortOrder, setSortOrder] = useState('asc');

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

  const { data: plotEntities, isLoading } = useQuery({
      queryKey: ['plots'],
      queryFn: () => base44.entities.Plot.list(null, 2000), // Fetch up to 2000 plots
      initialData: []
  });

  // MUTATIONS
  const updatePlotMutation = useMutation({
      mutationFn: async ({ id, data }) => {
          // Use backend function for audit logging
          const response = await base44.functions.invoke('updatePlot', { id, data });
          // Check for error in response data as invoke returns Axios response
          if (response.data && response.data.error) {
              throw new Error(response.data.error);
          }
          return response.data;
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['plots'] });
          toast.success("Plot updated successfully");
      },
      onError: (err) => {
          toast.error(`Update failed: ${err.message}`);
      }
  });

  const createPlotsMutation = useMutation({
      mutationFn: async (plots) => {
          // Use backend function for smart import (upsert/merge)
          const response = await base44.functions.invoke('importPlots', { plots });
          if (response.data && response.data.error) {
              throw new Error(response.data.error);
          }
          return response.data;
      },
      onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: ['plots'] });
          toast.success(data.message || "Imported plots successfully");
      },
      onError: (err) => {
          toast.error(`Import failed: ${err.message}`);
      }
  });

  const cleanupMutation = useMutation({
      mutationFn: async () => {
          const res = await base44.functions.invoke('cleanupSection1Duplicates', {});
          return res.data;
      },
      onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: ['plots'] });
          toast.success(data.message || "Cleanup complete");
      },
      onError: (err) => {
          // Try to extract backend error message if available
          const msg = err.response?.data?.error || err.message;
          toast.error(`Cleanup failed: ${msg}`);
      }
  });

  const seedLegacyDataMutation = useMutation({
      mutationFn: async () => {
          const res = await base44.functions.invoke('seedPlotsAndMaps', {});
          if (res.data && res.data.error) throw new Error(res.data.error);
          return res.data;
      },
      onSuccess: (data) => {
          toast.success(data.message || "Import complete");
      },
      onError: (err) => {
          toast.error(`Import failed: ${err.message}`);
      }
  });

  // MAP ENTITIES TO UI FORMAT
  const parsedData = useMemo(() => {
      return plotEntities.map(p => ({
          _id: p.id,
          Section: p.section,
          Row: p.row_number,
          Grave: p.plot_number,
          Status: p.status,
          'First Name': p.first_name,
          'Last Name': p.last_name,
          'Family Name': p.family_name,
          Birth: p.birth_date,
          Death: p.death_date,
          Notes: p.notes,
          ...p // keep original fields too
      }));
  }, [plotEntities]);

  // Filtered Data Computation
  const filteredData = useMemo(() => {
      return parsedData.filter(item => {
          // 1. Search Filter
          if (filters.search) {
              const term = filters.search.toLowerCase();
              const searchable = [
                  item.Grave, 
                  item.Row, 
                  item['First Name'], 
                  item['Last Name'], 
                  item.Notes,
                  item.Section
              ].join(' ').toLowerCase();
              if (!searchable.includes(term)) return false;
          }

          // 2. Status Filter
          if (filters.status !== 'All' && item.Status !== filters.status) {
              // Special case for Veteran which might be in notes or derived
              const isVeteran = item.Status === 'Veteran' || (item.Notes && item.Notes.toLowerCase().includes('vet') && item.Status === 'Occupied');
              if (filters.status === 'Veteran' && !isVeteran) return false;
              if (filters.status !== 'Veteran' && item.Status !== filters.status) return false;
          }

          // 3. Date Filters
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
  }, [parsedData, filters]);

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
        // Return array of group objects for easier rendering
        return Object.keys(groups).sort().map(key => ({
            group: key,
            items: groups[key]
        }));
    }

    return sorted;
  }, [filteredData, groupBy, sortBy, sortOrder]);

  // Update Sections based on Filtered Data
  useEffect(() => {
      processSections(filteredData);
  }, [filteredData]);

  const processSections = (data) => {
    const grouped = {};
    
    data.forEach(item => {
        let sectionKey = item.Section || '';
        
        if (!sectionKey) {
            const rowID = item.Row || '';
            const rowMatch = rowID.match(/^[A-Za-z]+/);
            sectionKey = rowMatch ? `Row ${rowMatch[0]}` : 'Unassigned';
        } else {
            sectionKey = sectionKey.replace(/Section\s*/i, '').trim();
        }
        
        if (!grouped[sectionKey]) grouped[sectionKey] = [];
        grouped[sectionKey].push(item);
    });

    // Sort items within sections by Grave number
    Object.keys(grouped).forEach(key => {
        grouped[key].sort((a, b) => {
            const numA = parseInt(a.Grave.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.Grave.replace(/\D/g, '')) || 0;
            return numA - numB;
        });
    });

    setSections(grouped);
  };

  // Load mock data on mount - REPLACED BY REACT QUERY
  // useEffect(() => {
  //   const data = parseCSV(INITIAL_CSV);
  //   if (data.length > 0) processData(data);
  // }, []);

  // CSV Parser
  const parseCSV = (text) => {
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
        
        // Map CSV keys to Entity keys
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
  };

  const processData = (data) => {
    // setParsedData(data); // Removed, handled by Query
  };

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

  const handleHover = (e, data) => {
    if (!data) {
        setIsTooltipVisible(false);
        return;
    }
    const rect = e.target.getBoundingClientRect();
    setMousePos({ x: rect.right, y: rect.top });
    setHoverData(data);
    setIsTooltipVisible(true);
  };

  // --- EDITING HANDLERS ---

  const handleEditClick = (plot) => {
    setSelectedPlotForModal(plot);
    setIsEditModalOpen(true);
  };

  const handleInlineEditStart = (plot) => {
    setEditingId(plot._id);
    setInlineEditData({ ...plot });
  };

  const handleInlineChange = (field, value) => {
    setInlineEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleInlineSave = () => {
    handleUpdatePlot(inlineEditData);
    setEditingId(null);
    setInlineEditData({});
  };

  const handleInlineCancel = () => {
    setEditingId(null);
    setInlineEditData({});
  };

  const handleUpdatePlot = (updatedPlot) => {
      // Convert UI keys back to Entity keys for update
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
  };

  const toggleSection = (sectionKey) => {
    setCollapsedSections(prev => ({
        ...prev,
        [sectionKey]: !prev[sectionKey]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-5 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
             <div className="bg-blue-600 p-2 rounded-lg text-white">
                <MapIcon size={24} />
             </div>
             <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Union Springs Cemetery</h1>
                <p className="text-sm text-gray-500">Interactive Burial Plot Viewer</p>
             </div>
          </div>
          
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
                <Button 
                    variant="outline" 
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => {
                        if(confirm("Are you sure you want to run the duplicate cleanup? This will delete duplicate plots in Section 1, keeping the ones with the most data.")) {
                            cleanupMutation.mutate();
                        }
                    }}
                    disabled={cleanupMutation.isPending}
                >
                    {cleanupMutation.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Trash2 className="mr-2 h-4 w-4" />}
                    Cleanup Duplicates
                </Button>

                <Button 
                    variant="outline"
                    onClick={() => {
                        if(confirm("Import legacy records into PlotsAndMaps?")) {
                            seedLegacyDataMutation.mutate();
                        }
                    }}
                    disabled={seedLegacyDataMutation.isPending}
                >
                    {seedLegacyDataMutation.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Database className="mr-2 h-4 w-4" />}
                    Import 184 Records
                </Button>

                <label className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition shadow-sm active:transform active:scale-95">
                    {createPlotsMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : <Upload size={16} className="mr-2" />}
                    <span className="font-medium text-sm">Import CSV</span>
                    <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" disabled={createPlotsMutation.isPending} />
                </label>
            </div>
            )}
          </div>
        </div>
      </header>
      
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
            <div className="bg-white border-b border-gray-200 py-3 px-6 overflow-x-auto z-20">
                <div className="max-w-7xl mx-auto flex items-center space-x-4 min-w-max">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center">
                        <Info size={14} className="mr-1" /> Status Legend
                    </span>
                    <LegendItem label="Open" colorClass={STATUS_COLORS.Available} />
                    <LegendItem label="Reserved" colorClass={STATUS_COLORS.Reserved} />
                    <LegendItem label="Occupied" colorClass={STATUS_COLORS.Occupied} />
                    <LegendItem label="Veteran" colorClass={STATUS_COLORS.Veteran} />
                    <LegendItem label="Unavailable" colorClass={STATUS_COLORS.Unavailable} />
                </div>
            </div>

            {/* Map Canvas */}
            <main className="flex-grow p-6 overflow-y-auto">
                <div className="max-w-7xl mx-auto space-y-10 pb-20">
                    {/* LAYOUT UPDATE: Sections sorted Descending (5 -> 1) */}
                    {Object.keys(sections).sort((a, b) => {
                        const numA = parseInt(a);
                        const numB = parseInt(b);
                        if (!isNaN(numA) && !isNaN(numB)) return numB - numA; // DESCENDING order
                        return b.localeCompare(a); // DESCENDING order for text
                    }).map((sectionKey, index) => {
                        const palette = SECTION_PALETTES[index % SECTION_PALETTES.length];
                        const [bgColor, borderColor, textColor] = palette.split(' ');
                        
                        const isCollapsed = collapsedSections[sectionKey];
                        
                        return (
                            <div key={sectionKey} className="relative">
                                {/* Section Label */}
                                <div 
                                    className="flex items-end mb-3 ml-1 cursor-pointer group select-none"
                                    onClick={() => toggleSection(sectionKey)}
                                >
                                    <div className={`mr-2 mb-1 p-1 rounded-full transition-colors ${isCollapsed ? 'bg-gray-200 text-gray-600' : `bg-white text-${textColor.split('-')[1]}-600 shadow-sm`}`}>
                                        {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                    <h2 className={`text-2xl font-bold ${textColor.replace('text', 'text-opacity-80 text')}`}>
                                        {sectionKey === 'Unassigned' ? 'Unassigned Plots' : `Section ${sectionKey.replace('Section', '').trim()}`}
                                    </h2>
                                    <div className="ml-4 h-px flex-grow bg-gray-200 mb-2 group-hover:bg-gray-300 transition-colors"></div>
                                    <span className="mb-1 text-xs font-mono text-gray-400 ml-2">
                                        {sections[sectionKey].length} Plots
                                    </span>
                                </div>
                                
                                {/* SECTION CONTAINER */}
                                {!isCollapsed && (
                                    <div className={`
                                        rounded-xl border-2 border-dashed p-6 transition-colors duration-500
                                        ${borderColor} ${bgColor} bg-opacity-30
                                        overflow-x-auto
                                    `}>
                                        {sectionKey === '1' ? (
                                            <div className="flex gap-4 justify-center">
                                                {(() => {
                                                    // Define the 8 columns by ranges (Plots 1-184)
                                                    const ranges = [
                                                        { start: 1, end: 23 },
                                                        { start: 24, end: 46 },
                                                        { start: 47, end: 69 },
                                                        { start: 70, end: 92 },
                                                        { start: 93, end: 115 },
                                                        { start: 116, end: 138 },
                                                        { start: 139, end: 161 }, // Plots 140-161 stacked on top of 139
                                                        { start: 162, end: 186 }
                                                    ];

                                                    return ranges.map((range, idx) => {
                                                        // Filter plots that belong to this column range
                                                        const colPlots = sections[sectionKey].filter(p => {
                                                            const num = parseInt(p.Grave.replace(/\D/g, '')) || 0;
                                                            return num >= range.start && num <= range.end;
                                                        });

                                                        // Sort descending so the smallest number (e.g. 1) is at the bottom of the flex column
                                                        colPlots.sort((a, b) => {
                                                            const numA = parseInt(a.Grave.replace(/\D/g, '')) || 0;
                                                            const numB = parseInt(b.Grave.replace(/\D/g, '')) || 0;
                                                            return numB - numA;
                                                        });

                                                        return (
                                                            <div key={idx} className="flex flex-col gap-1 justify-end">
                                                                {colPlots.map((plot) => (
                                                                    <GravePlot 
                                                                        key={`${plot.Section}-${plot.Row}-${plot.Grave}`} 
                                                                        data={plot} 
                                                                        baseColorClass={`${bgColor.replace('100', '100')} ${borderColor}`}
                                                                        onHover={handleHover}
                                                                        onEdit={isAdmin ? handleEditClick : undefined}
                                                                    />
                                                                ))}
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col-reverse gap-2 content-center items-center">
                                                {sections[sectionKey].map((plot) => (
                                                    <GravePlot 
                                                        key={`${plot.Section}-${plot.Row}-${plot.Grave}`} 
                                                        data={plot} 
                                                        baseColorClass={`${bgColor.replace('100', '100')} ${borderColor}`}
                                                        onHover={handleHover}
                                                        onEdit={isAdmin ? handleEditClick : undefined}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
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