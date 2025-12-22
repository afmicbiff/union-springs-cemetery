import React from "react";
import clsx from "clsx";

const STATUS_COLORS = {
  Available: "bg-green-500",
  "Pending Reservation": "bg-amber-500",
  Reserved: "bg-yellow-500",
  Occupied: "bg-red-500",
  Veteran: "bg-blue-600",
  Unavailable: "bg-gray-600",
  Unknown: "bg-purple-500",
  "Not Usable": "bg-gray-400",
};

export default function AdminPlotMap({ plots = [], onSelect }) {
  const grouped = React.useMemo(() => {
    const g = {};
    (plots || []).forEach((p) => {
      const sec = String(p.section || "Unassigned");
      if (!g[sec]) g[sec] = [];
      g[sec].push(p);
    });
    Object.keys(g).forEach((k) => {
      g[k].sort((a, b) => {
        const na = parseInt(String(a.plot_number).replace(/\D/g, "")) || 0;
        const nb = parseInt(String(b.plot_number).replace(/\D/g, "")) || 0;
        if (na !== nb) return na - nb;
        return String(a.plot_number).localeCompare(String(b.plot_number));
      });
    });
    return g;
  }, [plots]);

  const sectionKeys = React.useMemo(() => Object.keys(grouped).sort(), [grouped]);

  return (
    <div className="space-y-8">
      {sectionKeys.length === 0 ? (
        <div className="text-sm text-gray-500">No plots to display.</div>
      ) : (
        sectionKeys.map((sec) => (
          <div key={sec}>
            <div className="flex items-end gap-3 mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Section {sec}</h3>
              <span className="text-xs text-gray-500">{grouped[sec].length} plots</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
              {grouped[sec].map((p) => {
                const st = p.status && STATUS_COLORS[p.status] ? p.status : "Unknown";
                const dot = STATUS_COLORS[st] || STATUS_COLORS.Unknown;
                const title = `Plot ${p.plot_number || ''} • Row ${p.row_number || '-'} • ${p.status || 'Unknown'}`;
                return (
                  <button
                    key={p.id}
                    title={title}
                    onClick={() => onSelect && onSelect(p)}
                    className={clsx(
                      "text-left border border-gray-200 rounded-md p-2 bg-gray-50 hover:bg-gray-100 transition",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-mono text-gray-800 font-semibold truncate">
                        {p.plot_number}
                      </div>
                      <span className={clsx("w-3 h-3 rounded-full", dot)}></span>
                    </div>
                    <div className="mt-1 text-[11px] text-gray-600 truncate">Row: {p.row_number || '-'}</div>
                    <div className="mt-0.5 text-[11px] text-gray-600 truncate">
                      {[p.first_name, p.last_name].filter(Boolean).join(" ") || p.family_name || ""}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}