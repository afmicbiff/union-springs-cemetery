import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Check, X, ClipboardList } from "lucide-react";

function ReservationStatusBadge({ status }) {
  const isPending = status === "Pending" || status === "Pending Review";
  const isConfirmed = status === "Confirmed";
  const cls = isPending
    ? "bg-amber-50 border-amber-200 text-amber-700"
    : isConfirmed
    ? "bg-green-50 border-green-200 text-green-700"
    : "bg-red-50 border-red-200 text-red-700";
  return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${cls}`}>{status}</span>;
}

function AdminReservationCard({ resv, onConfirm, onReject, isConfirming, isRejecting }) {
  const isPending = resv.status === "Pending" || resv.status === "Pending Review";
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-gray-200 rounded-lg p-4 bg-gray-50/50">
      <div className="space-y-1 min-w-0">
        <div className="text-sm font-semibold text-gray-900 truncate">
          {resv.requester_name} <span className="text-gray-400 font-normal">({resv.requester_email || "n/a"})</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ReservationStatusBadge status={resv.status} />
          {resv.donation_amount && <span className="text-xs text-gray-500">Donation: ${resv.donation_amount}</span>}
        </div>
        {resv.notes && <p className="text-xs text-gray-500 mt-1">{resv.notes}</p>}
        {resv.rejection_reason && <p className="text-xs text-red-600 mt-1">Reason: {resv.rejection_reason}</p>}
      </div>
      {isPending && (
        <div className="flex gap-2 shrink-0">
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1" onClick={() => onConfirm(resv)} disabled={isConfirming}>
            {isConfirming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Confirm
          </Button>
          <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 gap-1" onClick={() => onReject(resv)} disabled={isRejecting}>
            <X className="w-3 h-3" /> Reject
          </Button>
        </div>
      )}
    </div>
  );
}

export function AdminReservations({ reservations, isLoading, onConfirm, onReject, isConfirming, isRejecting }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-2 pb-2 mb-3 border-b border-gray-100">
        <ClipboardList className="w-4 h-4 text-teal-600" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Reservations</h3>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading reservations…
        </div>
      ) : !reservations?.length ? (
        <p className="text-sm text-gray-400 py-2">No reservation requests yet.</p>
      ) : (
        <div className="space-y-3">
          {reservations.map((resv) => (
            <AdminReservationCard
              key={resv.id}
              resv={resv}
              onConfirm={onConfirm}
              onReject={onReject}
              isConfirming={isConfirming}
              isRejecting={isRejecting}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function UserReservations({ reservations, userEmail }) {
  const [viewerEmail, setViewerEmail] = React.useState("");
  const email = userEmail || viewerEmail;
  const mine = (reservations || []).filter(
    (r) => email && (r.requester_email || "").toLowerCase() === email.toLowerCase()
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-2 pb-2 mb-3 border-b border-gray-100">
        <ClipboardList className="w-4 h-4 text-teal-600" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Your Reservation Request</h3>
      </div>
      {!userEmail && (
        <div className="flex flex-col sm:flex-row gap-2 items-end mb-3">
          <div className="flex-1 w-full">
            <label className="text-xs text-gray-500 mb-1 block">Enter your email to check status</label>
            <Input type="email" value={viewerEmail} onChange={(e) => setViewerEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <Button onClick={() => setViewerEmail(viewerEmail.trim())} size="sm">Check</Button>
        </div>
      )}
      {email && (
        mine.length === 0 ? (
          <p className="text-sm text-gray-400">No requests found for {email}.</p>
        ) : (
          <div className="space-y-2">
            {mine.map((r) => (
              <div key={r.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50/50 space-y-1">
                <ReservationStatusBadge status={r.status} />
                {r.donation_amount && <p className="text-xs text-gray-600">Donation: ${r.donation_amount}</p>}
                {r.requested_date && <p className="text-xs text-gray-500">Requested: {r.requested_date}</p>}
                {r.confirmed_date && <p className="text-xs text-green-700">Confirmed: {r.confirmed_date}</p>}
                {r.rejected_date && <p className="text-xs text-red-700">Rejected: {r.rejected_date}</p>}
                {r.rejection_reason && <p className="text-xs text-red-600">Reason: {r.rejection_reason}</p>}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}