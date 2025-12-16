import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, AlertTriangle } from 'lucide-react';
import UserSummaryWidget from "@/components/dashboard/UserSummaryWidget";
import FollowUpWidget from "./FollowUpWidget";

export default function AdminOverview() {
    const { data: plots } = useQuery({
        queryKey: ['plots-admin'],
        queryFn: () => base44.entities.Plot.list({ limit: 1000 }), // Increased limit for accurate stats
        initialData: [],
    });

    return (
        <div className="space-y-6">
            <UserSummaryWidget />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-stone-500">Total Plots</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-stone-900">{plots.length}</div>
                        <p className="text-xs text-stone-500 mt-1">Across all sections</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-stone-500">Available</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-teal-600">
                            {plots.filter(p => p.status === 'Available').length}
                        </div>
                        <p className="text-xs text-stone-500 mt-1">Ready for reservation</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-stone-500">Occupied/Reserved</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-stone-700">
                            {plots.filter(p => p.status !== 'Available').length}
                        </div>
                        <p className="text-xs text-stone-500 mt-1">Total interments & holds</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <FollowUpWidget />
                
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Perpetual Care Report</CardTitle>
                    <CardDescription>Maintenance status overview for grounds keeping.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="p-4 bg-stone-50 rounded-sm">
                            <h4 className="font-bold text-stone-800 mb-2">Maintenance Required</h4>
                            <p className="text-stone-600 text-sm">
                                3 Plots flagged for leveling. <br/>
                                2 Headstones require cleaning in Old Historic section.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-white rounded-sm shadow-sm border border-stone-100">
                                <span className="block text-sm text-stone-500">Lawn Maintenance</span>
                                <span className="font-bold text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Up to Date</span>
                            </div>
                            <div className="p-4 bg-white rounded-sm shadow-sm border border-stone-100">
                                <span className="block text-sm text-stone-500">Site Inspections</span>
                                <span className="font-bold text-amber-600 flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> Due in 2 days</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            </div>
        </div>
    );
}