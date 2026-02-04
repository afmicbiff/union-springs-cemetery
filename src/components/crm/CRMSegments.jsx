import React, { useState, useMemo, memo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SegmentRow = memo(({ m }) => (
  <tr className="border-t">
    <td className="py-2 pr-3 text-sm">{m.first_name} {m.last_name}</td>
    <td className="py-2 pr-3 text-xs text-stone-600 hidden sm:table-cell">{m.email_primary || '—'}</td>
    <td className="py-2 pr-3 text-xs hidden md:table-cell">{Array.isArray(m.interests) && m.interests.length ? m.interests.slice(0,3).join(", ") : '—'}</td>
  </tr>
));

export default function CRMSegments() {
  const [interest, setInterest] = useState("");
  const [hasInvoice, setHasInvoice] = useState("any");
  const [hasReservation, setHasReservation] = useState("any");

  // Reuse cached queries from ContactsTable
  const { data: members = [] } = useQuery({ 
    queryKey: ["crm-members"], 
    queryFn: () => base44.entities.Member.list("-updated_date", 100), 
    staleTime: 3 * 60_000,
    initialData: [] 
  });
  const { data: invoices = [] } = useQuery({ 
    queryKey: ["crm-invoices"], 
    queryFn: () => base44.entities.Invoice.list("-created_date", 200), 
    staleTime: 5 * 60_000,
    initialData: [] 
  });
  const { data: reservations = [] } = useQuery({ 
    queryKey: ["crm-reservations"], 
    queryFn: () => base44.entities.Reservation.list("-date", 200), 
    staleTime: 5 * 60_000,
    initialData: [] 
  });

  const result = useMemo(() => {
    const invSet = new Set(invoices.map((i) => i.member_id).filter(Boolean));
    const resSet = new Set(reservations.map((r) => (r.owner_email || "").toLowerCase()).filter(Boolean));
    const interestLower = interest.toLowerCase();

    return members.filter((m) => {
      const invoiceOk = hasInvoice === "any" || (hasInvoice === "yes" ? invSet.has(m.id) : !invSet.has(m.id));
      const reservationOk = hasReservation === "any" || (hasReservation === "yes" ? resSet.has((m.email_primary||"").toLowerCase()) : !resSet.has((m.email_primary||"").toLowerCase()));
      const interestOk = !interest || (Array.isArray(m.interests) && m.interests.some((x) => x.toLowerCase().includes(interestLower)));
      return invoiceOk && reservationOk && interestOk;
    }).slice(0, 50);
  }, [members, invoices, reservations, interest, hasInvoice, hasReservation]);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-3">
        <div>
          <label className="text-xs block mb-1">Interest</label>
          <Input placeholder="e.g., events" value={interest} onChange={(e) => setInterest(e.target.value)} className="h-9" />
        </div>
        <div>
          <label className="text-xs block mb-1">Invoices</label>
          <Select value={hasInvoice} onValueChange={setHasInvoice}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs block mb-1">Reservations</label>
          <Select value={hasReservation} onValueChange={setHasReservation}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="text-xs text-stone-500 mb-2">{result.length} match{result.length >= 50 && ' (max 50)'}</div>
      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-stone-500 text-xs">
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3 hidden sm:table-cell">Email</th>
              <th className="py-2 pr-3 hidden md:table-cell">Interests</th>
            </tr>
          </thead>
          <tbody>
            {result.map((m) => <SegmentRow key={m.id} m={m} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}