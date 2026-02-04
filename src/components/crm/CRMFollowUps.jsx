import React, { useMemo, useCallback, memo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const FollowUpRow = memo(({ i, onComplete, onDelay }) => (
  <tr className="border-t">
    <td className="py-2 pr-3 text-xs">{i.date}</td>
    <td className="py-2 pr-3 text-sm font-medium">{i.name}</td>
    <td className="py-2 pr-3 text-xs text-stone-600 hidden sm:table-cell">{i.email || '—'}</td>
    <td className="py-2 pr-3 text-xs capitalize hidden md:table-cell">{i.status}</td>
    <td className="py-2 pr-3 text-xs truncate max-w-[150px] hidden lg:table-cell" title={i.notes}>{i.notes || '—'}</td>
    <td className="py-2 pr-0">
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onComplete(i.id)}>Done</Button>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onDelay(i)}>+7d</Button>
      </div>
    </td>
  </tr>
));

export default function CRMFollowUps() {
  const queryClient = useQueryClient();
  const { data: members = [], isLoading } = useQuery({ 
    queryKey: ["crm-members"], 
    queryFn: () => base44.entities.Member.list("-updated_date", 100), 
    staleTime: 3 * 60_000,
    initialData: [] 
  });

  const updateMember = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Member.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crm-members"] }),
  });

  const items = useMemo(() => 
    members
      .filter((m) => m.follow_up_date && m.follow_up_status !== 'completed')
      .map((m) => ({
        id: m.id,
        name: `${m.first_name || ''} ${m.last_name || ''}`.trim(),
        email: m.email_primary,
        date: m.follow_up_date,
        notes: m.follow_up_notes,
        status: m.follow_up_status,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 30),
    [members]
  );

  const handleComplete = useCallback((id) => {
    updateMember.mutate({ id, data: { follow_up_status: 'completed' } });
  }, [updateMember]);

  const handleDelay = useCallback((i) => {
    const next = new Date(i.date);
    next.setDate(next.getDate() + 7);
    updateMember.mutate({ id: i.id, data: { follow_up_date: next.toISOString().slice(0,10), follow_up_status: 'pending' } });
  }, [updateMember]);

  if (isLoading) return <div className="py-6 text-stone-500 text-sm flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-2"/>Loading...</div>;

  return (
    <div className="overflow-x-auto -mx-2 sm:mx-0">
      {items.length === 0 ? (
        <div className="py-6 text-stone-500 text-sm">No pending follow-ups.</div>
      ) : (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-stone-500 text-xs">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Member</th>
              <th className="py-2 pr-3 hidden sm:table-cell">Email</th>
              <th className="py-2 pr-3 hidden md:table-cell">Status</th>
              <th className="py-2 pr-3 hidden lg:table-cell">Notes</th>
              <th className="py-2 pr-0 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <FollowUpRow key={i.id} i={i} onComplete={handleComplete} onDelay={handleDelay} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}