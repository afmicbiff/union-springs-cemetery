import React, { useState, useMemo, useCallback, memo, lazy, Suspense } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Loader2 } from "lucide-react";

// Lazy load dialogs
const Dialog = lazy(() => import("@/components/ui/dialog").then(m => ({ default: m.Dialog })));
const DialogContent = lazy(() => import("@/components/ui/dialog").then(m => ({ default: m.DialogContent })));
const DialogHeader = lazy(() => import("@/components/ui/dialog").then(m => ({ default: m.DialogHeader })));
const DialogTitle = lazy(() => import("@/components/ui/dialog").then(m => ({ default: m.DialogTitle })));
const InteractionDialog = lazy(() => import("./InteractionDialog"));
const ContactForm = lazy(() => import("./ContactForm"));

// Memoized table row
const ContactRow = memo(({ m, invCount, resCount, overdue, onInteraction, onEdit, onSchedule }) => (
  <tr className="border-t">
    <td className="py-2 pr-3 font-medium text-sm">{m.first_name} {m.last_name}</td>
    <td className="py-2 pr-3 text-xs text-stone-600 hidden sm:table-cell">{m.email_primary || '—'}</td>
    <td className="py-2 pr-3 text-xs hidden md:table-cell">{invCount}</td>
    <td className="py-2 pr-3 text-xs hidden md:table-cell">{resCount}</td>
    <td className="py-2 pr-3 hidden sm:table-cell">
      {m.follow_up_date ? (
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-stone-400" />
          <span className={`text-xs ${overdue ? 'text-red-600' : ''}`}>{m.follow_up_date}</span>
        </div>
      ) : <span className="text-stone-300">—</span>}
    </td>
    <td className="py-2 pr-0">
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onInteraction(m)}>Log</Button>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onEdit(m)}>Edit</Button>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs hidden sm:inline-flex" onClick={() => onSchedule(m)}>+7d</Button>
      </div>
    </td>
  </tr>
));

export default function CRMContacts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["crm-members"],
    queryFn: () => base44.entities.Member.list("-updated_date", 100),
    staleTime: 3 * 60_000,
    gcTime: 10 * 60_000,
    initialData: [],
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["crm-invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 200),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    initialData: [],
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ["crm-reservations"],
    queryFn: () => base44.entities.Reservation.list("-date", 200),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    initialData: [],
  });

  const updateMember = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Member.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crm-members"] }),
  });

  const { filtered, invMap, resMapByEmail } = useMemo(() => {
    const searchLower = search.toLowerCase();
    const fil = members.filter((m) => {
      const t = `${m.first_name || ""} ${m.last_name || ""} ${m.email_primary || ""}`.toLowerCase();
      return !search || t.includes(searchLower);
    }).slice(0, 50); // Limit to 50 for mobile perf

    const inv = invoices.reduce((acc, i) => {
      if (i.member_id) acc[i.member_id] = (acc[i.member_id] || 0) + 1;
      return acc;
    }, {});

    const res = reservations.reduce((acc, r) => {
      const key = (r.owner_email || "").toLowerCase();
      if (key) acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return { filtered: fil, invMap: inv, resMapByEmail: res };
  }, [members, invoices, reservations, search]);

  const handleInteraction = useCallback((m) => { setSelected(m); setOpen(true); }, []);
  const handleEdit = useCallback((m) => { setEditMember(m); setEditOpen(true); }, []);
  const handleSchedule = useCallback((m) => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    updateMember.mutate({ id: m.id, data: { follow_up_date: date.toISOString().slice(0,10), follow_up_status: 'pending' } });
  }, [updateMember]);

  const today = useMemo(() => new Date(), []);

  return (
    <div>
      <div className="mb-3">
        <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9" />
      </div>

      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-stone-500 text-xs">
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3 hidden sm:table-cell">Email</th>
              <th className="py-2 pr-3 hidden md:table-cell">Inv</th>
              <th className="py-2 pr-3 hidden md:table-cell">Res</th>
              <th className="py-2 pr-3 hidden sm:table-cell">Follow-up</th>
              <th className="py-2 pr-0 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="py-6 text-center text-stone-500"><Loader2 className="inline w-4 h-4 mr-1 animate-spin"/>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-6 text-center text-stone-500">No members found.</td></tr>
            ) : (
              filtered.map((m) => {
                const invCount = invMap[m.id] || 0;
                const resCount = resMapByEmail[(m.email_primary || "").toLowerCase()] || 0;
                const due = m.follow_up_date ? new Date(m.follow_up_date) : null;
                const overdue = due && due < today && m.follow_up_status !== 'completed';
                return (
                  <ContactRow
                    key={m.id}
                    m={m}
                    invCount={invCount}
                    resCount={resCount}
                    overdue={overdue}
                    onInteraction={handleInteraction}
                    onEdit={handleEdit}
                    onSchedule={handleSchedule}
                  />
                );
              })
            )}
          </tbody>
        </table>
        {filtered.length >= 50 && <p className="text-xs text-stone-400 mt-2 text-center">Showing first 50 results</p>}
      </div>

      {/* Dialogs only render when open */}
      {open && selected && (
        <Suspense fallback={null}>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Log Interaction</DialogTitle></DialogHeader>
              <Suspense fallback={<div className="py-4 text-center"><Loader2 className="w-5 h-5 animate-spin inline" /></div>}>
                <InteractionDialog
                  member={selected}
                  onClose={() => { setOpen(false); setSelected(null); }}
                  onSaved={() => queryClient.invalidateQueries({ queryKey: ["crm-members"] })}
                />
              </Suspense>
            </DialogContent>
          </Dialog>
        </Suspense>
      )}

      {editOpen && editMember && (
        <Suspense fallback={null}>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Edit Contact</DialogTitle></DialogHeader>
              <Suspense fallback={<div className="py-4 text-center"><Loader2 className="w-5 h-5 animate-spin inline" /></div>}>
                <ContactForm
                  initial={editMember}
                  onCancel={() => { setEditOpen(false); setEditMember(null); }}
                  onSave={(data) => {
                    updateMember.mutate({ id: editMember.id, data });
                    setEditOpen(false);
                    setEditMember(null);
                  }}
                />
              </Suspense>
            </DialogContent>
          </Dialog>
        </Suspense>
      )}
    </div>
  );
}