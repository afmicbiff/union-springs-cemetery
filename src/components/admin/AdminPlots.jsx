import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText } from 'lucide-react';
import { format } from 'date-fns';
import AdminPlotMap from "./AdminPlotMap";

export default function AdminPlots() {
    const { data: plots } = useQuery({
        queryKey: ['plots-admin-list'],
        queryFn: () => base44.entities.Plot.list(),
        initialData: [],
    });

    const [selected, setSelected] = React.useState([]);
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [sectionFilter, setSectionFilter] = React.useState('all');
    const [bulkStatus, setBulkStatus] = React.useState('');
    const [quickView, setQuickView] = React.useState(null);

    const sections = React.useMemo(() => {
        const s = new Set((plots || []).map(p => String(p.section || '').trim()).filter(Boolean));
        return Array.from(s).sort();
    }, [plots]);

    const filteredPlots = React.useMemo(() => {
        return (plots || []).filter(p => {
            const sOk = statusFilter === 'all' || p.status === statusFilter;
            const secOk = sectionFilter === 'all' || String(p.section || '') === sectionFilter;
            return sOk && secOk;
        });
    }, [plots, statusFilter, sectionFilter]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Plot Inventory</CardTitle>
                <CardDescription>Manage capacity (urns/caskets), liners/vaults, and status.</CardDescription>
            </CardHeader>
            <CardContent>
                {/* Filters & Bulk Actions */}
                <div className="flex flex-col gap-3 mb-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-stone-600">Status</span>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-8 w-44">
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    {['Available','Pending Reservation','Reserved','Occupied','Veteran','Unavailable','Unknown','Not Usable'].map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-stone-600">Section</span>
                            <Select value={sectionFilter} onValueChange={setSectionFilter}>
                                <SelectTrigger className="h-8 w-44">
                                    <SelectValue placeholder="All sections" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    {sections.map(sec => (
                                        <SelectItem key={sec} value={sec}>{sec}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button variant="ghost" onClick={() => { setStatusFilter('all'); setSectionFilter('all'); }}>Clear</Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-stone-600">Bulk update status for {selected.length} selected:</span>
                        <Select value={bulkStatus} onValueChange={setBulkStatus}>
                            <SelectTrigger className="h-8 w-56">
                                <SelectValue placeholder="Choose new status" />
                            </SelectTrigger>
                            <SelectContent>
                                {['Available','Pending Reservation','Reserved','Occupied','Veteran','Unavailable','Unknown','Not Usable'].map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            disabled={!bulkStatus || selected.length === 0}
                            onClick={async () => {
                                await Promise.all(selected.map(id => base44.entities.Plot.update(id, { status: bulkStatus })));
                                setSelected([]);
                                // simple refetch by reloading query - rely on cache keys
                                window.location.reload();
                            }}
                            className="bg-teal-700 hover:bg-teal-800 text-white h-8"
                        >
                            Update Status
                        </Button>
                    </div>
                </div>

                <div className="rounded-md border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-stone-50 text-stone-600 font-medium border-b">
                                <tr>
                                    <th className="p-4 w-8">
                                        <input
                                            type="checkbox"
                                            aria-label="Select all"
                                            checked={selected.length > 0 && selected.length === filteredPlots.length}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelected(filteredPlots.map(p => p.id));
                                                else setSelected([]);
                                            }}
                                        />
                                    </th>
                                    <th className="p-4 whitespace-nowrap">Location</th>
                                    <th className="p-4 whitespace-nowrap">Status</th>
                                    <th className="p-4 whitespace-nowrap hidden sm:table-cell">Capacity</th>
                                    <th className="p-4 whitespace-nowrap hidden md:table-cell">Occupancy</th>
                                    <th className="p-4 whitespace-nowrap hidden lg:table-cell">Last Maint.</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredPlots.map(plot => (
                                    <tr key={plot.id} className="hover:bg-stone-50">
                                        <td className="p-4 w-8">
                                            <input
                                                type="checkbox"
                                                checked={selected.includes(plot.id)}
                                                onChange={(e) => {
                                                    setSelected(prev => e.target.checked ? [...new Set([...prev, plot.id])] : prev.filter(id => id !== plot.id));
                                                }}
                                            />
                                        </td>
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
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setQuickView(plot)}>
                                                <FileText className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Visual Map */}
                <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-semibold text-stone-800">Visual Map</h3>
                        <span className="text-xs text-stone-500">Click a plot to view details</span>
                    </div>
                    <div className="rounded-md border p-4 bg-white">
                        <AdminPlotMap plots={filteredPlots} onSelect={(p) => setQuickView(p)} />
                    </div>
                </div>

                {/* Quick View Dialog */}
                <Dialog open={!!quickView} onOpenChange={(o) => { if (!o) setQuickView(null); }}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Plot Details</DialogTitle>
                        </DialogHeader>
                        {quickView && (
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <div className="text-xs text-stone-500">Section</div>
                                    <div className="font-medium">{quickView.section || '-'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-stone-500">Row</div>
                                    <div className="font-medium">{quickView.row_number || '-'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-stone-500">Plot #</div>
                                    <div className="font-medium">{quickView.plot_number || '-'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-stone-500">Status</div>
                                    <div className="font-medium">{quickView.status || '-'}</div>
                                </div>
                                <div className="col-span-2">
                                    <div className="text-xs text-stone-500">Owner / Occupant</div>
                                    <div className="font-medium">{[quickView.first_name, quickView.last_name].filter(Boolean).join(' ') || quickView.family_name || '-'}</div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

            </CardContent>
        </Card>
    );
}