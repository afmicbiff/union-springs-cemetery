import React, { useState, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Map, Grid, Info, QrCode, Search as SearchIcon, List } from 'lucide-react';
import QRCode from "react-qr-code";

export default function PlotsPage() {
  const [activeSection, setActiveSection] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [searchQuery, setSearchQuery] = useState("");
  const printRef = useRef();

  const { data: plots, isLoading: plotsLoading } = useQuery({
    queryKey: ['plots'],
    queryFn: () => base44.entities.Plot.list({ limit: 200 }),
    initialData: [],
  });

  const { data: deceasedList } = useQuery({
    queryKey: ['deceased-plots'],
    queryFn: () => base44.entities.Deceased.list({ limit: 200 }),
    initialData: [],
  });

  // Helper to find occupants for a plot
  const getOccupants = (plotSection, plotNumber) => {
    // Simple string matching based on the convention "Section-Row-Number" or just checking plot_number if simplified
    // In a real app, this would be a proper relationship join
    return deceasedList.filter(d => 
        d.plot_location && d.plot_location.includes(`${plotSection}`) && d.plot_location.includes(`${plotNumber}`)
    );
  };
  
  // Advanced Filter Logic
  const filteredPlots = plots.filter(plot => {
    const matchesSection = activeSection === "all" || plot.section === activeSection;
    
    // Search Filter
    let matchesSearch = true;
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        // Check plot number
        const plotMatch = plot.plot_number.toLowerCase().includes(query);
        // Check occupants
        const occupants = getOccupants(plot.section, plot.plot_number);
        const occupantMatch = occupants.some(occ => 
            occ.first_name.toLowerCase().includes(query) || 
            occ.last_name.toLowerCase().includes(query)
        );
        matchesSearch = plotMatch || occupantMatch;
    }

    return matchesSection && matchesSearch;
  });

  const sections = ["North", "South", "East", "West", "Garden of Peace", "Old Historic"];

  const getStatusColor = (plot, occupants) => {
     // Check for "Veteran" status indirectly via occupants
     const hasVeteran = occupants.some(d => d.veteran_status);
     const isMultiStatus = plot.current_occupancy > 0 && plot.status === 'reserved'; // Example of multi-status complexity

     if (plot.status === 'unavailable') return "bg-gray-800 border-gray-900 text-gray-400";
     if (hasVeteran) return "bg-blue-100 border-blue-300 text-blue-900"; // Veteran Specific Color
     if (isMultiStatus) return "bg-purple-100 border-purple-300 text-purple-900";
     
     switch(plot.status) {
         case 'available': return "bg-stone-50 border-stone-200 hover:border-teal-500";
         case 'reserved': return "bg-teal-100 border-teal-300 text-teal-900";
         case 'occupied': return "bg-red-100 border-red-300 text-red-900";
         default: return "bg-stone-50";
     }
  };

  const getStatusLabel = (plot, occupants) => {
      if (occupants.some(d => d.veteran_status)) return "Veteran";
      return plot.status;
  };

  return (
    <div className="min-h-screen bg-stone-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1240px] mx-auto space-y-8">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-stone-300 pb-6">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-serif text-stone-900">Digital Map & Plots</h1>
            <p className="text-stone-600 text-lg">
                Explore the grounds. Green indicates available for reservation.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant={viewMode === 'grid' ? 'default' : 'outline'} onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'bg-teal-700' : ''}>
                <Grid className="w-4 h-4 mr-2" /> Map View
            </Button>
            <Button variant={viewMode === 'list' ? 'default' : 'outline'} onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-teal-700' : ''}>
                <List className="w-4 h-4 mr-2" /> List View
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Controls Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Search */}
            <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 w-4 h-4" />
                <Input 
                    placeholder="Search plot # or name..." 
                    className="pl-9 bg-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Section Filters */}
            <Card className="bg-slate-50 border-none shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="font-serif text-lg text-stone-800">Sections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-3">
                <Button 
                    variant={activeSection === "all" ? "default" : "ghost"} 
                    className={`w-full justify-start font-serif h-9 ${activeSection === 'all' ? 'bg-teal-700 text-white' : 'text-stone-600 hover:bg-stone-200'}`}
                    onClick={() => setActiveSection("all")}
                >
                    Entire Cemetery
                </Button>
                {sections.map(section => (
                  <Button 
                    key={section}
                    variant={activeSection === section ? "default" : "ghost"} 
                    className={`w-full justify-start font-serif h-9 ${activeSection === section ? 'bg-teal-700 text-white' : 'text-stone-600 hover:bg-stone-200'}`}
                    onClick={() => setActiveSection(section)}
                  >
                    {section}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Legend */}
            <Card className="bg-slate-50 border-none shadow-md">
                <CardHeader className="pb-3">
                    <CardTitle className="font-serif text-lg text-stone-800">Status Legend</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-4">
                    <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-sm bg-stone-50 border border-stone-400"></div><span className="text-sm">Open (Available)</span></div>
                    <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-sm bg-teal-100 border border-teal-300"></div><span className="text-sm">Reserved</span></div>
                    <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-sm bg-red-100 border border-red-300"></div><span className="text-sm">Occupied</span></div>
                    <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-sm bg-blue-100 border border-blue-300"></div><span className="text-sm">Veteran</span></div>
                    <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-sm bg-gray-800 border border-gray-900"></div><span className="text-sm text-stone-500">Unavailable</span></div>
                </CardContent>
            </Card>
          </div>

          {/* Main Display */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-sm shadow-md p-6 min-h-[600px] border border-stone-200">
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredPlots.length > 0 ? filteredPlots.map((plot) => {
                            const occupants = getOccupants(plot.section, plot.plot_number);
                            return (
                                <Dialog key={plot.id}>
                                    <DialogTrigger asChild>
                                        <div 
                                            className={`
                                                relative p-4 border rounded-sm transition-all duration-300 hover:shadow-lg group cursor-pointer
                                                flex flex-col justify-between min-h-[140px]
                                                ${getStatusColor(plot, occupants)}
                                            `}
                                        >
                                            <div className="flex justify-between items-start">
                                                <span className="font-serif font-bold text-lg opacity-80">{plot.plot_number}</span>
                                                <Badge variant="outline" className="bg-white/50 text-xs border-stone-400">
                                                    {getStatusLabel(plot, occupants)}
                                                </Badge>
                                            </div>
                                            
                                            <div className="text-xs space-y-1 mt-2">
                                                <div className="font-medium opacity-70 uppercase tracking-wide">{plot.section}</div>
                                                {occupants.length > 0 && (
                                                    <div className="font-serif italic truncate">{occupants[0].last_name}</div>
                                                )}
                                                {occupants.length > 1 && (
                                                    <div className="text-[10px] opacity-70">+{occupants.length - 1} more</div>
                                                )}
                                                {plot.status === 'available' && (
                                                    <div className="text-teal-700 font-bold mt-1">
                                                        Donation: ${plot.donation_amount || 'TBD'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </DialogTrigger>
                                    <DialogContent className="font-serif max-w-md">
                                        <DialogHeader>
                                            <DialogTitle className="text-2xl text-teal-800 border-b pb-2">Plot {plot.section}-{plot.plot_number}</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="flex justify-center p-4 bg-white rounded-lg border border-stone-100 shadow-inner">
                                                <QRCode value={`https://unionsprings.com/plots/${plot.id}`} size={120} />
                                            </div>
                                            <div className="text-center text-sm text-stone-500">Scan for direct navigation</div>
                                            
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="block font-bold text-stone-700">Status</span>
                                                    {plot.status.charAt(0).toUpperCase() + plot.status.slice(1)}
                                                </div>
                                                <div>
                                                    <span className="block font-bold text-stone-700">Capacity</span>
                                                    {plot.current_occupancy} / {plot.capacity || 1}
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="block font-bold text-stone-700">Occupants</span>
                                                    {occupants.length > 0 ? (
                                                        <ul className="list-disc pl-4 mt-1 space-y-1">
                                                            {occupants.map(occ => (
                                                                <li key={occ.id}>
                                                                    {occ.first_name} {occ.last_name} 
                                                                    {occ.burial_type === 'Urn' && ' (Urn)'}
                                                                    {occ.veteran_status && ' 🎖️'}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : "None"}
                                                </div>
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            );
                        }) : (
                            <div className="col-span-full flex flex-col items-center justify-center h-64 text-stone-400">
                                <p>No plots match your criteria.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    // LIST VIEW
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-stone-500 uppercase bg-stone-50 border-b">
                                <tr>
                                    <th className="px-4 py-3">Plot #</th>
                                    <th className="px-4 py-3">Section</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Occupants</th>
                                    <th className="px-4 py-3">Features</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPlots.map((plot) => {
                                    const occupants = getOccupants(plot.section, plot.plot_number);
                                    return (
                                        <tr key={plot.id} className="bg-white border-b hover:bg-stone-50">
                                            <td className="px-4 py-3 font-medium text-stone-900">{plot.plot_number}</td>
                                            <td className="px-4 py-3">{plot.section}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className={`${getStatusColor(plot, occupants)} bg-opacity-20`}>
                                                    {getStatusLabel(plot, occupants)}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                {occupants.map(o => o.last_name).join(', ') || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-stone-500">
                                                {occupants.some(o => o.burial_type === 'Urn') && <span className="mr-2" title="Has Urn">⚱️</span>}
                                                {occupants.some(o => o.veteran_status) && <span title="Veteran">🎖️</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button size="sm" variant="ghost">Details</Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}