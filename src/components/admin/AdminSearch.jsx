import React, { useState, useEffect, useRef } from 'react';
import { Search, History, X, Loader2, ChevronRight, User, Map, FileText, Briefcase, Truck, Bell, CheckSquare, Compass, Calendar, Ghost, Heart, Receipt, Users } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';

// Helper for highlighting text
const HighlightedText = ({ text, highlight, className }) => {
    if (!highlight || !text) return <span className={className}>{text}</span>;
    
    const parts = text.toString().split(new RegExp(`(${highlight})`, 'gi'));
    return (
        <span className={className}>
            {parts.map((part, i) => 
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <span key={i} className="bg-yellow-200 text-stone-900 rounded-sm px-0.5 font-medium">{part}</span>
                ) : (
                    part
                )
            )}
        </span>
    );
};

export default function AdminSearch({ onNavigate }) {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const limit = 20;
    const [recentSearches, setRecentSearches] = useState([]);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);
    const [debouncedQuery, setDebouncedQuery] = useState("");

    // Debounce input by 300ms to reduce network calls
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
        return () => clearTimeout(t);
    }, [query]);

    // Load recent searches on mount
    useEffect(() => {
        const saved = localStorage.getItem('admin_recent_searches');
        if (saved) {
            try {
                setRecentSearches(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse recent searches");
            }
        }
    }, []);

    // Save recent searches
    const addToRecent = (term) => {
        if (!term.trim()) return;
        const newRecent = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
        setRecentSearches(newRecent);
        localStorage.setItem('admin_recent_searches', JSON.stringify(newRecent));
    };

    const removeRecent = (e, term) => {
        e.stopPropagation();
        const newRecent = recentSearches.filter(s => s !== term);
        setRecentSearches(newRecent);
        localStorage.setItem('admin_recent_searches', JSON.stringify(newRecent));
    };

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    // Navigation items to search client-side
    const adminSections = [
        { label: "Overview", type: "navigation", link: { type: "overview" }, subLabel: "Dashboard & Stats" },
        { label: "Sales & Reservations", type: "navigation", link: { type: "reservations" }, subLabel: "Manage plot sales" },
        { label: "Plots Management", type: "navigation", link: { type: "plots" }, subLabel: "Map & Plot Inventory" },
        { label: "Onboarding", type: "navigation", link: { type: "onboarding" }, subLabel: "Employee Onboarding" },
        { label: "Employees", type: "navigation", link: { type: "employees" }, subLabel: "Staff directory" },
        { label: "Vendors", type: "navigation", link: { type: "vendors" }, subLabel: "External partners" },
        { label: "Security", type: "navigation", link: { type: "security" }, subLabel: "Access control" },
        { label: "Bylaws", type: "navigation", link: { type: "bylaws" }, subLabel: "Rules & Regulations" },
        { label: "Calendar", type: "navigation", link: { type: "calendar" }, subLabel: "Events & Scheduling" },
        { label: "News & Announcements", type: "navigation", link: { type: "announcements" }, subLabel: "Public notices" },
        { label: "Tasks", type: "navigation", link: { type: "tasks" }, subLabel: "To-do list" },
        { label: "Members", type: "navigation", link: { type: "members" }, subLabel: "Community directory" },
    ];

    const { data: results, isLoading } = useQuery({
        queryKey: ['admin-search', debouncedQuery, page, limit],
        queryFn: async () => {
            if (!debouncedQuery || debouncedQuery.length < 2) return [];
            
            // 1. Search DB
            let dbResults = [];
            try {
                const response = await base44.functions.invoke('adminSearch', { query: debouncedQuery, page, limit });
                if (response?.data?.results) {
                    dbResults = response.data;
                }
            } catch (err) {
                console.error("Admin search DB error:", err);
                // Continue with nav results even if DB fails
            }

            // 2. Search Navigation (Client-side)
            const lower = debouncedQuery.toLowerCase();
            const navResults = adminSections.filter(section => 
                section.label.toLowerCase().includes(lower) || 
                section.subLabel.toLowerCase().includes(lower)
            );

            const responseData = (await base44.functions.invoke('adminSearch', { query: lower, page, limit }))?.data || {};
            const serverItems = Array.isArray(responseData.results) ? responseData.results : [];
            return { items: [...navResults, ...serverItems], pagination: responseData.pagination || null };
        },
        enabled: debouncedQuery.length >= 2,
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        keepPreviousData: true,
    });

    const handleSelect = (item) => {
        addToRecent(query);
        setIsOpen(false);
        setQuery("");
        
        if (item.link?.path) {
            navigate(item.link.path);
            return;
        }

        if (onNavigate) {
            onNavigate(item.link);
        }
    };

    const getIcon = (type) => {
        switch(type) {
            case 'member': return User;
            case 'plot': return Map;
            case 'reservation': return FileText;
            case 'employee': return Briefcase;
            case 'vendor': return Truck;
            case 'announcement': return Bell;
            case 'task': return CheckSquare;
            case 'navigation': return Compass;
            case 'deceased': return Ghost;
            case 'event': return Calendar;
            case 'user': return User;
            case 'notification': return Bell;
            case 'segment': return Users;
            case 'condolence': return Heart;
            case 'invoice': return Receipt;
            default: return Search;
        }
    };

    return (
        <div ref={wrapperRef} className="relative w-full md:w-[400px]">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <Input 
                    ref={inputRef}
                    placeholder="Search admin dashboard..." 
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                        setPage(1);
                    }}
                    onFocus={() => setIsOpen(true)}
                    className="pl-9 bg-white border-stone-200 focus-visible:ring-teal-600"
                />
                {query && (
                    <button 
                        onClick={() => {
                            setQuery("");
                            inputRef.current?.focus();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-stone-200 z-50 overflow-hidden max-h-[80vh] flex flex-col">
                    
                    {/* Recent Searches */}
                    {query.length < 2 && recentSearches.length > 0 && (
                        <div className="p-2">
                            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider px-2 py-1.5 flex items-center gap-2">
                                <History className="w-3 h-3" /> Recent
                            </h4>
                            {recentSearches.map(term => (
                                <button
                                    key={term}
                                    onClick={() => setQuery(term)}
                                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 rounded-md group text-left"
                                >
                                    <span>{term}</span>
                                    <X 
                                        onClick={(e) => removeRecent(e, term)}
                                        className="w-3 h-3 opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500 transition-opacity" 
                                    />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Results */}
                    {query.length >= 2 && (
                        <div className="overflow-y-auto">
                            {isLoading ? (
                                <div className="p-8 flex justify-center text-stone-400">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                </div>
                            ) : results?.items?.length > 0 ? (
                                <div className="p-2 space-y-1">
                                    {results.items.map((item, i) => {
                                        const Icon = getIcon(item.type);
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => handleSelect(item)}
                                                className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-stone-50 rounded-md transition-colors text-left group"
                                            >
                                                <div className="mt-0.5 p-1.5 bg-stone-100 rounded-md text-stone-500 group-hover:bg-white group-hover:text-teal-600 transition-colors">
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <HighlightedText 
                                                            text={item.label} 
                                                            highlight={query} 
                                                            className="font-medium text-stone-900 truncate" 
                                                        />
                                                        <Badge variant="outline" className="text-[10px] h-4 px-1 text-stone-400 capitalize">
                                                            {item.type}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-xs text-stone-500 truncate">
                                                        <HighlightedText text={item.subLabel} highlight={query} />
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-stone-300 opacity-0 group-hover:opacity-100 self-center" />
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-stone-500 text-sm">
                                    No results found for "{query}"
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}