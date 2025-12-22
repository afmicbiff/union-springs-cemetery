import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, AlertTriangle } from 'lucide-react';
import OverviewCalendarCard from "@/components/admin/overview/OverviewCalendarCard";
import OverviewNewsCard from "@/components/admin/overview/OverviewNewsCard";
import OverviewTasksCard from "@/components/admin/overview/OverviewTasksCard";
import OverviewNotificationsCard from "@/components/admin/overview/OverviewNotificationsCard";
import OverviewSalesCard from "@/components/admin/overview/OverviewSalesCard";
import OverviewPlotsCard from "@/components/admin/overview/OverviewPlotsCard";

export default function AdminOverview() {







    return (
        <div className="space-y-6">


            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <OverviewCalendarCard />
                <OverviewNewsCard />
                <OverviewTasksCard />
                <OverviewNotificationsCard />
                <OverviewSalesCard />
                <OverviewPlotsCard />

                <Card>
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