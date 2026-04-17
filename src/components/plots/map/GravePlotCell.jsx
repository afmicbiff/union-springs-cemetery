import React from "react";

const STATUS_DOT = {
  Available: "bg-green-500",
  "Pending Reservation": "bg-amber-500",
  Reserved: "bg-yellow-400",
  Occupied: "bg-red-500",
  Veteran: "bg-blue-600",
  Unavailable: "bg-gray-500",
  Unknown: "bg-purple-500",
  "Not Usable": "bg-gray-400",
  Default: "bg-gray-300",
};

const GravePlotCell = React.memo(function GravePlotCell({ data, onHover, onClick, hideLabel = false }) {
  if (!data || data.isSpacer) {
    return <div className="w-[68px] h-[38px] border-r border-gray-100/50" aria-hidden="true" />;
  }

  const isVet =
    data.Status === "Veteran" ||
    ((data.Notes || "").toLowerCase().includes("vet") && data.Status === "Occupied");
  const statusKey = isVet ? "Veteran" : data.Status || "Unknown";
  const dotBg = STATUS_DOT[statusKey] || STATUS_DOT.Default;
  const lastName = data.lastname || data.FamilyName || "";
  const display = lastName.length > 9 ? lastName.substring(0, 9) + "…" : lastName;
  const graveLabel = data.Grave || "";
  const ariaLabel = `Plot ${graveLabel}, Row ${data.Row || "unknown"}, ${statusKey}${lastName ? `, ${data.FirstName || ""} ${lastName}` : ""}`;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick && data) onClick(data);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          if (onClick && data) onClick(data);
        }
      }}
      onMouseEnter={(e) => onHover(e, data)}
      onMouseLeave={() => onHover(null, null)}
      onFocus={(e) => onHover(e, data)}
      onBlur={() => onHover(null, null)}
      className="w-[68px] h-[38px] px-0.5 flex items-center gap-0.5 border-r border-gray-200/50 cursor-pointer hover:bg-yellow-50 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-inset focus-visible:outline-none transition-colors plot-element"
      title={`#${graveLabel} ${data.Row || ""} - ${statusKey}`}
    >
      <div className={`w-2 h-2 rounded-full shrink-0 ${dotBg}`} aria-hidden="true" />
      <div className="flex flex-col leading-none min-w-0 overflow-hidden">
        {!hideLabel && <span className="text-[9px] font-bold text-gray-800 truncate">#{graveLabel}</span>}
        {!hideLabel && display && <span className="text-[7px] text-gray-500 truncate">{display}</span>}
      </div>
    </div>
  );
});

export default GravePlotCell;