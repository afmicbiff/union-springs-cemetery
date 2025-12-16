import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, isPast, parseISO, addDays } from 'date-fns';
import { CheckSquare, Calendar, User, ArrowRight, AlertTriangle } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { createPageUrl } from '@/utils';

export default function FollowUpWidget() {
    // Fetch members with pending follow-ups
    const { data: members, isLoading } = useQuery({
        queryKey: ['members-follow-up'],
        queryFn: async () => {
            // Fetch all and filter client side since we need complex filtering (status pending AND has date)
            // Ideally backend filter would be better if supported
            const all = await base44.entities.Member.list(null, 1000);
            return all.filter(m => m.follow_up_status === 'pending' && m.follow_up_date)
                      .sort((a, b) => new Date(a.follow_up_date) - new Date(b.follow_up_date));
        },
        initialData: []
    });

    const { data: employees } = useQuery({
        queryKey: ['employees-widget'],
        queryFn: () => base44.entities.Employee.list(),
        initialData: []
    });

    const getAssigneeName = (id) => {
        const emp = employees.find(e => e.id === id);
        return emp ? `${emp.first_name} ${emp.last_name}` : 'Unassigned';
    };

    if (isLoading) return <Card className="h-[300px] animate-pulse bg-stone-50" />;

    const overdue = members.filter(m => isPast(parseISO(m.follow_up_date)) && format(parseISO(m.follow_up_date), 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd'));
    const upcoming = members.filter(m => !overdue.includes(m));

    return (
        <Card className="col-span-1 lg:col-span-2">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-base font-semibold text-stone-800 flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-teal-600" /> Pending Follow-Ups
                        </CardTitle>
                        <CardDescription>Tasks requiring attention</CardDescription>
                    </div>
                    <div className="flex gap-2 text-xs">
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">{overdue.length} Overdue</span>
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">{upcoming.length} Upcoming</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[250px] pr-4">
                    <div className="space-y-3">
                        {members.length === 0 ? (
                            <div className="text-center py-10 text-stone-400 italic">
                                No pending follow-ups.
                            </div>
                        ) : (
                            members.map(member => {
                                const isOverdue = overdue.includes(member);
                                return (
                                    <div 
                                        key={member.id} 
                                        className={`group flex items-start gap-3 p-3 rounded-lg border transition-all hover:shadow-sm cursor-pointer ${
                                            isOverdue ? 'bg-red-50/50 border-red-100 hover:border-red-200' : 'bg-white border-stone-100 hover:border-teal-200'
                                        }`}
                                        onClick={() => window.open(`${createPageUrl('MemberProfile')}?id=${member.id}`, '_blank')}
                                    >
                                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${isOverdue ? 'bg-red-500' : 'bg-amber-500'}`} />
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-medium text-stone-900 truncate pr-2">
                                                    {member.first_name} {member.last_name}
                                                </h4>
                                                <span className={`text-xs whitespace-nowrap flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-stone-500'}`}>
                                                    <Calendar className="w-3 h-3" />
                                                    {format(parseISO(member.follow_up_date), 'MMM d')}
                                                </span>
                                            </div>
                                            
                                            <p className="text-xs text-stone-600 mt-1 line-clamp-1">
                                                {member.follow_up_notes || 'No notes provided'}
                                            </p>

                                            <div className="flex items-center gap-3 mt-2 text-[10px] text-stone-400">
                                                <span className="flex items-center gap-1 bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">
                                                    <User className="w-3 h-3" /> 
                                                    {getAssigneeName(member.follow_up_assignee_id)}
                                                </span>
                                                {member.city && <span>{member.city}</span>}
                                            </div>
                                        </div>
                                        
                                        <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ArrowRight className="w-4 h-4 text-teal-600" />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}