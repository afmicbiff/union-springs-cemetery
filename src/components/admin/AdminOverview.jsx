import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, AlertTriangle } from 'lucide-react';
import OverviewCalendarCard from "@/components/admin/overview/OverviewCalendarCard";
import OverviewNewsCard from "@/components/admin/overview/OverviewNewsCard";
import OverviewTasksCard from "@/components/admin/overview/OverviewTasksCard";
import OverviewNotificationsCard from "@/components/admin/overview/OverviewNotificationsCard";
import OverviewSalesCard from "@/components/admin/overview/OverviewSalesCard";
import OverviewPlotsCard from "@/components/admin/overview/OverviewPlotsCard";
import OverviewLawnCareStats from "@/components/admin/overview/OverviewLawnCareStats";
import QualityAdvisor from "@/components/gov/QualityAdvisor";

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

                <OverviewLawnCareStats />
                <QualityAdvisor />
            </div>


        </div>
    );
}