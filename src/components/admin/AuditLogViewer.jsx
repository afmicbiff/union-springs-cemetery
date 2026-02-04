import React, { useState, useMemo, useCallback, memo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
    format, isSameDay, isSameMonth, parseISO, isValid,
    startOfWeek, endOfWeek, getYear, getMonth, getWeek, 
    startOfMonth, endOfMonth,
    eachDayOfInterval, eachWeekOfInterval
} from 'date-fns';
import { Search, Trash2, Loader2, FileDown, Archive, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from "sonner";
import { jsPDF } from 'jspdf';

// Safe date formatter with error handling
const safeParseISO = (dateStr) => {
    if (!dateStr) return null;
    try {
        const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
        return isValid(d) ? d : null;
    } catch {
        return null;
    }
};

const safeFormatDate = (dateStr, formatStr = 'yyyy-MM-dd HH:mm:ss') => {
    const d = safeParseISO(dateStr);
    if (!d) return 'N/A';
    try {
        return format(d, formatStr);
    } catch {
        return 'N/A';
    }
};

// Memoized log row component
const LogRow = memo(function LogRow({ log, onDelete, getActionColor }) {
    const handleDelete = useCallback(() => {
        if (confirm("Are you sure you want to delete this log entry?")) {
            onDelete(log.id);
        }
    }, [log.id, onDelete]);

    return (
        <TableRow className="group hover:bg-stone-50 transition-colors">
            <TableCell className="text-[10px] sm:text-xs text-stone-500 font-mono whitespace-nowrap">
                {safeFormatDate(log.timestamp, 'MM/dd HH:mm')}
                <span className="hidden md:inline">{safeFormatDate(log.timestamp, ':ss')}</span>
            </TableCell>
            <TableCell className="text-xs sm:text-sm font-medium text-stone-700">
                <div className="flex items-center gap-1.5 overflow-hidden">
                    <div className="w-1.5 h-1.5 rounded-full bg-stone-300 shrink-0"></div>
                    <span className="truncate max-w-[60px] sm:max-w-[100px] md:max-w-none" title={log.performed_by}>
                        {log.performed_by?.split('@')[0] || 'Unknown'}
                    </span>
                </div>
            </TableCell>
            <TableCell>
                <Badge variant="outline" className={`text-[10px] sm:text-xs font-normal capitalize ${getActionColor(log.action)}`}>
                    {log.action}
                </Badge>
            </TableCell>
            <TableCell className="text-xs sm:text-sm text-stone-600 hidden sm:table-cell">
                {log.entity_type}
                {log.entity_id && (
                    <span className="text-[9px] text-stone-400 block truncate font-mono max-w-[80px]">
                        {log.entity_id}
                    </span>
                )}
            </TableCell>
            <TableCell className="text-xs sm:text-sm text-stone-600 max-w-[100px] sm:max-w-[200px] md:max-w-[300px]">
                <p className="truncate" title={log.details}>{log.details || '-'}</p>
            </TableCell>
            <TableCell>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 text-stone-400 opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 transition-all touch-manipulation"
                    onClick={handleDelete}
                >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
            </TableCell>
        </TableRow>
    );
});

function AuditLogViewer() {
    const [searchTerm, setSearchTerm] = useState("");
    
    // Drill-down State
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [selectedMonth, setSelectedMonth] = useState("all");
    const [selectedWeek, setSelectedWeek] = useState("all");
    const [selectedDay, setSelectedDay] = useState("all");

    const queryClient = useQueryClient();

    // Fetch Logs with caching and error handling
    const { data: logs, isLoading, isError, refetch, isFetching } = useQuery({
        queryKey: ['audit-logs'],
        queryFn: () => base44.entities.AuditLog.list('-timestamp', 2000),
        initialData: [],
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 2,
    });

    // Delete Log Mutation
    const deleteLogMutation = useMutation({
        mutationFn: async (id) => {
            await base44.entities.AuditLog.delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['audit-logs']);
            toast.success("Log entry deleted permanently (no trace).");
        },
        onError: (err) => toast.error("Failed to delete log: " + err.message)
    });

    // --- filtering logic with safe date parsing ---
    const filteredLogs = useMemo(() => {
        if (!logs || !Array.isArray(logs)) return [];

        return logs.filter(log => {
            const logDate = safeParseISO(log.timestamp);
            if (!logDate) return false; // Skip invalid dates
            
            // 1. Year Filter
            if (selectedYear !== "all") {
                if (getYear(logDate).toString() !== selectedYear) return false;
            }

            // 2. Month Filter
            if (selectedMonth !== "all") {
                if (getMonth(logDate).toString() !== selectedMonth) return false;
            }

            // 3. Week Filter (Week of Year)
            if (selectedWeek !== "all") {
                if (getWeek(logDate).toString() !== selectedWeek) return false;
            }

            // 4. Day Filter
            if (selectedDay !== "all") {
                const dayDate = safeParseISO(selectedDay);
                if (!dayDate || !isSameDay(logDate, dayDate)) return false;
            }

            // 5. Search
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const searchString = `
                    ${log.action || ''} 
                    ${log.entity_type || ''} 
                    ${log.details || ''} 
                    ${log.performed_by || ''}
                    ${log.entity_id || ''}
                `.toLowerCase();
                
                const terms = term.split(/\s+/).filter(Boolean);
                return terms.every(t => searchString.includes(t));
            }

            return true;
        });
    }, [logs, searchTerm, selectedYear, selectedMonth, selectedWeek, selectedDay]);

    // --- dropdown options generation ---
    const availableYears = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = 0; i < 5; i++) {
            years.push((currentYear - i).toString());
        }
        return years;
    }, []);

    const availableWeeks = useMemo(() => {
        if (selectedYear === "all" || selectedMonth === "all") return [];
        const start = startOfMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth)));
        const end = endOfMonth(start);
        return eachWeekOfInterval({ start, end });
    }, [selectedYear, selectedMonth]);

    const availableDays = useMemo(() => {
        if (selectedYear === "all" || selectedMonth === "all") return [];
        
        let start, end;
        if (selectedWeek !== "all") {
             // If week is selected, show days in that week (intersected with month)
             // Getting start of week from week number is tricky without index, 
             // but we can filter the weeks array we generated.
             // Simpler: Just list days of the month, or if week selected, list days of that week.
             // Let's stick to Month -> Day for simplicity unless Week is strictly required. 
             // User asked for Week dropdown.
             // We'll reset Day if Week changes.
             const weekDate = availableWeeks.find(w => getWeek(w).toString() === selectedWeek);
             if (weekDate) {
                 start = startOfWeek(weekDate);
                 end = endOfWeek(weekDate);
             } else {
                 start = startOfMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth)));
                 end = endOfMonth(start);
             }
        } else {
             start = startOfMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth)));
             end = endOfMonth(start);
        }

        return eachDayOfInterval({ start, end }).filter(d => isSameMonth(d, new Date(parseInt(selectedYear), parseInt(selectedMonth))));
    }, [selectedYear, selectedMonth, selectedWeek, availableWeeks]);


    // --- PDF Export with safe formatting ---
    const handleExportPDF = useCallback((scope) => {
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text("System Audit Log Report", 20, 20);
        
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
        doc.text(`Scope: ${scope.toUpperCase()}`, 20, 35);
        doc.text(`Entries: ${filteredLogs.length}`, 20, 40);

        let y = 50;
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text("Time", 20, y);
        doc.text("User", 60, y);
        doc.text("Action", 110, y);
        doc.text("Details", 150, y);
        doc.setFont(undefined, 'normal');

        y += 10;

        filteredLogs.forEach(log => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
            const dateStr = safeFormatDate(log.timestamp, 'MM/dd HH:mm');
            const userStr = (log.performed_by?.split('@')[0] || 'Unknown').substring(0, 15);
            const actionStr = `${log.action || ''} ${log.entity_type || ''}`.substring(0, 20);
            const detailStr = (log.details || "").substring(0, 30);

            doc.text(dateStr, 20, y);
            doc.text(userStr, 60, y);
            doc.text(actionStr, 110, y);
            doc.text(detailStr, 150, y);
            y += 7;
        });

        doc.save(`audit_logs_${scope}_${format(new Date(), 'yyyyMMdd')}.pdf`);
        toast.success(`Exported ${scope} logs to PDF`);
    }, [filteredLogs]);

    // Memoized callbacks for handlers
    const handleDeleteLog = useCallback((id) => {
        deleteLogMutation.mutate(id);
    }, [deleteLogMutation]);

    const handleYearChange = useCallback((v) => {
        setSelectedYear(v);
        setSelectedMonth('all');
        setSelectedWeek('all');
        setSelectedDay('all');
    }, []);

    const handleMonthChange = useCallback((v) => {
        setSelectedMonth(v);
        setSelectedWeek('all');
        setSelectedDay('all');
    }, []);

    const handleWeekChange = useCallback((v) => {
        setSelectedWeek(v);
        setSelectedDay('all');
    }, []);

    const handleSearchChange = useCallback((e) => {
        setSearchTerm(e.target.value);
    }, []);

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
                            <Archive className="w-5 h-5 text-teal-700" />
                            Archived Logs Viewer
                        </CardTitle>
                        <CardDescription>
                            Drill down into historical system logs with advanced filtering and export.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedMonth !== 'all' && (
                            <Button variant="outline" size="sm" onClick={() => handleExportPDF('month')}>
                                <FileDown className="w-4 h-4 mr-2" /> Month PDF
                            </Button>
                        )}
                        {selectedWeek !== 'all' && (
                            <Button variant="outline" size="sm" onClick={() => handleExportPDF('week')}>
                                <FileDown className="w-4 h-4 mr-2" /> Week PDF
                            </Button>
                        )}
                        {selectedDay !== 'all' && (
                            <Button variant="outline" size="sm" onClick={() => handleExportPDF('day')}>
                                <FileDown className="w-4 h-4 mr-2" /> Day PDF
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Hierarchical Toolbar */}
                <div className="space-y-4 mb-6 p-4 bg-stone-50 rounded-lg border border-stone-200">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                         {/* Year */}
                         <Select value={selectedYear} onValueChange={(v) => { setSelectedYear(v); setSelectedMonth('all'); setSelectedWeek('all'); setSelectedDay('all'); }}>
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Years</SelectItem>
                                {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        {/* Month */}
                        <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); setSelectedWeek('all'); setSelectedDay('all'); }} disabled={selectedYear === 'all'}>
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Months</SelectItem>
                                {Array.from({length: 12}).map((_, i) => (
                                    <SelectItem key={i} value={i.toString()}>{format(new Date(2024, i, 1), 'MMMM')}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Week */}
                        <Select value={selectedWeek} onValueChange={(v) => { setSelectedWeek(v); setSelectedDay('all'); }} disabled={selectedMonth === 'all'}>
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Week" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Weeks</SelectItem>
                                {availableWeeks.map(w => (
                                    <SelectItem key={getWeek(w)} value={getWeek(w).toString()}>
                                        Week {getWeek(w)} ({format(startOfWeek(w), 'MMM d')} - {format(endOfWeek(w), 'MMM d')})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Day */}
                        <Select value={selectedDay} onValueChange={setSelectedDay} disabled={selectedMonth === 'all'}>
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Day" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Days</SelectItem>
                                {availableDays.map(d => (
                                    <SelectItem key={d.toISOString()} value={d.toISOString()}>
                                        {format(d, 'EEE, MMM d')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                         {/* Search */}
                         <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-500" />
                            <Input
                                placeholder="Search..."
                                className="pl-9 bg-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
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