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
import { Search, Users, Mail, Phone, MapPin, ExternalLink } from 'lucide-react';

export default function EmployeeList() {
    const [searchTerm, setSearchTerm] = useState("");

    const { data: employees, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.Employee.list('-created_date', 1000),
        initialData: [],
    });

    const filteredEmployees = employees.filter(emp => {
        const term = searchTerm.toLowerCase();
        return (
            emp.first_name?.toLowerCase().includes(term) ||
            emp.last_name?.toLowerCase().includes(term) ||
            emp.employee_number?.includes(term) ||
            emp.email?.toLowerCase().includes(term)
        );
    });

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
                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-500" />
                            <Input
                                placeholder="Search employees..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh List">
                            <Users className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-stone-50">
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
                                    <TableCell colSpan={5} className="text-center py-8 text-stone-500">
                                        Loading records...
                                    </TableCell>
                                </TableRow>
                            ) : isError ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-red-500">
                                        Error loading employees: {error?.message || "Unknown error"}
                                    </TableCell>
                                </TableRow>
                            ) : filteredEmployees.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-stone-500">
                                        No employees found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredEmployees.map((emp) => (
                                    <TableRow key={emp.id}>
                                        <TableCell className="font-mono font-medium">{emp.employee_number}</TableCell>
                                        <TableCell>
                                            <div className="font-medium text-stone-900">{emp.last_name}, {emp.first_name}</div>
                                            <div className="text-xs text-stone-500">SSN: ***-**-{emp.ssn?.slice(-4)}</div>
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
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                Active
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Link to={`${createPageUrl('EmployeeProfile')}?id=${emp.id}`}>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <ExternalLink className="h-4 w-4 text-stone-500 hover:text-teal-600" />
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
        </Card>
    );
}