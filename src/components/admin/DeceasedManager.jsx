import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Pencil, Flag, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from "sonner";
import DeceasedEditDialog from './DeceasedEditDialog';

export default function DeceasedManager() {
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedDeceased, setSelectedDeceased] = useState(null);
    const [mode, setMode] = useState('create');
    const [isCleaning, setIsCleaning] = useState(false);
    const queryClient = useQueryClient();

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const { data: searchResults, isLoading } = useQuery({
        queryKey: ['deceased-admin-search', debouncedSearch],
        queryFn: async () => {
            const response = await base44.functions.invoke('searchDeceased', {
                query: debouncedSearch,
                limit: 100 // Fetch up to 100 matching records
            });
            return response.data;
        },
        placeholderData: keepPreviousData
    });

    const filteredList = (searchResults?.results || []).sort((a, b) => {
        const nameA = (a.last_name || '').toLowerCase();
        const nameB = (b.last_name || '').toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
    });

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
                        <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-teal-700 border-teal-200 bg-teal-50" title={searchResults?.stats?.raw_total ? `Raw Database Records: ${searchResults.stats.raw_total}` : ''}>
                                {isLoading && !searchResults ? '...' : (searchResults?.stats?.total_records || 0)} Deceased
                            </Badge>
                            <Badge variant="outline" className="text-stone-600 border-stone-200 bg-stone-50">
                                {isLoading && !searchResults ? '...' : (
                                    (searchResults?.stats?.total_records || 0) +
                                    (searchResults?.stats?.total_reserved || 0) +
                                    (searchResults?.stats?.total_available || 0) +
                                    (searchResults?.stats?.total_not_usable || 0) +
                                    (searchResults?.stats?.total_unknown || 0)
                                )} All Records
                            </Badge>
                            <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50">
                                {isLoading && !searchResults ? '...' : (searchResults?.stats?.total_reserved || 0)} Reserved Plots
                            </Badge>
                            <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">
                                {isLoading && !searchResults ? '...' : (searchResults?.stats?.total_available || 0)} Available Plots
                            </Badge>
                            <Badge variant="outline" className="text-gray-700 border-gray-200 bg-gray-50">
                                {isLoading && !searchResults ? '...' : (searchResults?.stats?.total_not_usable || 0)} Not Usable
                            </Badge>
                            <Badge variant="outline" className="text-purple-700 border-purple-200 bg-purple-50">
                                {isLoading && !searchResults ? '...' : (searchResults?.stats?.total_unknown || 0)} Unknown
                            </Badge>
                            <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">
                                {isLoading && !searchResults ? '...' : (searchResults?.stats?.total_veterans || 0)} Veterans
                            </Badge>
                        </div>
                    </CardDescription>
                </div>
                </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between mb-6">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-500" />
                        <Input
                            placeholder="Search by name or plot..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline"
                            onClick={() => setSearch('')}
                            className="text-stone-600 border-stone-200 hover:bg-stone-50"
                        >
                            Show All Records
                        </Button>
                        <Button 
                            variant="outline" 
                            className="text-red-600 border-red-200 hover:bg-red-50"
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
                            {isCleaning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                            Cleanup Duplicates
                        </Button>
                        <Button onClick={handleCreate} className="bg-teal-600 hover:bg-teal-700 text-white">
                            <Plus className="w-4 h-4 mr-2" /> Add Record
                        </Button>
                    </div>
                </div>

                <div className="rounded-md border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-stone-50 text-stone-600 font-medium border-b">
                                <tr>
                                    <th className="p-4 whitespace-nowrap">Name</th>
                                    <th className="p-4 whitespace-nowrap">Dates</th>
                                    <th className="p-4 whitespace-nowrap">Location</th>
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
                                                <div>{record.first_name} {record.last_name}</div>
                                                {record.family_name && <div className="text-xs text-stone-500">née {record.family_name}</div>}
                                            </td>
                                            <td className="p-4 text-stone-600">
                                                <div className="text-xs">
                                                    B: {record.date_of_birth ? format(new Date(record.date_of_birth), 'MMM d, yyyy') : '-'}
                                                </div>
                                                <div className="text-xs">
                                                    D: {record.date_of_death ? format(new Date(record.date_of_death), 'MMM d, yyyy') : '-'}
                                                </div>
                                            </td>
                                            <td className="p-4">{record.plot_location || '-'}</td>
                                            <td className="p-4">
                                                <Badge variant="outline" className="text-xs font-normal">
                                                    {record.burial_type}
                                                </Badge>
                                            </td>
                                            <td className="p-4">
                                                {record.veteran_status && (
                                                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 gap-1">
                                                        <Flag className="w-3 h-3" /> Veteran
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
            </CardContent>

            <DeceasedEditDialog 
                isOpen={isEditOpen} 
                onClose={() => setIsEditOpen(false)} 
                deceased={selectedDeceased} 
                mode={mode} 
            />
        </Card>
    );
}