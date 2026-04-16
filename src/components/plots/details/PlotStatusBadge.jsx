import React from "react";

const STATUS_STYLES = {
  Available: "bg-green-100 text-green-800 border-green-300",
  "Pending Reservation": "bg-amber-100 text-amber-800 border-amber-300",
  Reserved: "bg-yellow-100 text-yellow-800 border-yellow-300",
  Occupied: "bg-red-100 text-red-800 border-red-300",
  Veteran: "bg-blue-100 text-blue-800 border-blue-300",
  Unavailable: "bg-gray-100 text-gray-700 border-gray-300",
  Unknown: "bg-purple-100 text-purple-800 border-purple-300",
  "Not Usable": "bg-gray-100 text-gray-600 border-gray-300",
};

export default function PlotStatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.Unknown;
  return (
    <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full border ${style}`}>
      {status || "Unknown"}
    </span>
  );
}