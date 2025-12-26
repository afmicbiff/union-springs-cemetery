import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function NewPlotsDataTable({ batchId, filters = { status: 'All', section: 'All' } }) {
  const [limit, setLimit] = React.useState(200);
  const rowsQuery = useQuery({
    queryKey: ["newPlots", batchId, limit],
    enabled: !!batchId,
    queryFn: async () => base44.entities.NewPlot.filter({ batch_id: batchId }, "-created_date", limit),
    initialData: [],
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const filteredRows = React.useMemo(() => {
    const list = rowsQuery.data || [];
    return list.filter((r) => {
      const statusOk = !filters || filters.status === 'All' || r.status === filters.status;
      const secRaw = String(r.section || '').replace(/Section\s*/i, '').trim();
      const filterSec = (filters?.section || 'All').replace(/Section\s*/i, '').trim();
      const sectionOk = !filters || filterSec === 'All' || secRaw === filterSec;

      const ownerOk = !filters?.owner || String(r.family_name || '').toLowerCase().includes(String(filters.owner).toLowerCase());

      const plotFilter = (filters?.plot || '').toString().trim();
      let plotOk = true;
      if (plotFilter) {
        const plotStr = String(r.plot_number || '').toLowerCase();
        const wanted = plotFilter.toLowerCase();
        const numItem = parseInt(plotStr.replace(/\D/g, '')) || 0;
        const numWanted = /^[0-9]+$/.test(wanted) ? parseInt(wanted, 10) : null;
        plotOk = numWanted != null ? (numItem === numWanted) : plotStr.includes(wanted);
      }

      const generalSearch = (filters?.search || '').toString().trim().toLowerCase();
      const generalOk = !generalSearch || [
        r.plot_number,
        r.row_number,
        r.section,
        r.first_name,
        r.last_name,
        r.family_name,
        r.notes
      ].map(v => String(v || '').toLowerCase()).join(' ').includes(generalSearch);

      return statusOk && sectionOk && ownerOk && plotOk && generalOk;
    });
  }, [rowsQuery.data, filters]);

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
      ) : filteredRows.length === 0 ? (
        <div className="p-4 text-sm text-gray-500">No rows match these filters.</div>
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
              {filteredRows.map((r) => (
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