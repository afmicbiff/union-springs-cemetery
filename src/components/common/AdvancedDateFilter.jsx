import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdvancedDateFilter({ filters, onChange }) {
    const hasActiveFilters = 
        filters.birth_year_min || 
        filters.birth_year_max || 
        filters.death_year_min || 
        filters.death_year_max;

    const handleChange = (key, value) => {
        onChange({ ...filters, [key]: value });
    };

    const clearFilters = () => {
        onChange({
            ...filters,
            birth_year_min: '',
            birth_year_max: '',
            death_year_min: '',
            death_year_max: ''
        });
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={`gap-2 ${hasActiveFilters ? 'border-teal-500 text-teal-700 bg-teal-50' : ''}`}>
                    <Calendar className="w-4 h-4" />
                    Date Filters
                    {hasActiveFilters && <Badge variant="secondary" className="ml-1 h-5 px-1.5 bg-teal-200 text-teal-900">{Object.keys(filters).filter(k => k.includes('year') && filters[k]).length}</Badge>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Date Ranges</h4>
                        {hasActiveFilters && (
                            <button onClick={clearFilters} className="text-xs text-red-500 hover:underline">
                                Reset
                            </button>
                        )}
                    </div>
                    
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <Label className="text-xs text-stone-500">Birth Year Range</Label>
                            <div className="flex items-center gap-2">
                                <Input 
                                    placeholder="From (YYYY)" 
                                    className="h-8 text-sm"
                                    value={filters.birth_year_min || ''}
                                    onChange={(e) => handleChange('birth_year_min', e.target.value)}
                                    type="number"
                                    min="1800"
                                    max="2100"
                                />
                                <span className="text-stone-400">-</span>
                                <Input 
                                    placeholder="To (YYYY)" 
                                    className="h-8 text-sm"
                                    value={filters.birth_year_max || ''}
                                    onChange={(e) => handleChange('birth_year_max', e.target.value)}
                                    type="number"
                                    min="1800"
                                    max="2100"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-stone-500">Death Year Range</Label>
                            <div className="flex items-center gap-2">
                                <Input 
                                    placeholder="From (YYYY)" 
                                    className="h-8 text-sm"
                                    value={filters.death_year_min || ''}
                                    onChange={(e) => handleChange('death_year_min', e.target.value)}
                                    type="number"
                                    min="1800"
                                    max="2100"
                                />
                                <span className="text-stone-400">-</span>
                                <Input 
                                    placeholder="To (YYYY)" 
                                    className="h-8 text-sm"
                                    value={filters.death_year_max || ''}
                                    onChange={(e) => handleChange('death_year_max', e.target.value)}
                                    type="number"
                                    min="1800"
                                    max="2100"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}