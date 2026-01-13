import React from "react";
import { MapPin } from "lucide-react";

export default function PlotMarker({ onMouseEnter, onMouseLeave, onClick, selected }) {
  return (
    <button
      type="button"
      aria-label="Plot marker"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      className={
        `absolute -top-2 -left-2 h-5 w-5 rounded-full flex items-center justify-center shadow-sm border transition
         ${selected ? 'bg-teal-600 border-teal-700 text-white' : 'bg-white border-gray-300 text-teal-700 hover:bg-teal-50'}`
      }
      style={{ pointerEvents: 'auto' }}
    >
      <MapPin className="h-3 w-3" />
    </button>
  );
}