import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Database } from "lucide-react";

function formatDate(d) {
  try { return d ? new Date(d).toLocaleString() : ""; } catch { return String(d || ""); }
}

export default function BatchesList({ batches, isLoading, onRefresh, selectedBatchId, onSelectBatch }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2 text-gray-700 font-semibold">
          <Database className="w-4 h-4" /> Import Batches
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} className="h-8">
          <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>
      <div className="divide-y divide-gray-100 max-h-[480px] overflow-auto">
        {isLoading && <div className="p-4 text-sm text-gray-500">Loading batches…</div>}
        {!isLoading && (!batches || batches.length === 0) && (
          <div className="p-4 text-sm text-gray-500">No imports yet. Use Import to upload a CSV/Excel.</div>
        )}
        {batches?.map((b) => (
          <button
            key={b.id}
            onClick={() => onSelectBatch(b.id)}
            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${selectedBatchId === b.id ? "bg-teal-50" : "bg-white"}`}
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
  );
}