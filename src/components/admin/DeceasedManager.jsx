import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Pencil, Flag, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from "sonner";
import PaginationControls from "@/components/ui/PaginationControls";
const DeceasedEditDialog = React.lazy(() => import('./DeceasedEditDialog'));
import AdvancedDateFilter from "@/components/common/AdvancedDateFilter";
import SavedSearchManager from "@/components/common/SavedSearchManager";

export default function DeceasedManager() {
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('Deceased');
    const [dateFilters, setDateFilters] = useState({});
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedDeceased, setSelectedDeceased] = useState(null);
    const [mode, setMode] = useState('create');
    const [isCleaning, setIsCleaning] = useState(false);
    const [page, setPage] = useState(1);
    const limit = 50;
    const queryClient = useQueryClient();
    
    // Refs for synced horizontal scrollbars
    const topScrollRef = useRef(null);
    const tableScrollRef = useRef(null);
    const tableRef = useRef(null);
    const [tableWidth, setTableWidth] = useState(800);
    const isScrolling = useRef(false);

    // Sync scroll positions between top scrollbar and table
    const handleTopScroll = useCallback(() => {
        if (isScrolling.current) return;
        isScrolling.current = true;
        if (tableScrollRef.current && topScrollRef.current) {
            tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
        }
        requestAnimationFrame(() => { isScrolling.current = false; });
    }, []);

    const handleTableScroll = useCallback(() => {
        if (isScrolling.current) return;
        isScrolling.current = true;
        if (topScrollRef.current && tableScrollRef.current) {
            topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
        }
        requestAnimationFrame(() => { isScrolling.current = false; });
    }, []);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Reset to page 1 on search change
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const { data: searchResults, isLoading } = useQuery({
        queryKey: ['deceased-admin-search', debouncedSearch, statusFilter, dateFilters, page],
        queryFn: async () => {
            const response = await base44.functions.invoke('searchDeceased', {
                query: debouncedSearch,
                status_filter: statusFilter,
                ...dateFilters,
                page,
                limit
            });
            return response.data;
        },
        placeholderData: keepPreviousData,
        staleTime: 5 * 60_000,
        gcTime: 15 * 60_000,
        refetchOnWindowFocus: false,
        select: (data) => {
            if (!data) return data;
            return {
                ...data,
                results: (data.results || []).map(r => ({
                    id: r.id,
                    first_name: r.first_name,
                    last_name: r.last_name,
                    family_name: r.family_name,
                    date_of_birth: r.date_of_birth,
                    date_of_death: r.date_of_death,
                    plot_location: r.plot_location,
                    entity_type: r.entity_type,
                    burial_type: r.burial_type,
                    veteran_status: r.veteran_status,
                    status: r.status,
                    obituary: !!r.obituary,
                })),
            };
        },
    });

    const handleApplySavedSearch = (filters) => {
        if (filters.query) setSearch(filters.query);
        if (filters.status_filter) setStatusFilter(filters.status_filter);
        if (filters.birth_year_min || filters.birth_year_max || filters.death_year_min || filters.death_year_max) {
            setDateFilters({
                birth_year_min: filters.birth_year_min,
                birth_year_max: filters.birth_year_max,
                death_year_min: filters.death_year_min,
                death_year_max: filters.death_year_max
            });
        }
        setPage(1);
    };

    const currentFiltersForSave = {
        query: search,
        status_filter: statusFilter,
        ...dateFilters
    };

    const filteredList = useMemo(() => {
        const arr = searchResults?.results || [];
        return arr.slice().sort((a, b) => {
            const nameA = (a.last_name || '').toLowerCase();
            const nameB = (b.last_name || '').toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });
    }, [searchResults?.results]);

    // Measure table width for top scrollbar
    useEffect(() => {
        if (tableRef.current) {
            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    setTableWidth(entry.target.scrollWidth);
                }
            });
            resizeObserver.observe(tableRef.current);
            return () => resizeObserver.disconnect();
        }
    }, [searchResults?.results]);

    const handleEdit = (record) => {
        setSelectedDeceased(record);
        setMode('edit');
        setIsEditOpen(true);
    };

    const handleCreate = () => {
        setSelectedDeceased(null);
        setMode('create');
        setIsEditOpen(true);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                <div className="space-y-1.5">
                    <CardTitle>Deceased Records</CardTitle>
                    <CardDescription>
                        Manage deceased individuals, obituaries, and burial details.
                        <div className="flex gap-1.5 sm:gap-2 mt-2 flex-wrap">
                            <Badge 
                                variant={statusFilter === 'Deceased' ? "default" : "outline"} 
                                className={`cursor-pointer transition-all text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-0.5 ${statusFilter === 'Deceased' ? 'bg-teal-700 hover:bg-teal-800' : 'text-teal-700 border-teal-200 bg-teal-50 hover:bg-teal-100'}`}
                                onClick={() => { setStatusFilter('Deceased'); setPage(1); }}
                            >
                                {isLoading && !searchResults ? '...' : (searchResults?.stats?.total_records || 0)} Deceased
                            </Badge>
                            <Badge 
                                variant={statusFilter === 'All' ? "default" : "outline"}
                                className={`cursor-pointer transition-all text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-0.5 ${statusFilter === 'All' ? 'bg-stone-700 hover:bg-stone-800' : 'text-stone-600 border-stone-200 bg-stone-50 hover:bg-stone-100'}`}
                                onClick={() => { setStatusFilter('All'); setPage(1); }}
                            >
                                All
                            </Badge>
                            <Badge 
                                variant={statusFilter === 'Reserved' ? "default" : "outline"}
                                className={`cursor-pointer transition-all text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-0.5 ${statusFilter === 'Reserved' ? 'bg-amber-700 hover:bg-amber-800' : 'text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100'}`}
                                onClick={() => { setStatusFilter('Reserved'); setPage(1); }}
                            >
                                {isLoading && !searchResults ? '...' : (searchResults?.stats?.total_reserved || 0)} Reserved
                            </Badge>
                            <Badge 
                                variant={statusFilter === 'Available' ? "default" : "outline"}
                                className={`cursor-pointer transition-all text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-0.5 ${statusFilter === 'Available' ? 'bg-emerald-700 hover:bg-emerald-800' : 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'}`}
                                onClick={() => { setStatusFilter('Available'); setPage(1); }}
                            >
                                {isLoading && !searchResults ? '...' : (searchResults?.stats?.total_available || 0)} Available
                            </Badge>
                            <Badge 
                                variant={statusFilter === 'Veteran' ? "default" : "outline"}
                                className={`cursor-pointer transition-all text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-0.5 ${statusFilter === 'Veteran' ? 'bg-blue-700 hover:bg-blue-800' : 'text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100'}`}
                                onClick={() => { setStatusFilter('Veteran'); setPage(1); }}
                            >
                                {isLoading && !searchResults ? '...' : (searchResults?.stats?.total_veterans || 0)} Veterans
                            </Badge>
                            <Badge 
                                variant={statusFilter === 'Not Usable' ? "default" : "outline"}
                                className={`cursor-pointer transition-all text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-0.5 hidden sm:inline-flex ${statusFilter === 'Not Usable' ? 'bg-gray-700 hover:bg-gray-800' : 'text-gray-700 border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
                                onClick={() => { setStatusFilter('Not Usable'); setPage(1); }}
                            >
                                {isLoading && !searchResults ? '...' : (searchResults?.stats?.total_not_usable || 0)} Not Usable
                            </Badge>
                            <Badge 
                                variant={statusFilter === 'Unknown' ? "default" : "outline"}
                                className={`cursor-pointer transition-all text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-0.5 hidden sm:inline-flex ${statusFilter === 'Unknown' ? 'bg-purple-700 hover:bg-purple-800' : 'text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100'}`}
                                onClick={() => { setStatusFilter('Unknown'); setPage(1); }}
                            >
                                {isLoading && !searchResults ? '...' : (searchResults?.stats?.total_unknown || 0)} Unknown
                            </Badge>
                        </div>
                    </CardDescription>
                </div>
                </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                    <div className="relative w-full sm:max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-500" />
                        <Input
                            placeholder="Search by name or plot..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                        <AdvancedDateFilter 
                            filters={dateFilters} 
                            onChange={(newFilters) => { setDateFilters(newFilters); setPage(1); }} 
                        />
                        <SavedSearchManager 
                            type="deceased"
                            currentFilters={currentFiltersForSave}
                            onApplySearch={handleApplySavedSearch}
                        />
                        <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => { setSearch(''); setStatusFilter('All'); setDateFilters({}); setPage(1); }}
                            className="text-stone-600 border-stone-200 hover:bg-stone-50"
                        >
                            Reset
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50 hidden md:flex"
                            onClick={async () => {
                                if (confirm("Are you sure you want to delete duplicate deceased records? This will keep the most complete record for each person and delete duplicates. This action cannot be undone.")) {
                                    setIsCleaning(true);
                                    try {
                                        const res = await base44.functions.invoke('cleanupDeceasedDuplicates');
                                        if (res.data.error) throw new Error(res.data.error);
                                        toast.success(res.data.message);
                                        queryClient.invalidateQueries({ queryKey: ['deceased-admin-search'] });
                                    } catch (err) {
                                        console.error(err);
                                        toast.error("Cleanup failed: " + err.message);
                                    } finally {
                                        setIsCleaning(false);
                                    }
                                }
                            }}
                            disabled={isCleaning}
                        >
                            {isCleaning ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
                            <span className="hidden lg:inline">Cleanup</span>
                        </Button>
                        <Button onClick={handleCreate} size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
                            <Plus className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Add Record</span>
                        </Button>
                    </div>
                </div>

                <div className="rounded-md border overflow-hidden">
                    {/* Top scrollbar for mobile - syncs with table scroll */}
                    <div 
                        className="overflow-x-auto md:hidden border-b border-stone-200"
                        ref={topScrollRef}
                        onScroll={handleTopScroll}
                        style={{ height: '16px' }}
                    >
                        <div style={{ width: tableWidth, height: '1px' }} />
                    </div>
                    <div 
                        className="overflow-x-auto"
                        ref={tableScrollRef}
                        onScroll={handleTableScroll}
                    >
                        <table className="w-full text-sm text-left" ref={tableRef}>
                            <thead className="bg-stone-50 text-stone-600 font-medium border-b sticky top-0 z-10">
                                <tr>
                                    <th className="p-4 whitespace-nowrap min-w-[140px]">Name</th>
                                    <th className="p-4 whitespace-nowrap min-w-[160px]">Dates</th>
                                    <th className="p-4 whitespace-nowrap min-w-[120px]">Location</th>
                                    <th className="p-4 whitespace-nowrap">Type</th>
                                    <th className="p-4 whitespace-nowrap">Attributes</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {isLoading ? (
                                    <tr><td colSpan="6" className="p-8 text-center text-stone-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Searching records...</td></tr>
                                ) : filteredList.length === 0 ? (
                                    <tr><td colSpan="6" className="p-8 text-center text-stone-500">No records found.</td></tr>
                                ) : (
                                    filteredList.map(record => (
                                        <tr key={record.id} className="hover:bg-stone-50">
                                            <td className="p-4 font-medium">
                                                {record.entity_type === 'plot' && !record.first_name ? (
                                                    <span className="italic text-stone-400">Empty Plot</span>
                                                ) : (
                                                    <div>{record.first_name} {record.last_name}</div>
                                                )}
                                                {record.family_name && <div className="text-xs text-stone-500">née {record.family_name}</div>}
                                            </td>
                                            <td className="p-4 text-stone-600 min-w-[160px]">
                                                <div className="text-sm whitespace-nowrap">
                                                    <span className="text-stone-400">Birth:</span> {(() => {
                                                        if (!record.date_of_birth) return '-';
                                                        const d = new Date(record.date_of_birth);
                                                        return isNaN(d.getTime()) ? record.date_of_birth : format(d, 'MMM d, yyyy');
                                                    })()}
                                                </div>
                                                <div className="text-sm whitespace-nowrap">
                                                    <span className="text-stone-400">Death:</span> {(() => {
                                                        if (!record.date_of_death) return '-';
                                                        const d = new Date(record.date_of_death);
                                                        return isNaN(d.getTime()) ? record.date_of_death : format(d, 'MMM d, yyyy');
                                                    })()}
                                                </div>
                                            </td>
                                            <td className="p-4">{record.plot_location || '-'}</td>
                                            <td className="p-4">
                                                {record.entity_type === 'plot' ? (
                                                    <Badge variant="outline" className="text-xs font-normal bg-stone-50">
                                                        Plot
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-xs font-normal">
                                                        {record.burial_type || 'Deceased'}
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {record.veteran_status && (
                                                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 gap-1 mr-1">
                                                        <Flag className="w-3 h-3" /> Veteran
                                                    </Badge>
                                                )}
                                                {record.entity_type === 'plot' && record.status && (
                                                    <Badge variant="outline" className={`
                                                        ${record.status === 'Available' ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : ''}
                                                        ${record.status === 'Reserved' ? 'text-amber-700 border-amber-200 bg-amber-50' : ''}
                                                        ${record.status === 'Not Usable' ? 'text-gray-700 border-gray-200 bg-gray-50' : ''}
                                                        ${record.status === 'Unknown' ? 'text-purple-700 border-purple-200 bg-purple-50' : ''}
                                                    `}>
                                                        {record.status}
                                                    </Badge>
                                                )}
                                                {record.obituary && (
                                                     <Badge variant="outline" className="ml-2 border-stone-300 text-stone-500">
                                                        Obituary
                                                     </Badge>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <Button size="sm" variant="ghost" onClick={() => handleEdit(record)}>
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        </div>
                        </div>
                        {searchResults?.pagination && (
                        <PaginationControls
                        currentPage={searchResults.pagination.page}
                        totalPages={searchResults.pagination.totalPages}
                        totalRecords={searchResults.pagination.total}
                        limit={limit}
                        onPageChange={setPage}
                        />
                        )}
                        </CardContent>

            <React.Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>}>
                {isEditOpen && (
                    <DeceasedEditDialog 
                        isOpen={isEditOpen} 
                        onClose={() => setIsEditOpen(false)} 
                        deceased={selectedDeceased} 
                        mode={mode} 
                    />
                )}
            </React.Suspense>
        </Card>
    );
}