import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Map as MapIcon, FileText } from "lucide-react";
import BatchesList from "./BatchesList";
import NewPlotsDataTable from "./NewPlotsDataTable";
import NewPlotsMap from "./NewPlotsMap";

export default function NewPlotsBrowser() {
  const [activeTab, setActiveTab] = React.useState("map");
  const [selectedBatchId, setSelectedBatchId] = React.useState(null);

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Batches list */}
      <div className="lg:col-span-4">
        <BatchesList
          batches={batchesQuery.data}
          isLoading={batchesQuery.isLoading}
          onRefresh={() => batchesQuery.refetch()}
          selectedBatchId={selectedBatchId}
          onSelectBatch={setSelectedBatchId}
        />
      </div>

      {/* Content */}
      <div className="lg:col-span-8">
        <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg mb-3">
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

        {activeTab === "map" ? (
          <NewPlotsMap batchId={selectedBatchId} />
        ) : (
          <NewPlotsDataTable batchId={selectedBatchId} />
        )}
      </div>
    </div>
  );
}