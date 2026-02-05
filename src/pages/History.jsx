import React, { useState, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, X, Map as MapIcon, List, Loader2, AlertCircle } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence } from "framer-motion";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { historyTimelineData, footnotes, membershipLists } from "@/components/history/historyData";
import { parseYear, isFuzzyMatch, getFootnotesContent } from "@/components/history/utils";
import HistoryItem from "@/components/history/HistoryItem";
import MembershipItem from "@/components/history/MembershipItem";

// Lazy load heavy map component
const HistoryMap = lazy(() => import('@/components/history/HistoryMap'));

// Loading skeleton for map
const MapSkeleton = () => (
    <div className="w-full h-full flex items-center justify-center bg-stone-100 rounded-2xl">
        <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-2" />
            <p className="text-sm text-stone-500">Loading map...</p>
        </div>
    </div>
);

// Error boundary component
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <h3 className="text-lg font-semibold text-stone-800 mb-2">Something went wrong</h3>
                    <p className="text-stone-600 mb-4">Unable to load this section.</p>
                    <Button variant="outline" onClick={() => this.setState({ hasError: false })}>
                        Try Again
                    </Button>
                </div>
            );
        }
        return this.props.children;
    }
}

// Pre-compute year range once
const { minYear, maxYear } = (() => {
    const years = historyTimelineData.map(item => parseYear(item.year)).filter(y => y > 0);
    return { minYear: Math.min(...years), maxYear: Math.max(...years) };
})();

export default function HistoryPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedId, setSelectedId] = useState(null);
    const [viewMode, setViewMode] = useState("timeline");
    const [dateRange, setDateRange] = useState([minYear, maxYear]);
    const scrollRef = useRef(null);

    // Debounced search for performance
    const [debouncedSearch, setDebouncedSearch] = useState("");
    
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 200);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleNodeClick = useCallback((id) => {
        setSelectedId(prev => prev === id ? null : id);
    }, []);

    const handleSearchChange = useCallback((e) => {
        setSearchQuery(e.target.value);
    }, []);

    const handleClearSearch = useCallback(() => {
        setSearchQuery("");
    }, []);

    const handleViewModeChange = useCallback((val) => {
        if (val) setViewMode(val);
    }, []);

    const handleMapEventSelect = useCallback((id) => {
        setViewMode('timeline');
        setSelectedId(id);
    }, []);

    // Scroll to selected item
    React.useEffect(() => {
        if (selectedId && viewMode === 'timeline') {
            const timer = setTimeout(() => {
                const element = document.getElementById(`timeline-node-${selectedId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [selectedId, viewMode]);

    // Filtered and memoized timeline items
    const visibleItems = useMemo(() => {
        return historyTimelineData.map(item => {
            const itemYear = parseYear(item.year);
            const noteContent = getFootnotesContent(item.text, footnotes);
            const searchableContent = `${item.title} ${item.text} ${noteContent}`;
            
            const matchesSearch = !debouncedSearch || isFuzzyMatch(searchableContent, debouncedSearch);
            const matchesYear = itemYear >= dateRange[0] && itemYear <= dateRange[1];
            const isVisible = matchesSearch && matchesYear;

            return {
                ...item,
                isVisible,
                matchesSearch: debouncedSearch && matchesSearch
            };
        }).filter(item => item.isVisible);
    }, [debouncedSearch, dateRange]);

    const visibleCount = visibleItems.length;

    return (
        <div className="min-h-screen bg-stone-200 flex flex-col overflow-hidden">
            {/* Header Area */}
            <header className="flex-none pt-4 md:pt-8 px-4 sm:px-6 lg:px-8 z-10 bg-stone-200/95 backdrop-blur-sm pb-4 border-b border-stone-300 shadow-sm">
                <div className="max-w-7xl mx-auto w-full flex flex-col gap-4">
                    {/* Title row */}
                    <div className="flex items-center gap-3 md:gap-4">
                        <Link to={createPageUrl('Home')}>
                            <Button variant="ghost" size="icon" className="text-stone-600 hover:text-stone-900 touch-manipulation">
                                <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
                            </Button>
                        </Link>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl md:text-3xl font-serif text-stone-900 truncate">Union Springs History</h1>
                            <p className="text-stone-500 text-xs md:text-sm">A timeline of our heritage</p>
                        </div>
                    </div>
                    
                    {/* Controls row */}
                    <div className="flex flex-col sm:flex-row gap-3 md:gap-6 items-stretch sm:items-center">
                        {/* View toggle */}
                        <ToggleGroup 
                            type="single" 
                            value={viewMode} 
                            onValueChange={handleViewModeChange} 
                            className="bg-stone-300 p-1 rounded-lg self-center sm:self-auto"
                        >
                            <ToggleGroupItem 
                                value="timeline" 
                                size="sm" 
                                className="data-[state=on]:bg-white data-[state=on]:text-stone-900 data-[state=on]:shadow-sm text-xs md:text-sm px-2 md:px-3"
                            >
                                <List className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> Timeline
                            </ToggleGroupItem>
                            <ToggleGroupItem 
                                value="map" 
                                size="sm" 
                                className="data-[state=on]:bg-white data-[state=on]:text-stone-900 data-[state=on]:shadow-sm text-xs md:text-sm px-2 md:px-3"
                            >
                                <MapIcon className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> Map
                            </ToggleGroupItem>
                        </ToggleGroup>

                        {/* Date range slider */}
                        <div className="flex flex-col gap-1 flex-1 sm:max-w-48">
                            <span className="text-[10px] md:text-xs font-semibold text-stone-500 uppercase tracking-wider">
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

                        {/* Search */}
                        <div className="relative flex-1 sm:max-w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" aria-hidden="true" />
                            <Input 
                                placeholder="Search events, names..." 
                                className="pl-9 pr-8 bg-white border-stone-300 focus-visible:ring-teal-600 text-sm"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                aria-label="Search history"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={handleClearSearch}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 touch-manipulation"
                                    aria-label="Clear search"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Results count - visible on search */}
                        {debouncedSearch && (
                            <span className="text-xs text-stone-500 self-center whitespace-nowrap">
                                {visibleCount} result{visibleCount !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-hidden relative">
                <ErrorBoundary>
                    {viewMode === 'timeline' ? (
                        <>
                            {/* Background Line - Desktop only */}
                            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-stone-300 -translate-y-1/2 z-0 hidden md:block" aria-hidden="true" />

                            <div 
                                className="w-full h-full md:overflow-x-auto md:overflow-y-hidden overflow-y-auto overflow-x-hidden md:whitespace-nowrap whitespace-normal z-10 relative custom-scrollbar" 
                                ref={scrollRef}
                            >
                                <div className="flex flex-col md:flex-row md:items-center h-full px-4 md:px-20 gap-4 md:gap-8 md:min-w-max min-w-0 py-6 md:py-12">
                                    
                                    {/* Start Node - Desktop only */}
                                    <div className="relative flex-col items-center justify-center hidden md:flex" aria-hidden="true">
                                        <div className="w-3 h-3 rounded-full bg-stone-400 mb-2" />
                                        <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Start</span>
                                    </div>

                                    {/* Mobile header */}
                                    <div className="md:hidden text-center pb-2 border-b border-stone-300 mb-2">
                                        <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Timeline Start - {minYear}</span>
                                    </div>

                                    <TooltipProvider delayDuration={300}>
                                        <AnimatePresence mode="popLayout">
                                            {visibleItems.map((item) => (
                                                <HistoryItem 
                                                    key={item.id}
                                                    id={`timeline-node-${item.id}`}
                                                    item={item}
                                                    isSelected={selectedId === item.id}
                                                    isMatch={item.matchesSearch}
                                                    searchQuery={debouncedSearch}
                                                    onToggle={handleNodeClick}
                                                    footnotes={footnotes}
                                                />
                                            ))}
                                        </AnimatePresence>
                                    </TooltipProvider>

                                    <MembershipItem 
                                        isSelected={selectedId === 'members'}
                                        onToggle={handleNodeClick}
                                        membershipLists={membershipLists}
                                    />

                                    {/* End Node - Desktop only */}
                                    <div className="relative flex-col items-center justify-center pl-8 hidden md:flex" aria-hidden="true">
                                        <div className="w-3 h-3 rounded-full bg-stone-400 mb-2" />
                                        <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Present</span>
                                    </div>

                                    {/* Mobile footer */}
                                    <div className="md:hidden text-center pt-2 border-t border-stone-300 mt-2">
                                        <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Present Day</span>
                                    </div>
                                </div>
                            </div>

                            {/* No results message */}
                            {visibleCount === 0 && debouncedSearch && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="bg-white/90 rounded-lg p-6 text-center shadow-lg pointer-events-auto">
                                        <Search className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                                        <h3 className="text-lg font-semibold text-stone-800 mb-1">No results found</h3>
                                        <p className="text-stone-600 text-sm mb-3">Try adjusting your search or date range</p>
                                        <Button variant="outline" size="sm" onClick={handleClearSearch}>
                                            Clear Search
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="w-full h-full p-4 md:p-8 overflow-hidden flex items-center justify-center">
                            <div className="w-full max-w-6xl h-full flex gap-4">
                                <div className="flex-1 h-full rounded-2xl overflow-hidden shadow-lg border border-stone-300 bg-stone-100">
                                    <Suspense fallback={<MapSkeleton />}>
                                        <HistoryMap 
                                            events={historyTimelineData} 
                                            dateRange={dateRange}
                                            onEventSelect={handleMapEventSelect}
                                        />
                                    </Suspense>
                                </div>
                            </div>
                        </div>
                    )}
                </ErrorBoundary>
            </main>
            
            {/* Footer / Instructions */}
            <footer className="bg-white border-t border-stone-200 py-2 md:py-3 px-4 md:px-6 text-center text-[10px] md:text-xs text-stone-500">
                {viewMode === 'timeline' ? (
                    <>
                        <span className="hidden md:inline">Scroll horizontally or drag to explore the timeline. </span>
                        <span className="md:hidden">Scroll to explore. </span>
                        Click on a card to view full details.
                    </>
                ) : (
                    <>
                        Explore historical sites on the map. Click markers to view details.
                    </>
                )}
            </footer>
        </div>
    );
}