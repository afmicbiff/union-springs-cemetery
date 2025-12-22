import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import InteractionDialog from "./InteractionDialog";
import { Calendar, Plus } from "lucide-react";

export default function CRMContacts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState(null);
  const [open, setOpen] = React.useState(false);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["crm-members"],
    queryFn: () => base44.entities.Member.list("-updated_date", 500),
    initialData: [],
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["crm-invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 1000),
    initialData: [],
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ["crm-reservations"],
    queryFn: () => base44.entities.Reservation.list("-date", 1000),
    initialData: [],
  });

  const updateMember = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Member.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crm-members"] }),
  });

  const filtered = members.filter((m) => {
    const t = `${m.first_name || ""} ${m.last_name || ""} ${m.email_primary || ""}`.toLowerCase();
    return !search || t.includes(search.toLowerCase());
  });

  const invMap = invoices.reduce((acc, inv) => {
    if (inv.member_id) acc[inv.member_id] = (acc[inv.member_id] || 0) + 1;
    return acc;
  }, {});

  const resMapByEmail = reservations.reduce((acc, r) => {
    const key = (r.owner_email || "").toLowerCase();
    if (key) acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <Input placeholder="Search members by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-stone-500">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Invoices</th>
              <th className="py-2 pr-4">Reservations</th>
              <th className="py-2 pr-4">Follow-up</th>
              <th className="py-2 pr-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="py-6 text-center text-stone-500">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-6 text-center text-stone-500">No members found.</td></tr>
            ) : (
              filtered.map((m) => {
                const invCount = invMap[m.id] || 0;
                const resCount = resMapByEmail[(m.email_primary || "").toLowerCase()] || 0;
                const due = m.follow_up_date ? new Date(m.follow_up_date) : null;
                const overdue = due && due < new Date() && m.follow_up_status !== 'completed';
                return (
                  <tr key={m.id} className="border-t">
                    <td className="py-2 pr-4 font-medium">{m.first_name} {m.last_name}</td>
                    <td className="py-2 pr-4">{m.email_primary || '—'}</td>
                    <td className="py-2 pr-4">{invCount}</td>
                    <td className="py-2 pr-4">{resCount}</td>
                    <td className="py-2 pr-4">
                      {m.follow_up_date ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-stone-500" />
                          <span className={overdue ? 'text-red-600' : ''}>{m.follow_up_date}</span>
                          <Badge variant="outline">{m.follow_up_status}</Badge>
                        </div>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-0">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setSelected(m); setOpen(true); }}>Log Interaction</Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          const date = new Date();
                          date.setDate(date.getDate() + 7);
                          updateMember.mutate({ id: m.id, data: { follow_up_date: date.toISOString().slice(0,10), follow_up_status: 'pending' } });
                        }}>Schedule +7d</Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Interaction</DialogTitle>
          </DialogHeader>
          {selected && (
            <InteractionDialog
              member={selected}
              onClose={() => { setOpen(false); setSelected(null); }}
              onSaved={() => queryClient.invalidateQueries({ queryKey: ["crm-members"] })}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}