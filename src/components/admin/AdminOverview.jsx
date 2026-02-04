import React, { Suspense } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';

// Lazy load heavy components for faster initial render
const OverviewCalendarCard = React.lazy(() => import("@/components/admin/overview/OverviewCalendarCard"));
const OverviewNewsCard = React.lazy(() => import("@/components/admin/overview/OverviewNewsCard"));
const OverviewTasksCard = React.lazy(() => import("@/components/admin/overview/OverviewTasksCard"));
const OverviewNotificationsCard = React.lazy(() => import("@/components/admin/overview/OverviewNotificationsCard"));
const OverviewSalesCard = React.lazy(() => import("@/components/admin/overview/OverviewSalesCard"));
const OverviewPlotsCard = React.lazy(() => import("@/components/admin/overview/OverviewPlotsCard"));
const OverviewLawnCareStats = React.lazy(() => import("@/components/admin/overview/OverviewLawnCareStats"));
const OverviewRedlinesCard = React.lazy(() => import("@/components/admin/overview/OverviewRedlinesCard"));
const QualityAdvisor = React.lazy(() => import("@/components/gov/QualityAdvisor"));

// Loading fallback for cards
const CardSkeleton = () => (
  <Card className="animate-pulse">
    <CardContent className="p-6 flex items-center justify-center h-32">
      <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
    </CardContent>
  </Card>
);

// Error boundary for production resilience
class CardErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-600">Failed to load widget</CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}

export default function AdminOverview() {



    return (
        <div className="space-y-6">
            {/* Primary Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                <CardErrorBoundary><Suspense fallback={<CardSkeleton />}><OverviewCalendarCard /></Suspense></CardErrorBoundary>
                <CardErrorBoundary><Suspense fallback={<CardSkeleton />}><OverviewNewsCard /></Suspense></CardErrorBoundary>
                <CardErrorBoundary><Suspense fallback={<CardSkeleton />}><OverviewTasksCard /></Suspense></CardErrorBoundary>
                <CardErrorBoundary><Suspense fallback={<CardSkeleton />}><OverviewNotificationsCard /></Suspense></CardErrorBoundary>
                <CardErrorBoundary><Suspense fallback={<CardSkeleton />}><OverviewSalesCard /></Suspense></CardErrorBoundary>
                <CardErrorBoundary><Suspense fallback={<CardSkeleton />}><OverviewPlotsCard /></Suspense></CardErrorBoundary>
                <CardErrorBoundary><Suspense fallback={<CardSkeleton />}><OverviewLawnCareStats /></Suspense></CardErrorBoundary>
                <CardErrorBoundary><Suspense fallback={<CardSkeleton />}><OverviewRedlinesCard /></Suspense></CardErrorBoundary>
            </div>

            {/* Quality Advisor - Full Width for table readability */}
            <div className="hidden md:block">
                <CardErrorBoundary>
                    <Suspense fallback={<Card className="animate-pulse h-48"><CardContent className="p-6 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-stone-400" /></CardContent></Card>}>
                        <QualityAdvisor />
                    </Suspense>
                </CardErrorBoundary>
            </div>
        </div>
    );
}