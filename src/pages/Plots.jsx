import React, { useState, useEffect } from 'react';
import { Upload, Info, Map as MapIcon, Layers, FileText, AlertCircle } from 'lucide-react';

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
const GravePlot = ({ data, baseColorClass, onHover }) => {
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
  const [parsedData, setParsedData] = useState([]);
  const [sections, setSections] = useState({});
  const [hoverData, setHoverData] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('map'); 
  const [errorMessage, setErrorMessage] = useState('');

  // Load mock data on mount
  useEffect(() => {
    const data = parseCSV(INITIAL_CSV);
    if (data.length > 0) processData(data);
  }, []);

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
    
    return lines.slice(headerIndex + 1).map(line => {
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
        return entry;
    }).filter(row => row.Grave);
  };

  const processData = (data) => {
    setParsedData(data);
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        const data = parseCSV(evt.target.result);
        if(data && data.length > 0) {
            processData(data);
        }
    };
    reader.readAsText(file);
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

            <label className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition shadow-sm active:transform active:scale-95">
                <Upload size={16} className="mr-2" />
                <span className="font-medium text-sm">Import CSV</span>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      </header>
      
      {errorMessage && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-4" role="alert">
            <p className="font-bold">Error Loading File</p>
            <p>{errorMessage}</p>
        </div>
      )}

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
                        
                        return (
                            <div key={sectionKey} className="relative">
                                {/* Section Label */}
                                {sectionKey !== 'Row D' && (
                                <div className="flex items-end mb-3 ml-1">
                                    <h2 className={`text-2xl font-bold ${textColor.replace('text', 'text-opacity-80 text')}`}>
                                        Section {sectionKey}
                                    </h2>
                                    <div className="ml-4 h-px flex-grow bg-gray-200 mb-2"></div>
                                    <span className="mb-1 text-xs font-mono text-gray-400">
                                        {sections[sectionKey].length} Plots
                                    </span>
                                </div>
                                )}
                                
                                {/* SECTION CONTAINER: flex-wrap-reverse starts items from bottom-left */}
                                <div className={`
                                    rounded-xl border-2 border-dashed p-6 transition-colors duration-500
                                    ${borderColor} ${bgColor} bg-opacity-30
                                `}>
                                    <div className="flex flex-col-reverse gap-2 content-center items-center">
                                        {sections[sectionKey].map((plot) => (
                                            <GravePlot 
                                                key={`${plot.Section}-${plot.Row}-${plot.Grave}`} 
                                                data={plot} 
                                                baseColorClass={`${bgColor.replace('100', '100')} ${borderColor}`}
                                                onHover={handleHover}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {Object.keys(sections).length === 0 && !errorMessage && (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-300 rounded-xl">
                            <AlertCircle size={48} className="mb-4 opacity-50" />
                            <p className="text-lg font-medium">No burial data loaded</p>
                            <p className="text-sm">Upload a CSV file to generate the map</p>
                        </div>
                    )}
                </div>
            </main>
          </>
      ) : (
          /* Data Table View */
          <main className="flex-grow p-6 max-w-7xl mx-auto w-full overflow-y-auto">
              <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                          <tr>
                              {['Section', 'Grave', 'Row', 'Status', 'Last Name', 'First Name', 'Dates'].map(h => (
                                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                              ))}
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                          {parsedData.map((row, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 font-bold text-gray-700">{row.Section}</td>
                                  <td className="px-6 py-4 font-mono text-gray-900">{row.Grave}</td>
                                  <td className="px-6 py-4 text-gray-500">{row.Row}</td>
                                  <td className="px-6 py-4">
                                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[row.Status]?.split(' ').filter(c=>c.startsWith('bg') || c.startsWith('text')).join(' ')} bg-opacity-10`}>
                                          {row.Status}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 font-medium text-gray-900">{row['Last Name']}</td>
                                  <td className="px-6 py-4 text-gray-500">{row['First Name']}</td>
                                  <td className="px-6 py-4 text-gray-500">
                                      {row.Birth && row.Death ? `${row.Birth} - ${row.Death}` : '-'}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </main>
      )}

      {/* Tooltip Portal */}
      <Tooltip data={hoverData} visible={isTooltipVisible} position={mousePos} />
      
    </div>
  );
}