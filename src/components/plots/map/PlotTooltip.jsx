import React from "react";

const STATUS_COLORS = {
  Available: "bg-green-500",
  "Pending Reservation": "bg-amber-500",
  Reserved: "bg-yellow-400",
  Occupied: "bg-red-500",
  Veteran: "bg-blue-600",
  Unavailable: "bg-gray-600",
  Unknown: "bg-purple-500",
  "Not Usable": "bg-gray-400",
  Default: "bg-gray-300",
};

const STATUS_BADGE = {
  Available: "bg-green-100 text-green-800 border-green-300",
  "Pending Reservation": "bg-amber-100 text-amber-800 border-amber-300",
  Reserved: "bg-yellow-100 text-yellow-800 border-yellow-300",
  Occupied: "bg-red-100 text-red-800 border-red-300",
  Veteran: "bg-blue-100 text-blue-800 border-blue-300",
  Unavailable: "bg-gray-100 text-gray-800 border-gray-300",
  Unknown: "bg-purple-100 text-purple-800 border-purple-300",
  "Not Usable": "bg-gray-100 text-gray-600 border-gray-300",
  Default: "bg-gray-100 text-gray-600 border-gray-300",
};

function resolveStatus(data) {
  if (!data) return "Default";
  const isVet = data.Status === "Veteran" || (data.Notes && data.Notes.toLowerCase().includes("vet"));
  if (isVet) return "Veteran";
  return STATUS_COLORS[data.Status] ? data.Status : "Default";
}

const PlotTooltip = React.memo(function PlotTooltip({ data, position, visible }) {
  if (!visible || !data) return null;

  const statusKey = resolveStatus(data);
  const bgClass = STATUS_COLORS[statusKey] || STATUS_COLORS.Default;
  const badgeClass = STATUS_BADGE[statusKey] || STATUS_BADGE.Default;
  const isOccupied = statusKey === "Occupied" || statusKey === "Veteran";
  const hasOccupant = isOccupied || data.FirstName || data.lastname;

  // Position tooltip near the hovered element, not dead center
  const style = {
    top: Math.max(8, Math.min(position.y - 120, window.innerHeight - 340)),
    left: Math.max(8, Math.min(position.x + 12, window.innerWidth - 340)),
  };

  return (
    <div
      role="tooltip"
      aria-live="polite"
      className="fixed z-[9999] pointer-events-none"
      style={style}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-gray-200 w-72 overflow-hidden"
        style={{ boxShadow: "0 20px 40px -8px rgba(0,0,0,0.2)" }}
      >
        {/* Header */}
        <div className={`px-4 py-3 ${bgClass} bg-opacity-15 border-b border-gray-100`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${bgClass} ring-2 ring-white shadow-sm`} />
              <span className="font-bold text-gray-900 text-lg">Plot {data.Grave}</span>
              <span className="text-xs text-gray-500 font-medium">Row {data.Row}</span>
            </div>
            <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${badgeClass}`}>
              {statusKey}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          {hasOccupant ? (
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Occupant</p>
                <p className="font-bold text-gray-900 text-base leading-tight mt-0.5">
                  {data.FirstName} {data.lastname}
                </p>
                {data.FamilyName && (
                  <p className="text-xs text-gray-500 mt-0.5">Family: {data.FamilyName}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                  <p className="text-[9px] text-blue-400 uppercase font-bold tracking-wider">Born</p>
                  <p className="font-semibold text-blue-900 text-xs">{data.Birth || "—"}</p>
                </div>
                <div className="bg-rose-50 p-2 rounded-lg border border-rose-100">
                  <p className="text-[9px] text-rose-400 uppercase font-bold tracking-wider">Died</p>
                  <p className="font-semibold text-rose-900 text-xs">{data.Death || "—"}</p>
                </div>
              </div>
              {data.Notes && (
                <p className="text-xs text-gray-500 italic border-t border-gray-100 pt-2">{data.Notes}</p>
              )}
            </div>
          ) : (
            <div className="text-center py-3">
              <div className={`w-8 h-8 mx-auto mb-2 rounded-full ${bgClass} bg-opacity-25 flex items-center justify-center`}>
                <span className={`w-3 h-3 rounded-full ${bgClass}`} />
              </div>
              <p className="text-sm text-gray-700 font-medium">
                {data.Status === "Reserved"
                  ? `Reserved for ${data.FamilyName || data.Notes || "Family"}`
                  : data.Status === "Available"
                  ? "This plot is available"
                  : data.Status === "Pending Reservation"
                  ? "Pending reservation approval"
                  : `Status: ${data.Status}`}
              </p>
              {data.Notes && data.Status !== "Reserved" && (
                <p className="text-xs text-gray-500 mt-1 italic">{data.Notes}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default PlotTooltip;