import React, { memo, useCallback, useState, lazy, Suspense } from 'react';
import { Search, X, SlidersHorizontal, Calendar, Loader2 } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

const SavedSearchManager = lazy(() => import("@/components/common/SavedSearchManager"));

const PlotFilters = memo(function PlotFilters({ filters, onFilterChange, statusOptions }) {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    
    const handleChange = useCallback((key, value) => {
        onFilterChange(prev => ({ ...prev, [key]: value }));
    }, [onFilterChange]);

    const handleClear = () => {
        onFilterChange({
            search: '',
            status: '',
            birthYearStart: '',
            birthYearEnd: '',
            deathYearStart: '',
            deathYearEnd: '',
            owner: '',
            plot: ''
        });
    };

    const hasActiveFilters = filters.search || filters.status || 
        filters.birthYearStart || filters.deathYearStart || 
        filters.owner || filters.plot;

    const hasAdvancedFilters = filters.status || 
        filters.birthYearStart || filters.birthYearEnd || 
        filters.deathYearStart || filters.deathYearEnd;

    return (
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
            <div className="max-w-4xl mx-auto space-y-4">
                
                {/* Main Unified Search - Compact */}
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-600" />
                    <Input
                        type="text"
                        placeholder="Search name, plot, row, family..."
                        className="w-full h-10 pl-10 pr-28 text-sm rounded-lg border-2 border-gray-200 focus:border-teal-500 focus:ring-teal-500 shadow-sm placeholder:text-gray-400"
                        value={filters.search}
                        onChange={(e) => handleChange('search', e.target.value)}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck="false"
                    />
                    
                    {/* Clear button inside search */}
                    {filters.search && (
                        <button
                            onClick={() => handleChange('search', '')}
                            className="absolute right-20 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                            aria-label="Clear search"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                    
                    {/* Search button - triggers locate and blink */}
                    <div className="absolute right-1 top-1/2 -translate-y-1/2">
                        <Button 
                            className="h-8 px-3 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-md shadow-sm text-sm"
                            disabled={isSearching}
                            onClick={() => {
                                if (filters.search) {
                                    setIsSearching(true);
                                    // Dispatch event to locate and blink matching plots
                                    window.dispatchEvent(new CustomEvent('plot-locate-search', {
                                        detail: { searchTerm: filters.search }
                                    }));
                                    // Reset searching state after a short delay
                                    setTimeout(() => setIsSearching(false), 1500);
                                }
                            }}
                        >
                            {isSearching ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                    <span>Searching...</span>
                                </>
                            ) : (
                                <>
                                    <Search className="h-4 w-4 mr-1" />
                                    <span>Search</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Quick Actions Row */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">

                    {/* More Filters Toggle */}
                    <Button 
                        variant="outline" 
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className={`h-8 px-3 text-sm font-medium border rounded-md transition-colors ${
                            showAdvanced || hasAdvancedFilters 
                                ? 'border-teal-500 bg-teal-50 text-teal-700' 
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                    >
                        <SlidersHorizontal className="h-4 w-4 mr-1" />
                        More Filters
                        {hasAdvancedFilters && (
                            <span className="ml-1 w-1.5 h-1.5 rounded-full bg-teal-500" />
                        )}
                    </Button>

                    {/* Saved Searches */}
                    <Suspense fallback={null}>
                        <SavedSearchManager 
                            type="plot" 
                            currentFilters={filters}
                            onApplySearch={(saved) => onFilterChange(prev => ({ ...prev, ...saved }))}
                        />
                    </Suspense>

                    {/* Clear All - Only show when filters active */}
                    {hasActiveFilters && (
                        <Button 
                            onClick={handleClear} 
                            variant="ghost"
                            className="h-11 sm:h-12 px-4 text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                        >
                            <X className="h-5 w-5 mr-1" />
                            Clear All
                        </Button>
                    )}
                </div>

                {/* Advanced Filters Panel - Collapsible */}
                {showAdvanced && (
                    <div className="bg-gray-50 rounded-xl p-4 sm:p-6 border border-gray-200 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            
                            {/* Owner/Family Name */}
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700">Family Name</Label>
                                <Input
                                    placeholder="e.g. Smith, Johnson..."
                                    value={filters.owner || ''}
                                    onChange={(e) => handleChange('owner', e.target.value)}
                                    className="h-12 text-base border-2 border-gray-200 rounded-lg"
                                />
                            </div>

                            {/* Plot Number */}
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700">Plot Number</Label>
                                <Input
                                    placeholder="e.g. 123, 456..."
                                    value={filters.plot || ''}
                                    onChange={(e) => handleChange('plot', e.target.value)}
                                    className="h-12 text-base border-2 border-gray-200 rounded-lg"
                                    inputMode="numeric"
                                />
                            </div>

                            {/* Birth Year Range */}
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700">Birth Year</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        placeholder="From"
                                        value={filters.birthYearStart}
                                        onChange={(e) => handleChange('birthYearStart', e.target.value)}
                                        className="h-12 text-base border-2 border-gray-200 rounded-lg"
                                        inputMode="numeric"
                                    />
                                    <span className="text-gray-400 font-medium">–</span>
                                    <Input
                                        placeholder="To"
                                        value={filters.birthYearEnd}
                                        onChange={(e) => handleChange('birthYearEnd', e.target.value)}
                                        className="h-12 text-base border-2 border-gray-200 rounded-lg"
                                        inputMode="numeric"
                                    />
                                </div>
                            </div>

                            {/* Death Year Range */}
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700">Passing Year</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        placeholder="From"
                                        value={filters.deathYearStart}
                                        onChange={(e) => handleChange('deathYearStart', e.target.value)}
                                        className="h-12 text-base border-2 border-gray-200 rounded-lg"
                                        inputMode="numeric"
                                    />
                                    <span className="text-gray-400 font-medium">–</span>
                                    <Input
                                        placeholder="To"
                                        value={filters.deathYearEnd}
                                        onChange={(e) => handleChange('deathYearEnd', e.target.value)}
                                        className="h-12 text-base border-2 border-gray-200 rounded-lg"
                                        inputMode="numeric"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

export default PlotFilters;