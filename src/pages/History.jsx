import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, X } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence } from "framer-motion";

import { historyTimelineData, footnotes, membershipLists } from "@/components/history/historyData";
import { parseYear, isFuzzyMatch, getFootnotesContent } from "@/components/history/utils";
import HistoryItem from "@/components/history/HistoryItem";
import MembershipItem from "@/components/history/MembershipItem";

export default function HistoryPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedId, setSelectedId] = useState(null);
    const scrollRef = useRef(null);

    const { minYear, maxYear } = React.useMemo(() => {
        const years = historyTimelineData.map(item => parseYear(item.year)).filter(y => y > 0);
        return { minYear: Math.min(...years), maxYear: Math.max(...years) };
    }, []);

    const [dateRange, setDateRange] = useState([minYear, maxYear]);

    const handleNodeClick = React.useCallback((id) => {
        setSelectedId(prev => prev === id ? null : id);
    }, []);

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
                    
                    <div className="flex flex-col sm:flex-row gap-6 w-full md:w-auto items-center">
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

                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                            <Input 
                                placeholder="Search events & notes..." 
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

            {/* Timeline Area */}
            <div className="flex-1 overflow-hidden relative">
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
            </div>
            
            {/* Footer / Instructions */}
            <div className="bg-white border-t border-stone-200 py-3 px-6 text-center text-xs text-stone-500">
                <span className="hidden md:inline">Scroll horizontally or drag to explore the timeline. </span>
                Click on a card to view full details.
            </div>
        </div>
    );
}