import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function NewPlotsDataTable({ batchId }) {
  const [limit, setLimit] = React.useState(200);
  const rowsQuery = useQuery({
    queryKey: ["newPlots", batchId, limit],
    enabled: !!batchId,
    queryFn: async () => base44.entities.NewPlot.filter({ batch_id: batchId }, "-created_date", limit),
    initialData: [],
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="text-gray-900 font-semibold">Imported Rows</div>
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
                  <td className="px-3 py-2 font-mono">
                    {r.plot_number ? (
                      <Link to={createPageUrl(`NewPlotDetails?id=${r.id}`)} className="text-teal-700 hover:underline">
                        {r.plot_number}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>
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
  );
}