import React, { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Users, Mail, Phone, MapPin, ExternalLink, Download, Layers, Loader2 } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import BulkActionDialog from "@/components/admin/BulkActionDialog";
import { toast } from "sonner";

// Memoized table row for performance
const EmployeeRow = memo(({ emp, isSelected, onSelect }) => (
    <TableRow className={isSelected ? "bg-stone-50" : ""}>
        <TableCell>
            <Checkbox checked={isSelected} onCheckedChange={(checked) => onSelect(emp.id, checked)} />
        </TableCell>
        <TableCell className="font-mono font-medium text-xs">{emp.employee_number}</TableCell>
        <TableCell>
            <div className="font-medium text-stone-900 text-sm">{emp.last_name}, {emp.first_name}</div>
            <div className="text-[10px] text-stone-500">SSN: ***-**-{emp.ssn?.slice(-4)}</div>
            <div className="text-[10px] text-stone-400">{emp.employment_type}</div>
        </TableCell>
        <TableCell>
            <div className="flex items-center gap-1 text-xs mb-0.5"><Mail className="w-3 h-3 text-stone-400"/>{emp.email}</div>
            <div className="flex items-center gap-1 text-xs"><Phone className="w-3 h-3 text-stone-400"/>{emp.phone_primary}</div>
        </TableCell>
        <TableCell className="hidden md:table-cell text-xs text-stone-600">
            <div className="flex items-start gap-1">
                <MapPin className="w-3 h-3 mt-0.5 text-stone-400 flex-shrink-0"/>
                <span>{emp.address_street}<br/>{emp.address_state}, {emp.address_zip}</span>
            </div>
        </TableCell>
        <TableCell>
            <Badge variant="outline" className={emp.status === 'inactive' ? "bg-stone-100 text-stone-500 border-stone-200 text-[10px]" : "bg-green-50 text-green-700 border-green-200 text-[10px]"}>
                {emp.status === 'inactive' ? 'Inactive' : 'Active'}
            </Badge>
        </TableCell>
        <TableCell>
            <Link to={`${createPageUrl('EmployeeProfile')}?id=${emp.id}`}>
                <Button size="sm" className="h-7 w-7 p-0 bg-teal-700 hover:bg-teal-800 text-white">
                    <ExternalLink className="h-3.5 w-3.5" />
                </Button>
            </Link>
        </TableCell>
    </TableRow>
));

const EmployeeList = memo(function EmployeeList({ view = 'active' }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedTerm, setDebouncedTerm] = useState("");
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25); // Reduced default for mobile
    const [total, setTotal] = useState(0);

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedTerm(searchTerm), 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const { data: employees = [], isLoading, isError, error, refetch } = useQuery({
        queryKey: ['employees', view, debouncedTerm, page, pageSize],
        queryFn: async () => {
            const { data } = await base44.functions.invoke('queryEmployees', {
                status: view === 'archived' ? 'archived' : 'active',
                searchTerm: debouncedTerm,
                page,
                pageSize,
            });
            setTotal(data.total || 0);
            return data.items || [];
        },
        staleTime: 2 * 60_000,
        gcTime: 5 * 60_000,
        keepPreviousData: true,
    });

    const filteredEmployees = employees;

    const handleSelectAll = useCallback((checked) => {
        setSelectedEmployees(checked ? filteredEmployees.map(e => e.id) : []);
    }, [filteredEmployees]);

    const handleSelectOne = useCallback((id, checked) => {
        setSelectedEmployees(prev => checked ? [...prev, id] : prev.filter(eid => eid !== id));
    }, []);

    const handleBulkAction = useCallback(async (actionType, config) => {
        const toastId = toast.loading(`Processing...`);
        try {
            const { data } = await base44.functions.invoke('bulkUpdateEmployees', { ids: selectedEmployees, actionType, data: config });
            toast.success(`Updated ${data.updated || selectedEmployees.length} employees`, { id: toastId });
            setSelectedEmployees([]);
            refetch();
        } catch (err) {
            toast.error(`Failed: ${err.message}`, { id: toastId });
        }
    }, [selectedEmployees, refetch]);

    const handleExportCSV = useCallback(() => {
        if (filteredEmployees.length === 0) { toast.error("No data"); return; }
        const headers = ["ID","First Name","Last Name","Email","Phone","Status","Role","Department"];
        const csv = [headers.join(","), ...filteredEmployees.map(e => [e.employee_number,`"${e.first_name}"`,`"${e.last_name}"`,e.email,e.phone_primary,e.status||'active',e.employment_type,e.department].join(","))].join("\n");
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }, [filteredEmployees]);

    return (
        <Card>
            <CardHeader className="px-4 sm:px-6 py-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg"><Users className="w-4 h-4 text-teal-600"/>Directory</CardTitle>
                        <CardDescription className="text-xs">Manage employee records</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                        {selectedEmployees.length > 0 && (
                            <Button variant="outline" size="sm" className="border-teal-600 text-teal-700 bg-teal-50 h-8" onClick={() => setIsBulkDialogOpen(true)}>
                                <Layers className="w-3.5 h-3.5 mr-1"/>Bulk ({selectedEmployees.length})
                            </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8"><Download className="h-3.5 w-3.5 mr-1"/>Export</Button>
                        <div className="relative w-full sm:w-48">
                            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-stone-500"/>
                            <Input placeholder="Search..." className="pl-7 h-8 text-sm" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}/>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-stone-50">
                                <TableHead className="w-10"><Checkbox checked={filteredEmployees.length > 0 && selectedEmployees.length === filteredEmployees.length} onCheckedChange={handleSelectAll}/></TableHead>
                                <TableHead className="w-16 text-xs">ID</TableHead>
                                <TableHead className="text-xs">Name</TableHead>
                                <TableHead className="text-xs">Contact</TableHead>
                                <TableHead className="hidden md:table-cell text-xs">Address</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                                <TableHead className="w-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-6 text-stone-500"><Loader2 className="w-4 h-4 animate-spin inline mr-2"/>Loading...</TableCell></TableRow>
                            ) : isError ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-6 text-red-500 text-sm">Error: {error?.message}</TableCell></TableRow>
                            ) : filteredEmployees.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-6 text-stone-500 text-sm">No employees found.</TableCell></TableRow>
                            ) : (
                                filteredEmployees.map((emp) => (
                                    <EmployeeRow key={emp.id} emp={emp} isSelected={selectedEmployees.includes(emp.id)} onSelect={handleSelectOne}/>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-6 pb-4">
                <div className="text-[10px] text-stone-500">Showing {total === 0 ? 0 : ((page-1)*pageSize + 1)}–{Math.min(page*pageSize, total)} of {total}</div>
                <div className="flex items-center gap-2">
                    <select className="border rounded px-2 py-1 text-xs h-7" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                        {[25,50,100].map(sz => <option key={sz} value={sz}>{sz}/pg</option>)}
                    </select>
                    <Button variant="outline" size="sm" className="h-7" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p-1))}>Prev</Button>
                    <Button variant="outline" size="sm" className="h-7" disabled={page*pageSize >= total} onClick={() => setPage(p => p+1)}>Next</Button>
                </div>
            </div>
            
            <BulkActionDialog isOpen={isBulkDialogOpen} onClose={() => setIsBulkDialogOpen(false)} selectedCount={selectedEmployees.length} onConfirm={handleBulkAction} type={view === 'archived' ? 'archived_employee' : 'employee'}/>
        </Card>
    );
});

export default EmployeeList;