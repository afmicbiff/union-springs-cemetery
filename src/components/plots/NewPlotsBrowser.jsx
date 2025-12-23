import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Map as MapIcon, FileText } from "lucide-react";
import NewPlotsDataTable from "./NewPlotsDataTable";
import NewPlotsMap from "./NewPlotsMap";

export default function NewPlotsBrowser() {
  const [filters, setFilters] = React.useState({ status: 'All', section: 'All' });
  const [activeTab, setActiveTab] = React.useState("map");
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
          <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("map")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition flex items-center gap-1 ${
                activeTab === "map" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <MapIcon size={14} /> Map View
            </button>
            <button
              onClick={() => setActiveTab("data")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition flex items-center gap-1 ${
                activeTab === "data" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <FileText size={14} /> Data List
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs font-semibold text-gray-500 uppercase">Filters:</div>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="h-8 text-sm border rounded px-2 bg-white"
            >
              {statusOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>

            <select
              value={filters.section}
              onChange={(e) => setFilters(prev => ({ ...prev, section: e.target.value }))}
              className="h-8 text-sm border rounded px-2 bg-white"
            >
              {sectionOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>

            {(filters.status !== 'All' || filters.section !== 'All') && (
              <button
                onClick={() => setFilters({ status: 'All', section: 'All' })}
                className="h-8 text-sm px-2 text-gray-600 hover:text-red-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>


        {activeTab === "map" ? (
          <NewPlotsMap batchId={selectedBatchId} filters={filters} />
        ) : (
          <NewPlotsDataTable batchId={selectedBatchId} filters={filters} />
        )}
      </div>
    </div>
  );
}