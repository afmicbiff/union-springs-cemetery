import React from "react";
import { MapPin, User, Calendar, FileText, Settings } from "lucide-react";
import PlotStatusBadge from "./PlotStatusBadge";

function InfoField({ label, value, className = "" }) {
  return (
    <div className={className}>
      <dt className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-900 font-medium">{value || "—"}</dd>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 pb-2 mb-3 border-b border-gray-100">
      <Icon className="w-4 h-4 text-teal-600" />
      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">{title}</h3>
    </div>
  );
}

export default function PlotInfoGrid({ row, isAdmin }) {
  return (
    <div className="space-y-6">
      {/* Location & Status */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <SectionHeader icon={MapPin} title="Location & Status" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <InfoField label="Section" value={row.section} />
          <InfoField label="Row" value={row.row_number} />
          <InfoField label="Plot #" value={row.plot_number} />
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Status</dt>
            <dd><PlotStatusBadge status={row.status} /></dd>
          </div>
        </div>
      </div>

      {/* Occupant / Owner */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <SectionHeader icon={User} title="Occupant / Owner" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoField label="First Name" value={row.first_name} />
          <InfoField label="Last Name" value={row.last_name} />
          <InfoField label="Family / Owner" value={row.family_name} />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <InfoField label="Birth Date" value={row.birth_date} />
          <InfoField label="Death Date" value={row.death_date} />
        </div>
      </div>

      {/* Notes */}
      {row.notes && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <SectionHeader icon={FileText} title="Notes" />
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{row.notes}</p>
        </div>
      )}

      {/* Admin-only: Reservation & System */}
      {isAdmin && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <SectionHeader icon={Calendar} title="Reservation Admin" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <InfoField label="Reservation Expiry" value={row.reservation_expiry_date} />
            <InfoField label="Responsible Admin" value={row.assigned_admin_email} />
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <SectionHeader icon={Settings} title="System" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InfoField label="Matched Plot ID" value={row.matched_plot_id} />
            <InfoField label="Action Taken" value={row.action_taken} />
            <InfoField label="Error" value={row.error} />
          </div>
        </div>
      )}
    </div>
  );
}