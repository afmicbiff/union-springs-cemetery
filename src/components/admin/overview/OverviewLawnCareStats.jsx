import React, { Suspense, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const LawnCareStats = React.lazy(() => import("@/components/admin/lawncare/LawnCareStats"));

const OverviewLawnCareStats = memo(function OverviewLawnCareStats() {
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["lawncare-schedules-overview"],
    queryFn: () => base44.entities.LawnCareSchedule.list("-created_date", 100),
    initialData: [],
    staleTime: 10 * 60_000, // Lawn care data changes infrequently
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Suspense fallback={<Card><CardContent className="p-6 flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-stone-400" /></CardContent></Card>}>
      <LawnCareStats schedules={schedules} />
    </Suspense>
  );
});

export default OverviewLawnCareStats;