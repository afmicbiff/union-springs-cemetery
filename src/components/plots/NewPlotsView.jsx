import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Database } from "lucide-react";

function formatDate(d) {
  try {
    return d ? new Date(d).toLocaleString() : "";
  } catch {
    return String(d || "");
  }
}

export default function NewPlotsView() {
  const [selectedBatchId, setSelectedBatchId] = React.useState(null);
  const [limit, setLimit] = React.useState(200);

  const batchesQuery = useQuery({
    queryKey: ["importBatches"],
    queryFn: async () => {
      // Most recent first
      return base44.entities.ImportBatch.list("-created_date", 20);
    },
    initialData: [],
  });

  React.useEffect(() => {
    if (!selectedBatchId && batchesQuery.data?.length) {
      setSelectedBatchId(batchesQuery.data[0].id);
    }
  }, [batchesQuery.data, selectedBatchId]);

  const rowsQuery = useQuery({
    queryKey: ["newPlots", selectedBatchId, limit],
    enabled: !!selectedBatchId,
    queryFn: async () => {
      return base44.entities.NewPlot.filter({ batch_id: selectedBatchId }, "-created_date", limit);
    },
    initialData: [],
  });

  const selectedBatch = React.useMemo(
    () => batchesQuery.data?.find((b) => b.id === selectedBatchId) || null,
    [batchesQuery.data, selectedBatchId]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Batches */}
      <div className="lg:col-span-4">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2 text-gray-700 font-semibold">
              <Database className="w-4 h-4" /> Import Batches
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => batchesQuery.refetch()}
              className="h-8"
            >
              <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
            </Button>
          </div>
          <div className="divide-y divide-gray-100 max-h-[480px] overflow-auto">
            {batchesQuery.isLoading && (
              <div className="p-4 text-sm text-gray-500">Loading batches…</div>
            )}
            {!batchesQuery.isLoading && batchesQuery.data?.length === 0 && (
              <div className="p-4 text-sm text-gray-500">No imports yet. Use Import to upload a CSV/Excel.</div>
            )}
            {batchesQuery.data?.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBatchId(b.id)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${
                  selectedBatchId === b.id ? "bg-teal-50" : "bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{b.source || "manual_upload"}</div>
                    <div className="text-xs text-gray-500">{formatDate(b.created_date)}</div>
                    <div className="text-xs text-gray-500">{formatDate(b.started_at)} → {formatDate(b.completed_at)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-gray-700">{b.status}</div>
                    <div className="text-[11px] text-gray-500">Rows: {b.total_rows ?? 0}</div>
                    <div className="text-[11px] text-gray-500">Created: {b.created_rows ?? 0}</div>
                    <div className="text-[11px] text-gray-500">Updated: {b.updated_rows ?? 0}</div>
                    <div className="text-[11px] text-gray-500">Skipped: {b.skipped_rows ?? 0}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rows */}
      <div className="lg:col-span-8">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div>
              <div className="text-gray-900 font-semibold">Imported Rows</div>
              {selectedBatch && (
                <div className="text-xs text-gray-500">Batch started {formatDate(selectedBatch.started_at)} by {selectedBatch.user_email || "unknown"}</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => rowsQuery.refetch()} className="h-8">
                <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={() => setLimit((n) => n + 200)} className="h-8">
                + Load 200
              </Button>
            </div>
          </div>

          {rowsQuery.isLoading ? (
            <div className="p-4 text-sm text-gray-500">Loading rows…</div>
          ) : rowsQuery.data?.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No rows for this batch.</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Plot #</th>
                    <th className="px-3 py-2 text-left">Row</th>
                    <th className="px-3 py-2 text-left">Section</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Family</th>
                    <th className="px-3 py-2 text-left">Action</th>
                    <th className="px-3 py-2 text-left">Matched Plot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rowsQuery.data.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono">{r.plot_number || "-"}</td>
                      <td className="px-3 py-2">{r.row_number || "-"}</td>
                      <td className="px-3 py-2">{r.section || "-"}</td>
                      <td className="px-3 py-2">{r.status || "-"}</td>
                      <td className="px-3 py-2">{[r.first_name, r.last_name].filter(Boolean).join(" ") || "-"}</td>
                      <td className="px-3 py-2">{r.family_name || "-"}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${
                          r.action_taken === "created"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : r.action_taken === "updated"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-gray-50 text-gray-700 border-gray-200"
                        }`}>
                          {r.action_taken}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">{r.matched_plot_id || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}