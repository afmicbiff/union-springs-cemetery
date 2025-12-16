import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminPlots() {
    const { data: plots } = useQuery({
        queryKey: ['plots-admin-list'],
        queryFn: () => base44.entities.Plot.list({ limit: 100 }),
        initialData: [],
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Plot Inventory</CardTitle>
                <CardDescription>Manage capacity (urns/caskets), liners/vaults, and status.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-stone-50 text-stone-600 font-medium border-b">
                                <tr>
                                    <th className="p-4 whitespace-nowrap">Location</th>
                                    <th className="p-4 whitespace-nowrap">Status</th>
                                    <th className="p-4 whitespace-nowrap hidden sm:table-cell">Capacity</th>
                                    <th className="p-4 whitespace-nowrap hidden md:table-cell">Occupancy</th>
                                    <th className="p-4 whitespace-nowrap hidden lg:table-cell">Last Maint.</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {plots.map(plot => (
                                    <tr key={plot.id} className="hover:bg-stone-50">
                                        <td className="p-4 font-medium">{plot.section}-{plot.plot_number}</td>
                                        <td className="p-4">
                                            <Badge variant="secondary" className={`
                                                whitespace-nowrap
                                                ${plot.status === 'Available' ? 'bg-green-100 text-green-800' : ''}
                                                ${plot.status === 'Reserved' ? 'bg-teal-100 text-teal-800' : ''}
                                                ${plot.status === 'Occupied' ? 'bg-red-100 text-red-800' : ''}
                                                ${plot.status === 'Unavailable' ? 'bg-gray-100 text-gray-800' : ''}
                                            `}>
                                                {plot.status}
                                            </Badge>
                                        </td>
                                        <td className="p-4 hidden sm:table-cell">{plot.capacity || 1} slots</td>
                                        <td className="p-4 hidden md:table-cell">{plot.current_occupancy || 0} filled</td>
                                        <td className="p-4 hidden lg:table-cell text-stone-500">
                                            {plot.last_maintained ? format(new Date(plot.last_maintained), 'MMM d') : '-'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                                <FileText className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}