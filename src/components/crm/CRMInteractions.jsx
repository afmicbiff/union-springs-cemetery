import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function CRMInteractions() {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["crm-members"],
    queryFn: () => base44.entities.Member.list("-updated_date", 500),
    initialData: [],
  });

  const interactions = [];
  members.forEach((m) => {
    (m.contact_logs || []).forEach((log) => {
      interactions.push({
        member: m,
        ...log,
      });
    });
  });
  interactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div className="overflow-x-auto">
      {isLoading ? (
        <div className="py-6 text-stone-500 text-sm">Loading interactions...</div>
      ) : interactions.length === 0 ? (
        <div className="py-6 text-stone-500 text-sm">No interactions recorded yet.</div>
      ) : (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-stone-500">
              <th className="py-2 pr-4">When</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Member</th>
              <th className="py-2 pr-4">Note</th>
              <th className="py-2 pr-4">By</th>
            </tr>
          </thead>
          <tbody>
            {interactions.slice(0, 200).map((i, idx) => (
              <tr key={idx} className="border-t">
                <td className="py-2 pr-4">{new Date(i.timestamp).toLocaleString()}</td>
                <td className="py-2 pr-4 capitalize">{i.type}</td>
                <td className="py-2 pr-4">{i.member.first_name} {i.member.last_name}</td>
                <td className="py-2 pr-4 max-w-xl truncate" title={i.note}>{i.note}</td>
                <td className="py-2 pr-4">{i.logged_by || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}