import React, { useMemo, memo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

const InteractionRow = memo(({ i }) => (
  <tr className="border-t">
    <td className="py-2 pr-3 text-xs">{new Date(i.timestamp).toLocaleDateString()}</td>
    <td className="py-2 pr-3 text-xs capitalize">{i.type}</td>
    <td className="py-2 pr-3 text-sm">{i.member.first_name} {i.member.last_name}</td>
    <td className="py-2 pr-3 text-xs max-w-[200px] truncate hidden sm:table-cell" title={i.note}>{i.note}</td>
    <td className="py-2 pr-3 text-xs text-stone-500 hidden md:table-cell">{i.logged_by || '—'}</td>
  </tr>
));

export default function CRMInteractions() {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["crm-members"],
    queryFn: () => base44.entities.Member.list("-updated_date", 100),
    staleTime: 3 * 60_000,
    initialData: [],
  });

  const interactions = useMemo(() => {
    const arr = [];
    members.forEach((m) => {
      (m.contact_logs || []).slice(0, 10).forEach((log) => {
        arr.push({ member: m, ...log });
      });
    });
    return arr.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 50);
  }, [members]);

  return (
    <div className="overflow-x-auto -mx-2 sm:mx-0">
      {isLoading ? (
        <div className="py-6 text-stone-500 text-sm flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-2"/>Loading...</div>
      ) : interactions.length === 0 ? (
        <div className="py-6 text-stone-500 text-sm">No interactions recorded yet.</div>
      ) : (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-stone-500 text-xs">
              <th className="py-2 pr-3">When</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Member</th>
              <th className="py-2 pr-3 hidden sm:table-cell">Note</th>
              <th className="py-2 pr-3 hidden md:table-cell">By</th>
            </tr>
          </thead>
          <tbody>
            {interactions.map((i, idx) => <InteractionRow key={idx} i={i} />)}
          </tbody>
        </table>
      )}
    </div>
  );
}