import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Map as MapIcon, FileText } from "lucide-react";
import NewPlotsDataTable from "./NewPlotsDataTable";
import NewPlotsMap from "./NewPlotsMap";

export default function NewPlotsBrowser({ activeTab: controlledActiveTab, onTabChange, filters: externalFilters }) {
  const [filters, setFilters] = React.useState({ status: 'All', section: 'All' });
  const [activeTab, setActiveTab] = React.useState("map");
  const isControlled = controlledActiveTab !== undefined && controlledActiveTab !== null;
  const currentTab = isControlled ? controlledActiveTab : activeTab;
  const changeTab = (tab) => {
    if (isControlled) {
      onTabChange && onTabChange(tab);
    } else {
      setActiveTab(tab);
    }
  };
  const [selectedBatchId, setSelectedBatchId] = React.useState(null);
  const statusOptions = ['All','Available','Pending Reservation','Reserved','Occupied','Veteran','Unavailable','Unknown'];

  const batchesQuery = useQuery({
    queryKey: ["importBatches"],
    queryFn: async () => base44.entities.ImportBatch.list("-created_date", 20),
    initialData: [],
  });

  React.useEffect(() => {
    if (!selectedBatchId && batchesQuery.data?.length) {
      setSelectedBatchId(batchesQuery.data[0].id);
    }
  }, [batchesQuery.data, selectedBatchId]);

  const sectionsQuery = useQuery({
    queryKey: ['newPlots-sections', selectedBatchId],
    enabled: !!selectedBatchId,
    queryFn: async () => base44.entities.NewPlot.filter({ batch_id: selectedBatchId }, null, 1000),
    initialData: [],
  });
  const sectionOptions = React.useMemo(() => {
    const set = new Set();
    (sectionsQuery.data || []).forEach(r => {
      const v = (r.section || '').toString().trim();
      if (v) set.add(v);
    });
    return ['All', ...Array.from(set).sort((a,b)=>a.localeCompare(b))];
  }, [sectionsQuery.data]);

  return (
    <div className="space-y-3">
      {/* Content */}
      <div>
        {/* Tabs + Filters */}
        <div className="flex flex-col gap-2 mb-3">
          {!isControlled && (
            <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => changeTab("map")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition flex items-center gap-1 ${
                  currentTab === "map" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <MapIcon size={14} /> Map View
              </button>
              <button
                onClick={() => changeTab("data")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition flex items-center gap-1 ${
                  currentTab === "data" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <FileText size={14} /> Data List
              </button>
            </div>
          )}

           {/* Filters handled at page level */}
        </div>


        {(currentTab === "map") ? (
          <NewPlotsMap batchId={selectedBatchId} filters={externalFilters ?? filters} showSearch={!externalFilters} />
        ) : (
          <NewPlotsDataTable batchId={selectedBatchId} filters={externalFilters ?? filters} />
        )}
      </div>
    </div>
  );
}