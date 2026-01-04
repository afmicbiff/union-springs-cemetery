import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Users, Mail, Phone, MapPin, ExternalLink, Download, Layers } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import BulkActionDialog from "@/components/admin/BulkActionDialog";
import { toast } from "sonner";

export default function EmployeeList({ view = 'active' }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedTerm, setDebouncedTerm] = useState("");
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [total, setTotal] = useState(0);

    // Debounce search term
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedTerm(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const { data: employees, isLoading, isError, error, refetch } = useQuery({
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
        initialData: [],
        keepPreviousData: true,
    });

    // Use server-returned employees directly (paginated)
    const filteredEmployees = employees || [];

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedEmployees(filteredEmployees.map(e => e.id));
        } else {
            setSelectedEmployees([]);
        }
    };

    const handleSelectOne = (id, checked) => {
        if (checked) {
            setSelectedEmployees(prev => [...prev, id]);
        } else {
            setSelectedEmployees(prev => prev.filter(eid => eid !== id));
        }
    };

    const handleBulkAction = async (actionType, config) => {
        const toastId = toast.loading(`Processing ${actionType}...`);
        try {
            const { data } = await base44.functions.invoke('bulkUpdateEmployees', {
                ids: selectedEmployees,
                actionType,
                data: config
            });
            toast.success(`Updated ${data.updated || selectedEmployees.length} employees`, { id: toastId });
            setSelectedEmployees([]);
            refetch();
        } catch (err) {
            toast.error(`Bulk action failed: ${err.message}`, { id: toastId });
        }
    };

    const handleExportCSV = () => {
        if (filteredEmployees.length === 0) {
            toast.error("No employees to export");
            return;
        }

        const headers = ["ID", "First Name", "Last Name", "Email", "Phone", "Status", "Role", "Department"];
        const csvContent = [
            headers.join(","),
            ...filteredEmployees.map(e => [
                e.employee_number,
                `"${e.first_name}"`,
                `"${e.last_name}"`,
                e.email,
                e.phone_primary,
                e.status || 'active',
                e.employment_type,
                e.department
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `employees_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-teal-600"/> Employee Directory
                        </CardTitle>
                        <CardDescription>
                            View and manage registered employee records.
                        </CardDescription>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto items-center">
                        {selectedEmployees.length > 0 && (
                            <Button 
                                variant="outline" 
                                className="mr-2 border-teal-600 text-teal-700 bg-teal-50"
                                onClick={() => setIsBulkDialogOpen(true)}
                            >
                                <Layers className="w-4 h-4 mr-2" />
                                Bulk Actions ({selectedEmployees.length})
                            </Button>
                        )}
                        <Button variant="outline" onClick={handleExportCSV} title="Export CSV">
                            <Download className="h-4 w-4 mr-2" /> Export
                        </Button>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-500" />
                            <Input
                                placeholder="Search employees..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            />
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-stone-50">
                                <TableHead className="w-[50px]">
                                    <Checkbox 
                                        checked={filteredEmployees.length > 0 && selectedEmployees.length === filteredEmployees.length}
                                        onCheckedChange={handleSelectAll}
                                    />
                                </TableHead>
                                <TableHead className="w-[100px]">ID #</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead className="hidden md:table-cell">Address</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-stone-500">
                                        <div className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading records...</div>
                                    </TableCell>
                                </TableRow>
                            ) : isError ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-red-500">
                                        Error loading employees: {error?.message || "Unknown error"}
                                    </TableCell>
                                </TableRow>
                            ) : filteredEmployees.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-stone-500">
                                        No employees found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredEmployees.map((emp) => (
                                    <TableRow key={emp.id} className={selectedEmployees.includes(emp.id) ? "bg-stone-50" : ""}>
                                        <TableCell>
                                            <Checkbox 
                                                checked={selectedEmployees.includes(emp.id)}
                                                onCheckedChange={(checked) => handleSelectOne(emp.id, checked)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-mono font-medium">{emp.employee_number}</TableCell>
                                        <TableCell>
                                            <div className="font-medium text-stone-900">{emp.last_name}, {emp.first_name}</div>
                                            <div className="text-xs text-stone-500">SSN: ***-**-{emp.ssn?.slice(-4)}</div>
                                            <div className="text-xs text-stone-400 mt-1">{emp.employment_type}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-xs mb-1">
                                                <Mail className="w-3 h-3 text-stone-400"/> {emp.email}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs">
                                                <Phone className="w-3 h-3 text-stone-400"/> {emp.phone_primary}
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell text-sm text-stone-600">
                                            <div className="flex items-start gap-1">
                                                <MapPin className="w-3 h-3 mt-1 text-stone-400 flex-shrink-0"/>
                                                <span>
                                                    {emp.address_street}<br/>
                                                    {emp.address_state}, {emp.address_zip}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {emp.status === 'inactive' ? (
                                                <Badge variant="outline" className="bg-stone-100 text-stone-500 border-stone-200">
                                                    Inactive
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                    Active
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Link to={`${createPageUrl('EmployeeProfile')}?id=${emp.id}`}>
                                                <Button size="sm" className="h-8 w-8 p-0 bg-teal-700 hover:bg-teal-800 text-white">
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 px-6 pb-6">
                <div className="text-xs text-stone-500">Showing {(total === 0) ? 0 : ((page-1)*pageSize + 1)}–{Math.min(page*pageSize, total)} of {total}</div>
                <div className="flex items-center gap-2">
                    <select className="border rounded px-2 py-1 text-xs" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                        {[25,50,100].map(sz => <option key={sz} value={sz}>{sz} / page</option>)}
                    </select>
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p-1))}>Prev</Button>
                    <Button variant="outline" size="sm" disabled={page*pageSize >= total} onClick={() => setPage(p => p+1)}>Next</Button>
                </div>
            </div>
            
            <BulkActionDialog 
                isOpen={isBulkDialogOpen}
                onClose={() => setIsBulkDialogOpen(false)}
                selectedCount={selectedEmployees.length}
                onConfirm={handleBulkAction}
                type={view === 'archived' ? 'archived_employee' : 'employee'}
            />
        </Card>
    );
}