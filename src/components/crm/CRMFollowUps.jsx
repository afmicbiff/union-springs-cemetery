import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

export default function CRMFollowUps() {
  const queryClient = useQueryClient();
  const { data: members = [], isLoading } = useQuery({ queryKey: ["crm-members"], queryFn: () => base44.entities.Member.list("-updated_date", 500), initialData: [] });

  const updateMember = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Member.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crm-members"] }),
  });

  const items = members
    .filter((m) => m.follow_up_date && m.follow_up_status !== 'completed')
    .map((m) => ({
      id: m.id,
      name: `${m.first_name || ''} ${m.last_name || ''}`.trim(),
      email: m.email_primary,
      date: m.follow_up_date,
      notes: m.follow_up_notes,
      status: m.follow_up_status,
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (isLoading) return <div className="py-6 text-stone-500 text-sm">Loading follow-ups...</div>;

  return (
    <div className="overflow-x-auto">
      {items.length === 0 ? (
        <div className="py-6 text-stone-500 text-sm">No pending follow-ups.</div>
      ) : (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-stone-500">
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Member</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Notes</th>
              <th className="py-2 pr-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="py-2 pr-4">{i.date}</td>
                <td className="py-2 pr-4">{i.name}</td>
                <td className="py-2 pr-4">{i.email || '—'}</td>
                <td className="py-2 pr-4 capitalize">{i.status}</td>
                <td className="py-2 pr-4 truncate max-w-xl" title={i.notes}>{i.notes || '—'}</td>
                <td className="py-2 pr-0">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => updateMember.mutate({ id: i.id, data: { follow_up_status: 'completed' } })}>Mark Completed</Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      const next = new Date(i.date);
                      next.setDate(next.getDate() + 7);
                      updateMember.mutate({ id: i.id, data: { follow_up_date: next.toISOString().slice(0,10), follow_up_status: 'pending' } });
                    }}>+7d</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}