import React, { lazy, Suspense, memo, useCallback } from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Wrench, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const PlotMaintenancePanel = lazy(() => import("./PlotMaintenancePanel"));
const MaintenanceWizard = lazy(() => import("./MaintenanceWizard"));
const AdminPlotMap = lazy(() => import("./AdminPlotMap"));

export default function AdminPlots() {
    const [selectedSource, setSelectedSource] = React.useState('Plot');

    const { data: plotsOld, isLoading: isLoadingOld } = useQuery({
        queryKey: ['plots-admin-list', 'Plot'],
        queryFn: async () => base44.entities.Plot.filter({}, '-updated_date', 500),
        initialData: [],
        enabled: selectedSource === 'Plot',
        staleTime: 5 * 60_000,
        gcTime: 15 * 60_000,
        refetchOnWindowFocus: false,
    });

    const { data: plotsNew, isLoading: isLoadingNew } = useQuery({
        queryKey: ['plots-admin-list', 'NewPlot'],
        queryFn: async () => base44.entities.NewPlot.filter({}, '-updated_date', 500),
        initialData: [],
        enabled: selectedSource === 'NewPlot',
        staleTime: 5 * 60_000,
        gcTime: 15 * 60_000,
        refetchOnWindowFocus: false,
    });

    const plots = React.useMemo(() => selectedSource === 'Plot' ? (plotsOld || []) : (plotsNew || []), [selectedSource, plotsOld, plotsNew]);

    const [selected, setSelected] = React.useState([]);
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [sectionFilter, setSectionFilter] = React.useState('all');
    const [bulkStatus, setBulkStatus] = React.useState('');
    const [quickView, setQuickView] = React.useState(null);
    const [maintenanceFor, setMaintenanceFor] = React.useState(null);
    const [wizardOpen, setWizardOpen] = React.useState(false);
    const queryClient = useQueryClient();

    // Auto-run reservation expiry check hourly
    React.useEffect(() => {
        const run = async () => {
            try { await base44.functions.invoke('checkReservationExpirations', {}); } catch {}
        };
        run();
        const id = setInterval(run, 60 * 60 * 1000);
        return () => clearInterval(id);
    }, []);

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
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <CardTitle>Plot Inventory</CardTitle>
                        <CardDescription>Manage capacity (urns/caskets), liners/vaults, and status.</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                          className={`h-8 text-white ${selectedSource==='Plot' ? 'bg-teal-800' : 'bg-teal-700 hover:bg-teal-800'}`}
                          onClick={() => setSelectedSource('Plot')}
                        >
                          Show Old Plots & Map
                        </Button>
                        <Button
                          className={`h-8 text-white ${selectedSource==='NewPlot' ? 'bg-teal-800' : 'bg-teal-700 hover:bg-teal-800'}`}
                          onClick={() => setSelectedSource('NewPlot')}
                        >
                          Show New Plot Reservations
                        </Button>
                        <Button className="h-8 bg-teal-700 hover:bg-teal-800 text-white" onClick={()=>setWizardOpen(true)}>
                            <Plus className="w-4 h-4 mr-1" /> Add Maintenance
                        </Button>
                    </div>
                </div>
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
                                    {['Available','Reserved','Occupied','Veteran','Unavailable','Unknown','Not Usable'].map(s => (
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
                        <Button variant="outline" className="h-8" onClick={async ()=>{ await base44.functions.invoke('checkReservationExpirations', {}); }}>Run Expiry Check</Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-stone-600">Bulk update status for {selected.length} selected:</span>
                        <Select value={bulkStatus} onValueChange={setBulkStatus}>
                            <SelectTrigger className="h-8 w-56">
                                <SelectValue placeholder="Choose new status" />
                            </SelectTrigger>
                            <SelectContent>
                                {['Available','Reserved','Occupied','Veteran','Unavailable','Unknown','Not Usable'].map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            disabled={!bulkStatus || selected.length === 0}
                            onClick={async () => {
                               const api = selectedSource === 'Plot' ? base44.entities.Plot : base44.entities.NewPlot;
                               await Promise.all(selected.map(id => api.update(id, { status: bulkStatus })));
                               setSelected([]);
                               await queryClient.invalidateQueries({ queryKey: ['plots-admin-list', selectedSource] });
                            }}
                            className="bg-teal-700 hover:bg-teal-800 text-white h-8"
                        >
                            Update Status
                        </Button>
                    </div>
                </div>

                {(isLoadingOld || isLoadingNew) && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-stone-400 mr-2" />
                        <span className="text-stone-500">Loading plots...</span>
                    </div>
                )}

                <div className="rounded-md border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-stone-50 text-stone-600 font-medium border-b">
                                <tr>
                                    <th className="p-2 sm:p-4 w-8">
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
                                    <th className="p-2 sm:p-4 whitespace-nowrap text-xs sm:text-sm">Location</th>
                                    <th className="p-2 sm:p-4 whitespace-nowrap text-xs sm:text-sm">Status</th>
                                    <th className="p-2 sm:p-4 whitespace-nowrap hidden sm:table-cell">Capacity</th>
                                    <th className="p-2 sm:p-4 whitespace-nowrap hidden md:table-cell">Occupancy</th>
                                    <th className="p-2 sm:p-4 whitespace-nowrap hidden lg:table-cell">Last Maint.</th>
                                    <th className="p-2 sm:p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredPlots.slice(0, 100).map(plot => (
                                    <tr key={plot.id} className="hover:bg-stone-50">
                                        <td className="p-2 sm:p-4 w-8">
                                            <input
                                                type="checkbox"
                                                checked={selected.includes(plot.id)}
                                                onChange={(e) => {
                                                    setSelected(prev => e.target.checked ? [...new Set([...prev, plot.id])] : prev.filter(id => id !== plot.id));
                                                }}
                                            />
                                        </td>
                                        <td className="p-2 sm:p-4 font-medium text-xs sm:text-sm">{plot.section}-{plot.plot_number}</td>
                                        <td className="p-2 sm:p-4">
                                            <Badge variant="secondary" className={`
                                                whitespace-nowrap text-xs
                                                ${plot.status === 'Available' ? 'bg-green-100 text-green-800' : ''}
                                                ${plot.status === 'Reserved' ? 'bg-teal-100 text-teal-800' : ''}
                                                ${plot.status === 'Occupied' ? 'bg-red-100 text-red-800' : ''}
                                                ${plot.status === 'Unavailable' ? 'bg-gray-100 text-gray-800' : ''}
                                            `}>
                                                {plot.status}
                                            </Badge>
                                        </td>
                                        <td className="p-2 sm:p-4 hidden sm:table-cell text-xs sm:text-sm">{plot.capacity || 1}</td>
                                        <td className="p-2 sm:p-4 hidden md:table-cell text-xs sm:text-sm">{plot.current_occupancy || 0}</td>
                                        <td className="p-2 sm:p-4 hidden lg:table-cell text-stone-500 text-xs">
                                            {plot.last_maintained ? format(new Date(plot.last_maintained), 'MMM d') : '-'}
                                        </td>
                                        <td className="p-2 sm:p-4 text-right">
                                            <div className="flex justify-end gap-0.5 sm:gap-1">
                                                <Button size="sm" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 p-0" onClick={() => setQuickView(plot)}>
                                                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 p-0" title="Maintenance" onClick={() => setMaintenanceFor({ entity: selectedSource, plot })}>
                                                    <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredPlots.length > 100 && (
                        <div className="p-3 bg-stone-50 border-t text-center text-xs text-stone-500">
                            Showing first 100 of {filteredPlots.length} plots. Use filters to narrow results.
                        </div>
                    )}
                </div>

                {/* Visual Map - Hidden on mobile for performance */}
                <div className="mt-6 hidden md:block">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-semibold text-stone-800">Visual Map</h3>
                        <span className="text-xs text-stone-500">Click a plot to view details</span>
                    </div>
                    <div className="rounded-md border p-4 bg-white">
                        <Suspense fallback={<div className="h-40 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></div>}>
                            <AdminPlotMap plots={filteredPlots.slice(0, 200)} onSelect={(p) => setQuickView(p)} />
                        </Suspense>
                    </div>
                </div>

                {/* Quick View Dialog */}
                <Dialog open={!!quickView} onOpenChange={(o) => { if (!o) setQuickView(null); }}>
                    <DialogContent className="max-w-[95vw] sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Plot Details</DialogTitle>
                        </DialogHeader>
                        {quickView && (
                            <div className="space-y-3">
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
                                <div className="flex justify-end">
                                    <Button size="sm" className="bg-teal-700 hover:bg-teal-800 text-white" onClick={() => { setMaintenanceFor({ entity: selectedSource, plot: quickView }); setQuickView(null); }}>
                                        Add Maintenance
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Maintenance Dialog */}
                <Dialog open={!!maintenanceFor} onOpenChange={(o) => { if (!o) setMaintenanceFor(null); }}>
                    <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Plot Maintenance</DialogTitle>
                        </DialogHeader>
                        {maintenanceFor && (
                            <Suspense fallback={<div className="h-32 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
                                <PlotMaintenancePanel plot={maintenanceFor.plot} entity={maintenanceFor.entity} />
                            </Suspense>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Maintenance Wizard */}
                <Suspense fallback={null}>
                    {wizardOpen && <MaintenanceWizard open={wizardOpen} onOpenChange={setWizardOpen} />}
                </Suspense>

            </CardContent>
        </Card>
    );
}