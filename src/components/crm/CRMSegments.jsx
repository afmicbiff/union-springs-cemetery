import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CRMSegments() {
  const [interest, setInterest] = React.useState("");
  const [hasInvoice, setHasInvoice] = React.useState("any");
  const [hasReservation, setHasReservation] = React.useState("any");

  const { data: members = [] } = useQuery({ queryKey: ["crm-members"], queryFn: () => base44.entities.Member.list("-updated_date", 500), initialData: [] });
  const { data: invoices = [] } = useQuery({ queryKey: ["crm-invoices"], queryFn: () => base44.entities.Invoice.list("-created_date", 1000), initialData: [] });
  const { data: reservations = [] } = useQuery({ queryKey: ["crm-reservations"], queryFn: () => base44.entities.Reservation.list("-date", 1000), initialData: [] });

  const invSet = new Set(invoices.map((i) => i.member_id).filter(Boolean));
  const resSet = new Set(reservations.map((r) => (r.owner_email || "").toLowerCase()).filter(Boolean));

  const result = members.filter((m) => {
    const invoiceOk = hasInvoice === "any" || (hasInvoice === "yes" ? invSet.has(m.id) : !invSet.has(m.id));
    const reservationOk = hasReservation === "any" || (hasReservation === "yes" ? resSet.has((m.email_primary||"").toLowerCase()) : !resSet.has((m.email_primary||"").toLowerCase()));
    const interestOk = !interest || (Array.isArray(m.interests) && m.interests.some((x) => x.toLowerCase().includes(interest.toLowerCase())));
    return invoiceOk && reservationOk && interestOk;
  });

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-xs block mb-1">Interest contains</label>
          <Input placeholder="e.g., events" value={interest} onChange={(e) => setInterest(e.target.value)} />
        </div>
        <div>
          <label className="text-xs block mb-1">Has Invoices</label>
          <Select value={hasInvoice} onValueChange={setHasInvoice}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs block mb-1">Has Reservations</label>
          <Select value={hasReservation} onValueChange={setHasReservation}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="text-sm text-stone-600 mb-2">{result.length} members match</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-stone-500">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Interests</th>
            </tr>
          </thead>
          <tbody>
            {result.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="py-2 pr-4">{m.first_name} {m.last_name}</td>
                <td className="py-2 pr-4">{m.email_primary || '—'}</td>
                <td className="py-2 pr-4">{Array.isArray(m.interests) && m.interests.length ? m.interests.join(", ") : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}