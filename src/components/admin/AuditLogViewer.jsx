import React, { useState, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay, isSameMonth, isSameYear, parseISO, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { Search, Trash2, Filter, FileClock, Loader2, Calendar as CalendarIcon, X } from 'lucide-react';
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export default function AuditLogViewer() {
    const [searchTerm, setSearchTerm] = useState("");
    const [timeFilter, setTimeFilter] = useState("all"); // all, today, week, month, year, custom
    const [customDate, setCustomDate] = useState(null);
    const queryClient = useQueryClient();

    // Fetch Logs
    const { data: logs, isLoading } = useQuery({
        queryKey: ['audit-logs'],
        queryFn: () => base44.entities.AuditLog.list('-timestamp', 1000), // Fetch last 1000 logs
        initialData: []
    });

    // Delete Log Mutation
    const deleteLogMutation = useMutation({
        mutationFn: async (id) => {
            await base44.entities.AuditLog.delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['audit-logs']);
            toast.success("Log entry deleted");
        },
        onError: (err) => toast.error("Failed to delete log: " + err.message)
    });

    // Filtering Logic
    const filteredLogs = useMemo(() => {
        if (!logs) return [];

        return logs.filter(log => {
            const logDate = parseISO(log.timestamp);
            const now = new Date();

            // 1. Time Filter
            let matchesTime = true;
            if (timeFilter === 'today') {
                matchesTime = isSameDay(logDate, now);
            } else if (timeFilter === 'week') {
                const start = startOfWeek(now);
                const end = endOfWeek(now);
                matchesTime = logDate >= start && logDate <= end;
            } else if (timeFilter === 'month') {
                matchesTime = isSameMonth(logDate, now);
            } else if (timeFilter === 'year') {
                matchesTime = isSameYear(logDate, now);
            } else if (timeFilter === 'custom' && customDate) {
                matchesTime = isSameDay(logDate, customDate);
            }

            if (!matchesTime) return false;

            // 2. Fuzzy Search
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const searchString = `
                    ${log.action} 
                    ${log.entity_type} 
                    ${log.details} 
                    ${log.performed_by}
                    ${log.entity_id || ''}
                `.toLowerCase();
                
                // Simple fuzzy: check if all space-separated terms exist in the string
                const terms = term.split(/\s+/).filter(Boolean);
                return terms.every(t => searchString.includes(t));
            }

            return true;
        });
    }, [logs, searchTerm, timeFilter, customDate]);

    const getActionColor = (action) => {
        switch (action?.toLowerCase()) {
            case 'create': return 'bg-green-100 text-green-800 border-green-200';
            case 'update': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'delete': return 'bg-red-100 text-red-800 border-red-200';
            case 'login': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'export': return 'bg-amber-100 text-amber-800 border-amber-200';
            default: return 'bg-stone-100 text-stone-800 border-stone-200';
        }
    };

    return (
        <Card className="h-full border-stone-200 shadow-sm">
            <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-xl font-serif">
                            <FileClock className="w-5 h-5 text-teal-700" />
                            System Audit Log
                        </CardTitle>
                        <CardDescription>
                            Track and monitor all administrative actions and system events.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-stone-500 bg-stone-50 px-3 py-1 rounded-md border">
                        <span className="font-mono font-bold text-teal-700">{filteredLogs.length}</span>
                        <span>entries found</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Toolbar */}
                <div className="flex flex-col lg:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-500" />
                        <Input
                            placeholder="Search logs (user, action, details, ID)..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        <Select value={timeFilter} onValueChange={setTimeFilter}>
                            <SelectTrigger className="w-[140px]">
                                <Filter className="w-4 h-4 mr-2 text-stone-500" />
                                <SelectValue placeholder="Filter Date" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="week">This Week</SelectItem>
                                <SelectItem value="month">This Month</SelectItem>
                                <SelectItem value="year">This Year</SelectItem>
                                <SelectItem value="custom">Custom Date</SelectItem>
                            </SelectContent>
                        </Select>

                        {timeFilter === 'custom' && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={`justify-start text-left font-normal ${!customDate && "text-muted-foreground"}`}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {customDate ? format(customDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={customDate}
                                        onSelect={setCustomDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        )}
                        
                        {(searchTerm || timeFilter !== 'all') && (
                            <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => { setSearchTerm(''); setTimeFilter('all'); setCustomDate(null); }}
                                title="Clear Filters"
                            >
                                <X className="w-4 h-4 text-stone-500" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Log Table */}
                <div className="rounded-md border border-stone-200 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-stone-50">
                            <TableRow>
                                <TableHead className="w-[180px]">Timestamp</TableHead>
                                <TableHead className="w-[150px]">User</TableHead>
                                <TableHead className="w-[120px]">Action</TableHead>
                                <TableHead className="w-[120px]">Entity</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <div className="flex justify-center items-center gap-2 text-stone-500">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Loading logs...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-stone-500">
                                        No log entries found matching your criteria.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLogs.map((log) => (
                                    <TableRow key={log.id} className="group hover:bg-stone-50 transition-colors">
                                        <TableCell className="text-xs text-stone-500 font-mono">
                                            {format(parseISO(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                                        </TableCell>
                                        <TableCell className="text-sm font-medium text-stone-700">
                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                <div className="w-1.5 h-1.5 rounded-full bg-stone-300"></div>
                                                <span className="truncate" title={log.performed_by}>
                                                    {log.performed_by?.split('@')[0]}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`text-xs font-normal capitalize ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-stone-600">
                                            {log.entity_type}
                                            {log.entity_id && (
                                                <span className="text-[10px] text-stone-400 block truncate font-mono max-w-[80px]">
                                                    {log.entity_id}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-stone-600 max-w-[300px]">
                                            <p className="truncate" title={log.details}>{log.details}</p>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-stone-400 opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 transition-all"
                                                onClick={() => {
                                                    if (confirm("Are you sure you want to delete this log entry?")) {
                                                        deleteLogMutation.mutate(log.id);
                                                    }
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
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