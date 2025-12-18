import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, X, Map as MapIcon, List, LayoutGrid } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence } from "framer-motion";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { historyTimelineData, footnotes, membershipLists } from "@/components/history/historyData";
import { parseYear, isFuzzyMatch, getFootnotesContent } from "@/components/history/utils";
import HistoryItem from "@/components/history/HistoryItem";
import MembershipItem from "@/components/history/MembershipItem";
import HistoryMap from "@/components/history/HistoryMap";

export default function HistoryPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedId, setSelectedId] = useState(null);
    const [viewMode, setViewMode] = useState("timeline"); // timeline, map
    const scrollRef = useRef(null);

    const { minYear, maxYear } = React.useMemo(() => {
        const years = historyTimelineData.map(item => parseYear(item.year)).filter(y => y > 0);
        return { minYear: Math.min(...years), maxYear: Math.max(...years) };
    }, []);

    const [dateRange, setDateRange] = useState([minYear, maxYear]);

    const handleNodeClick = React.useCallback((id) => {
        setSelectedId(prev => prev === id ? null : id);
    }, []);

    // Scroll to selected item when selection changes and we are in timeline view
    React.useEffect(() => {
        if (selectedId && viewMode === 'timeline') {
            // Small timeout to allow render/expansion to complete or start
            setTimeout(() => {
                const element = document.getElementById(`timeline-node-${selectedId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                }
            }, 300);
        }
    }, [selectedId, viewMode]);

    return (
        <div className="min-h-screen bg-stone-200 flex flex-col overflow-hidden">
            {/* Header Area */}
            <div className="flex-none pt-8 px-4 sm:px-6 lg:px-8 z-10 bg-stone-200/90 backdrop-blur-sm pb-4 border-b border-stone-300 shadow-sm">
                <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                         <Link to={createPageUrl('Home')}>
                            <Button variant="ghost" size="icon" className="text-stone-600 hover:text-stone-900">
                                <ArrowLeft className="w-6 h-6" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-serif text-stone-900">Union Springs History</h1>
                            <p className="text-stone-500 text-sm">A timeline of our heritage</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-6 w-full md:w-auto items-center">
                        <ToggleGroup type="single" value={viewMode} onValueChange={(val) => val && setViewMode(val)} className="bg-stone-300 p-1 rounded-lg">
                            <ToggleGroupItem value="timeline" size="sm" className="data-[state=on]:bg-white data-[state=on]:text-stone-900 data-[state=on]:shadow-sm">
                                <List className="w-4 h-4 mr-2" /> Timeline
                            </ToggleGroupItem>
                            <ToggleGroupItem value="map" size="sm" className="data-[state=on]:bg-white data-[state=on]:text-stone-900 data-[state=on]:shadow-sm">
                                <MapIcon className="w-4 h-4 mr-2" /> Map
                            </ToggleGroupItem>
                        </ToggleGroup>

                        <div className="flex flex-col gap-1 w-full sm:w-48">
                            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                                Period: {dateRange[0]} - {dateRange[1]}
                            </span>
                            <Slider
                                defaultValue={[minYear, maxYear]}
                                min={minYear}
                                max={maxYear}
                                step={1}
                                value={dateRange}
                                onValueChange={setDateRange}
                                className="w-full"
                            />
                        </div>

                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                            <Input 
                                placeholder="Search..." 
                                className="pl-9 bg-white border-stone-300 focus-visible:ring-teal-600"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {viewMode === 'timeline' ? (
                    <>
                         {/* Background Line */}
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-stone-300 -translate-y-1/2 z-0" />

                        <div className="w-full h-full overflow-x-auto overflow-y-hidden whitespace-nowrap z-10 relative custom-scrollbar" ref={scrollRef}>
                            <div className="flex items-center h-full px-10 md:px-20 gap-8 min-w-max py-12">
                                
                                {/* Start Node */}
                                <div className="relative flex flex-col items-center justify-center">
                                    <div className="w-3 h-3 rounded-full bg-stone-400 mb-2" />
                                    <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Start</span>
                                </div>

                                <TooltipProvider>
                                    <AnimatePresence>
                                        {historyTimelineData.map((item) => {
                                            const itemYear = parseYear(item.year);
                                            
                                            // Enhanced Search Logic
                                            const noteContent = getFootnotesContent(item.text, footnotes);
                                            const searchableContent = `${item.title} ${item.text} ${noteContent}`;
                                            
                                            const matchesSearch = !searchQuery || isFuzzyMatch(searchableContent, searchQuery);
                                            const matchesYear = itemYear >= dateRange[0] && itemYear <= dateRange[1];
                                            
                                            const isVisible = matchesSearch && matchesYear;

                                            if (!isVisible) return null;

                                            return (
                                                <HistoryItem 
                                                    key={item.id}
                                                    id={`timeline-node-${item.id}`}
                                                    item={item}
                                                    isSelected={selectedId === item.id}
                                                    isMatch={searchQuery && matchesSearch}
                                                    searchQuery={searchQuery}
                                                    onToggle={handleNodeClick}
                                                    footnotes={footnotes}
                                                />
                                            );
                                        })}
                                    </AnimatePresence>
                                </TooltipProvider>

                                <MembershipItem 
                                    isSelected={selectedId === 'members'}
                                    onToggle={handleNodeClick}
                                    membershipLists={membershipLists}
                                />


                                {/* End Node */}
                                <div className="relative flex flex-col items-center justify-center pl-8">
                                    <div className="w-3 h-3 rounded-full bg-stone-400 mb-2" />
                                    <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Present</span>
                                </div>

                            </div>
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full p-4 md:p-8 overflow-hidden flex items-center justify-center">
                        <div className="w-full max-w-6xl h-full flex gap-4">
                            <div className="flex-1 h-full rounded-2xl overflow-hidden shadow-lg border border-stone-300 bg-stone-100">
                                <HistoryMap 
                                    events={historyTimelineData} 
                                    dateRange={dateRange}
                                    onEventSelect={(id) => {
                                        // Optional: Switch to timeline mode and select the item?
                                        // For now, let's keep it in map view and maybe show a side panel or just use the popup
                                        // If we want to deep link to the timeline:
                                        setViewMode('timeline');
                                        setSelectedId(id);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Footer / Instructions */}
            <div className="bg-white border-t border-stone-200 py-3 px-6 text-center text-xs text-stone-500">
                {viewMode === 'timeline' ? (
                    <>
                        <span className="hidden md:inline">Scroll horizontally or drag to explore the timeline. </span>
                        Click on a card to view full details.
                    </>
                ) : (
                    <>
                        Explore historical sites on the map. Click markers to view details or jump to the timeline entry.
                    </>
                )}
            </div>
        </div>
    );
}