import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Pencil, Flag, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import DeceasedEditDialog from './DeceasedEditDialog';

export default function DeceasedManager() {
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedDeceased, setSelectedDeceased] = useState(null);
    const [mode, setMode] = useState('create');

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
        keepPreviousData: true
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
                            <Badge variant="outline" className="text-teal-700 border-teal-200 bg-teal-50">
                                {searchResults?.stats?.total_records || 0} Total Records
                            </Badge>
                            <Badge variant="outline" className="text-stone-600 border-stone-200 bg-stone-50">
                                {searchResults?.stats?.total_obituaries || 0} Obituaries
                            </Badge>
                        </div>
                    </CardDescription>
                </div>
                <Button onClick={handleCreate} className="bg-teal-600 hover:bg-teal-700 text-white">
                    <Plus className="w-4 h-4 mr-2" /> Add Record
                </Button>
            </CardHeader>
            <CardContent>
                <div className="flex items-center mb-6">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-500" />
                        <Input
                            placeholder="Search by name or plot..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
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