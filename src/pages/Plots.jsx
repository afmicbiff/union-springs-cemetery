import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Map, Grid, Info } from 'lucide-react';

export default function PlotsPage() {
  const [activeSection, setActiveSection] = useState("all");

  const { data: plots, isLoading } = useQuery({
    queryKey: ['plots'],
    queryFn: () => base44.entities.Plot.list({ limit: 100 }),
    initialData: [],
  });

  // Filter plots based on active tab
  const filteredPlots = activeSection === "all" 
    ? plots 
    : plots.filter(plot => plot.section === activeSection);

  // Group plots for the "map" visualization
  const sections = ["North", "South", "East", "West", "Garden of Peace", "Old Historic"];

  return (
    <div className="min-h-screen bg-stone-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1240px] mx-auto space-y-8">
        
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl md:text-5xl font-serif text-stone-900">Plots & Grounds</h1>
          <p className="text-stone-600 max-w-2xl mx-auto text-lg">
            Explore our available spaces and historic grounds. Select a section to view availability.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Filters */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-slate-50 border-none shadow-md">
              <CardHeader>
                <CardTitle className="font-serif text-xl text-stone-800 flex items-center gap-2">
                  <Map className="w-5 h-5 text-teal-600" /> Sections
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                    variant={activeSection === "all" ? "default" : "ghost"} 
                    className={`w-full justify-start font-serif ${activeSection === 'all' ? 'bg-teal-700 text-white' : 'text-stone-600 hover:bg-stone-200'}`}
                    onClick={() => setActiveSection("all")}
                >
                    View All
                </Button>
                {sections.map(section => (
                  <Button 
                    key={section}
                    variant={activeSection === section ? "default" : "ghost"} 
                    className={`w-full justify-start font-serif ${activeSection === section ? 'bg-teal-700 text-white' : 'text-stone-600 hover:bg-stone-200'}`}
                    onClick={() => setActiveSection(section)}
                  >
                    {section}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-slate-50 border-none shadow-md">
                <CardHeader>
                    <CardTitle className="font-serif text-lg text-stone-800">Legend</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-sm bg-stone-300 border border-stone-400"></div>
                        <span className="text-sm text-stone-600">Available</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-sm bg-red-100 border border-red-300"></div>
                        <span className="text-sm text-stone-600">Occupied</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-sm bg-teal-100 border border-teal-300"></div>
                        <span className="text-sm text-stone-600">Reserved</span>
                    </div>
                </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-sm shadow-md p-6 min-h-[600px]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPlots.length > 0 ? filteredPlots.map((plot) => (
                        <div 
                            key={plot.id} 
                            className={`
                                relative p-4 border rounded-sm transition-all duration-300 hover:shadow-lg group cursor-pointer
                                ${plot.status === 'available' ? 'bg-stone-50 border-stone-200 hover:border-teal-500' : ''}
                                ${plot.status === 'occupied' ? 'bg-red-50 border-red-100 opacity-80' : ''}
                                ${plot.status === 'reserved' ? 'bg-teal-50 border-teal-200' : ''}
                            `}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-serif font-bold text-stone-800 text-lg">{plot.plot_number}</span>
                                <Badge variant="outline" className={`
                                    capitalize
                                    ${plot.status === 'available' ? 'border-stone-400 text-stone-600' : ''}
                                    ${plot.status === 'occupied' ? 'border-red-300 text-red-700 bg-red-100' : ''}
                                    ${plot.status === 'reserved' ? 'border-teal-300 text-teal-700 bg-teal-100' : ''}
                                `}>
                                    {plot.status}
                                </Badge>
                            </div>
                            
                            <div className="text-sm text-stone-500 space-y-1">
                                <p>Sec: <span className="font-semibold text-stone-700">{plot.section}</span></p>
                                <p>Row: <span className="font-semibold text-stone-700">{plot.row_number}</span></p>
                                {plot.price && plot.status === 'available' && (
                                    <p className="text-teal-700 font-bold mt-2">${plot.price.toLocaleString()}</p>
                                )}
                            </div>

                            {plot.status === 'available' && (
                                <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm border-t border-stone-100">
                                    <Button size="sm" className="w-full bg-teal-700 hover:bg-teal-800 text-white font-serif text-xs">
                                        Inquire
                                    </Button>
                                </div>
                            )}
                        </div>
                    )) : (
                        <div className="col-span-full flex flex-col items-center justify-center h-64 text-stone-400">
                            <Grid className="w-12 h-12 mb-4 opacity-20" />
                            <p className="font-serif">No plots found in this section.</p>
                        </div>
                    )}
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}