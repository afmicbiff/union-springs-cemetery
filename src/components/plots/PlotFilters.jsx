import React, { memo, useCallback, useState } from 'react';
import { Search, X, SlidersHorizontal, Loader2, ArrowLeft, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const PlotFilters = memo(function PlotFilters({ filters, onFilterChange, statusOptions, backSearchUrl, showBackToSearch, showLocateButton, selectedPlotNum, onLocatePlot }) {
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
            <div className="max-w-7xl mx-auto space-y-3">

                {/* Single row: Back to Search + Locate + Search bar + More Filters */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {showBackToSearch && (
                        <Link to={backSearchUrl} className="inline-flex items-center text-teal-800 hover:text-teal-900 font-medium text-sm shrink-0">
                            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Deceased Search
                        </Link>
                    )}

                    {showLocateButton && selectedPlotNum && (
                        <button
                            onClick={onLocatePlot}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-lg transition-all duration-200 touch-manipulation bg-teal-600 text-white hover:bg-teal-700 animate-pulse ring-2 ring-teal-400 ring-offset-2 shrink-0"
                        >
                            <MapPin className="w-4 h-4" />
                            <span>Click to Locate Grave #{selectedPlotNum}</span>
                        </button>
                    )}

                    {/* Search input */}
                    <div className="relative w-full sm:w-auto sm:min-w-[280px] sm:max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-600" />
                        <Input
                            type="text"
                            placeholder="Search name, plot, row, family..."
                            className="w-full h-10 pl-9 pr-24 text-sm rounded-lg border-2 border-gray-200 focus:border-teal-500 focus:ring-teal-500 shadow-sm placeholder:text-gray-400"
                            value={filters.search}
                            onChange={(e) => handleChange('search', e.target.value)}
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck="false"
                        />
                        {filters.search && (
                            <button
                                onClick={() => handleChange('search', '')}
                                className="absolute right-20 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                                aria-label="Clear search"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                        <div className="absolute right-1 top-1/2 -translate-y-1/2">
                            <Button 
                                className="h-8 px-3 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-md shadow-sm text-sm"
                                disabled={isSearching}
                                onClick={() => {
                                    if (filters.search) {
                                        setIsSearching(true);
                                        window.dispatchEvent(new CustomEvent('plot-locate-search', {
                                            detail: { searchTerm: filters.search }
                                        }));
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

                    {/* More Filters Toggle */}
                    <Button 
                        variant="outline" 
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className={`h-10 px-3 text-sm font-medium border rounded-md transition-colors shrink-0 ${
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

                    {/* Clear All - Only show when filters active */}
                    {hasActiveFilters && (
                        <Button 
                            onClick={handleClear} 
                            variant="ghost"
                            className="h-10 px-3 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md shrink-0"
                        >
                            <X className="h-4 w-4 mr-1" />
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