import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import LawnCareStats from "@/components/admin/lawncare/LawnCareStats";

export default function OverviewLawnCareStats() {
  const { data: schedules = [] } = useQuery({
    queryKey: ["lawncare-schedules-overview"],
    queryFn: () => base44.entities.LawnCareSchedule.list("-created_date", 500),
    initialData: [],
  });

  return <LawnCareStats schedules={schedules} />;
}