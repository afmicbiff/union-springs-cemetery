import React from 'react';
import { Search, Filter, Calendar, AlertCircle } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

export default function PlotFilters({ filters, onFilterChange, statusOptions }) {
    
    const handleChange = (key, value) => {
        onFilterChange({ ...filters, [key]: value });
    };

    const handleClear = () => {
        onFilterChange({
            search: '',
            status: 'All',
            needsReview: false,
            birthYearStart: '',
            birthYearEnd: '',
            deathYearStart: '',
            deathYearEnd: ''
        });
    };

    return (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center">
                
                {/* General Search */}
                <div className="relative w-full md:w-1/3">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search grave, name, row..."
                        className="pl-9"
                        value={filters.search}
                        onChange={(e) => handleChange('search', e.target.value)}
                    />
                </div>

                {/* Status Filter */}
                <div className="w-full md:w-auto min-w-[150px]">
                    <Select 
                        value={filters.status} 
                        onValueChange={(val) => handleChange('status', val)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Statuses</SelectItem>
                            {statusOptions.map(status => (
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Needs Review Filter */}
                <div className="flex items-center space-x-2">
                      <Button 
                          variant={filters.needsReview ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => handleChange('needsReview', !filters.needsReview)}
                          className={filters.needsReview ? "bg-red-100 text-red-700 border-red-200 hover:bg-red-200" : "text-gray-600 border-dashed"}
                      >
                          <AlertCircle className={`w-4 h-4 mr-2 ${filters.needsReview ? "fill-current" : ""}`} />
                          Needs Review
                      </Button>
                </div>

                {/* Date Filters Popover */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full md:w-auto text-gray-600 border-dashed">
                            <Calendar className="mr-2 h-4 w-4" />
                            Date Filters
                            {(filters.birthYearStart || filters.deathYearStart) && (
                                <div className="ml-2 w-2 h-2 rounded-full bg-blue-500" />
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none text-gray-900">Birth Year Range</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="grid gap-1">
                                        <Label htmlFor="birthStart" className="text-xs">From</Label>
                                        <Input
                                            id="birthStart"
                                            placeholder="YYYY"
                                            value={filters.birthYearStart}
                                            onChange={(e) => handleChange('birthYearStart', e.target.value)}
                                            className="h-8"
                                        />
                                    </div>
                                    <div className="grid gap-1">
                                        <Label htmlFor="birthEnd" className="text-xs">To</Label>
                                        <Input
                                            id="birthEnd"
                                            placeholder="YYYY"
                                            value={filters.birthYearEnd}
                                            onChange={(e) => handleChange('birthYearEnd', e.target.value)}
                                            className="h-8"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none text-gray-900">Death Year Range</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="grid gap-1">
                                        <Label htmlFor="deathStart" className="text-xs">From</Label>
                                        <Input
                                            id="deathStart"
                                            placeholder="YYYY"
                                            value={filters.deathYearStart}
                                            onChange={(e) => handleChange('deathYearStart', e.target.value)}
                                            className="h-8"
                                        />
                                    </div>
                                    <div className="grid gap-1">
                                        <Label htmlFor="deathEnd" className="text-xs">To</Label>
                                        <Input
                                            id="deathEnd"
                                            placeholder="YYYY"
                                            value={filters.deathYearEnd}
                                            onChange={(e) => handleChange('deathYearEnd', e.target.value)}
                                            className="h-8"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Clear Filters */}
                {(filters.search || filters.status !== 'All' || filters.birthYearStart || filters.deathYearStart) && (
                    <Button variant="ghost" onClick={handleClear} className="text-sm text-gray-500 hover:text-red-600">
                        Clear Filters
                    </Button>
                )}
            </div>
        </div>
    );
}