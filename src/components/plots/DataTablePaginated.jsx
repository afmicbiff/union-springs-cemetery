import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import PlotTableRow from "@/components/plots/PlotTableRow";

export default function DataTablePaginated({ page, setPage, filters, isAdmin, editingId, inlineEditData, onInlineChange, onInlineSave, onInlineCancel, onInlineEditStart, onEditClick }) {
  const { data, isFetching } = useQuery({
    queryKey: [
      'plotsTable',
      {
        q: filters.search || '',
        status: filters.status,
        birthMin: filters.birthYearStart,
        birthMax: filters.birthYearEnd,
        deathMin: filters.deathYearStart,
        deathMax: filters.deathYearEnd,
        page
      }
    ],
    queryFn: async () => {
      const payload = {
        query: (filters.search || '').toString().trim() || undefined,
        status: filters.status === 'All' ? undefined : filters.status,
        birth_year_min: filters.birthYearStart || undefined,
        birth_year_max: filters.birthYearEnd || undefined,
        death_year_min: filters.deathYearStart || undefined,
        death_year_max: filters.deathYearEnd || undefined,
        page,
        limit: 50
      };
      const res = await base44.functions.invoke('searchPlots', payload);
      return res.data;
    },
    keepPreviousData: true
  });

  const rows = (data?.results || []).map((p) => ({
    _id: p.id,
    _entity: 'Plot',
    Section: p.section,
    Row: p.row_number,
    Grave: p.plot_number,
    Status: p.status || 'Unknown',
    'First Name': p.first_name || '',
    'Last Name': p.last_name || '',
    'Family Name': p.family_name || '',
    Birth: p.birth_date || '',
    Death: p.death_date || '',
    Notes: p.notes || ''
  }));

  const totalPages = data?.pagination?.totalPages || 1;
  const canPrev = page > 1 && !isFetching;
  const canNext = page < totalPages && !isFetching;

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
      <div className="min-h-[4rem]">
        {isFetching && (
          <div className="flex items-center gap-2 p-3 text-sm text-gray-600"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        )}
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Section', 'Grave', 'Row', 'Status', 'Last Name', 'First Name', 'Dates', 'Actions'].map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row) => (
              <PlotTableRow
                key={row._id}
                row={row}
                editingId={editingId}
                inlineEditData={inlineEditData}
                STATUS_COLORS={{
                  'Available': 'bg-green-500 border-green-700',
                  'Reserved': 'bg-yellow-400 border-yellow-600',
                  'Occupied': 'bg-red-500 border-red-700',
                  'Veteran': 'bg-blue-600 border-blue-800',
                  'Unavailable': 'bg-gray-600 border-gray-800',
                  'Unknown': 'bg-purple-500 border-purple-700',
                  'Default': 'bg-gray-300 border-gray-500'
                }}
                handleInlineChange={onInlineChange}
                handleInlineSave={onInlineSave}
                handleInlineCancel={onInlineCancel}
                handleInlineEditStart={onInlineEditStart}
                handleEditClick={onEditClick}
                isAdmin={isAdmin}
              />
            ))}
            {rows.length === 0 && !isFetching && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">No results</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between p-3 border-t bg-gray-50 text-sm">
        <button
          className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={!canPrev}
        >
          Previous
        </button>
        <div className="text-gray-600">Page {data?.pagination?.page || page} of {totalPages}</div>
        <button
          className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
          onClick={() => setPage((p) => p + 1)}
          disabled={!canNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}