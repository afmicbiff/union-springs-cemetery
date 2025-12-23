import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Image as ImageIcon, Save, Pencil, X, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import NewReservationDialog from "../components/plots/NewReservationDialog";

export default function NewPlotDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = React.useState(false);
  const [form, setForm] = React.useState({});
  const [reservationOpen, setReservationOpen] = React.useState(false);
  const [viewerEmail, setViewerEmail] = React.useState("");
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me().catch(() => null) });
  const isAdmin = user?.role === 'admin';

  const { data: row, isLoading } = useQuery({
    queryKey: ["newplot", id],
    enabled: !!id,
    queryFn: async () => {
      const list = await base44.entities.NewPlot.filter({ id });
      return list?.[0] || null;
    },
  });

  React.useEffect(() => {
    if (row) {
      setForm({
        section: row.section || "",
        row_number: row.row_number || "",
        plot_number: row.plot_number || "",
        status: row.status || "",
        first_name: row.first_name || "",
        last_name: row.last_name || "",
        family_name: row.family_name || "",
        birth_date: row.birth_date || "",
        death_date: row.death_date || "",
        notes: row.notes || "",
        reservation_expiry_date: row.reservation_expiry_date || "",
        assigned_admin_email: row.assigned_admin_email || "",
      });
    }
  }, [row]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.entities.NewPlot.update(id, form);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newplot", id] });
      setIsEditing(false);
    },
  });

  const { data: reservations, isLoading: reservationsLoading, refetch: refetchReservations } = useQuery({
    queryKey: ["newplot-reservations", id],
    enabled: !!id,
    queryFn: async () => base44.entities.NewPlotReservation.filter({ new_plot_id: id }, "-created_date", 100),
    initialData: [],
  });

  const confirmReservation = useMutation({
    mutationFn: async (reservation) => {
      const today = new Date().toISOString().split('T')[0];
      await base44.entities.NewPlotReservation.update(reservation.id, { status: 'Confirmed', confirmed_date: today });
      await base44.entities.NewPlot.update(id, { status: 'Reserved' });
      // In-app notification instead of external email (platform restricts emailing non-app users)
      await base44.entities.Notification.create({
        message: `Reservation confirmed for plot ${row.plot_number || ''} (Section ${row.section || ''}) for ${reservation.requester_name || 'requester'}.`,
        type: 'info',
        is_read: false,
        user_email: null,
        related_entity_id: reservation.id,
        related_entity_type: 'NewPlotReservation',
        link: createPageUrl('NewPlotDetails') + `?id=${id}`
      });

      // Send confirmation email via SendGrid (admins only)
      if (reservation.requester_email) {
        await base44.functions.invoke('sendEmail', {
          to: reservation.requester_email,
          subject: 'Your plot reservation has been confirmed',
          body: `Hello ${reservation.requester_name || ''},\n\nYour reservation for plot ${row.plot_number || ''} (Section ${row.section || ''}) has been confirmed.${reservation.donation_amount ? ` The requested donation amount is $${reservation.donation_amount}.` : ''}\n\nThank you.`,
        });
      }
    },
    onSuccess: () => {
      refetchReservations();
      queryClient.invalidateQueries({ queryKey: ["newplot", id] });
    },
  });

  const rejectReservation = useMutation({
    mutationFn: async ({ reservation, reason }) => {
      const today = new Date().toISOString().split('T')[0];
      await base44.entities.NewPlotReservation.update(reservation.id, { status: 'Rejected', rejected_date: today, rejection_reason: reason || '' });
      await base44.entities.NewPlot.update(id, { status: 'Available' });
      // In-app notification instead of external email (platform restricts emailing non-app users)
      await base44.entities.Notification.create({
        message: `Reservation rejected for plot ${row.plot_number || ''} (Section ${row.section || ''}). Reason: ${reason || 'No reason provided'}.`,
        type: 'alert',
        is_read: false,
        user_email: null,
        related_entity_id: reservation.id,
        related_entity_type: 'NewPlotReservation',
        link: createPageUrl('NewPlotDetails') + `?id=${id}`
      });

      // Send rejection email via SendGrid (admins only)
      if (reservation.requester_email) {
        await base44.functions.invoke('sendEmail', {
          to: reservation.requester_email,
          subject: 'Your plot reservation was rejected',
          body: `Hello ${reservation.requester_name || ''},\n\nWe’re sorry to inform you that your reservation for plot ${row.plot_number || ''} (Section ${row.section || ''}) was rejected.\nReason: ${reason || 'No reason provided'}.\n\nIf you have questions, please reply to this email.`,
        });
      }
    },
    onSuccess: () => {
      refetchReservations();
    },
    });

    const handleExtendExpiry = async (days = 7) => {
    const baseDate = row.reservation_expiry_date ? new Date(row.reservation_expiry_date + 'T00:00:00') : new Date();
    baseDate.setDate(baseDate.getDate() + days);
    const newStr = baseDate.toISOString().split('T')[0];
    await base44.entities.NewPlot.update(id, { reservation_expiry_date: newStr });
    queryClient.invalidateQueries({ queryKey: ["newplot", id] });
    alert(`Hold extended to ${newStr}`);
    };

  if (!id) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Missing plot id.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  if (!row) {
    return (
      <div className="p-6">
        <Link to={createPageUrl("NewPlotsAndMap")}>← Back</Link>
        <p className="mt-4 text-gray-600">Plot not found.</p>
      </div>
    );
  }

  const InfoRow = ({ label, value }) => (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-gray-900 font-medium">{value || "-"}</div>
    </div>
  );

  const UserReservationList = ({ reservations, email }) => {
    const mine = (reservations || []).filter(r => (r.requester_email || '').toLowerCase() === (email || '').toLowerCase());
    if (mine.length === 0) return <div className="text-sm text-gray-500">No requests found for {email}.</div>;
    return (
      <div className="space-y-2">
        {mine.map(r => (
          <div key={r.id} className="border rounded-md p-3">
            <div className="text-sm font-medium text-gray-900">{r.status}</div>
            {r.donation_amount ? <div className="text-xs text-gray-600">Donation: ${r.donation_amount}</div> : null}
            {r.requested_date ? <div className="text-xs text-gray-600">Requested: {r.requested_date}</div> : null}
            {r.confirmed_date ? <div className="text-xs text-green-700">Confirmed: {r.confirmed_date}</div> : null}
            {r.rejected_date ? <div className="text-xs text-red-700">Rejected: {r.rejected_date}</div> : null}
            {r.rejection_reason ? <div className="text-xs text-red-700">Reason: {r.rejection_reason}</div> : null}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to={createPageUrl("NewPlotsAndMap")} className="text-teal-700 hover:underline flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
            <h1 className="text-xl font-semibold text-gray-900 ml-3">Plot Details</h1>
          </div>
          <div className="flex gap-2">
            {!isEditing && row.status === 'Available' && (
              <Button className="bg-teal-700 hover:bg-teal-800 text-white" onClick={() => setReservationOpen(true)}>
                Request Reservation
              </Button>
            )}
            {isAdmin && row.status === 'Pending Reservation' && !isEditing && (
              <Button variant="outline" className="gap-2" onClick={() => handleExtendExpiry(7)}>
                <Clock className="w-4 h-4" /> Extend hold 7d
              </Button>
            )}
            {isAdmin && (
              !isEditing ? (
                <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2">
                  <Pencil className="w-4 h-4" /> Edit
                </Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => { setIsEditing(false); setForm({ ...form, ...row }); }} className="gap-2 text-gray-600">
                    <X className="w-4 h-4" /> Cancel
                  </Button>
                  <Button onClick={() => updateMutation.mutate()} className="bg-teal-700 hover:bg-teal-800 gap-2">
                    {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </Button>
                </>
              )
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <section className="bg-white rounded-lg border p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {isEditing ? (
              <>
                <div className="md:col-span-4 space-y-4">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider border-b pb-1">Location & Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-gray-500">Section</label>
                      <Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Row</label>
                      <Input value={form.row_number} onChange={(e) => setForm({ ...form, row_number: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Plot #</label>
                      <Input value={form.plot_number} onChange={(e) => setForm({ ...form, plot_number: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Status</label>
                    <Select value={form.status || ""} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Available","Pending Reservation","Reserved","Occupied","Veteran","Unavailable","Unknown","Not Usable"].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="md:col-span-4 space-y-4">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider border-b pb-1">Occupant / Owner Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500">First Name</label>
                      <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Last Name</label>
                      <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Family Name (Owner/Reservation)</label>
                    <Input value={form.family_name} onChange={(e) => setForm({ ...form, family_name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500">Birth Date</label>
                      <Input value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} placeholder="MM/DD/YYYY or YYYY-MM-DD" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Death Date</label>
                      <Input value={form.death_date} onChange={(e) => setForm({ ...form, death_date: e.target.value })} placeholder="MM/DD/YYYY or YYYY-MM-DD" />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-4 space-y-2">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider border-b pb-1">Notes</h3>
                  <Textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>

                <div className="md:col-span-4 space-y-4">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider border-b pb-1">Admin / Reservation</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500">Reservation Expiry</label>
                      <Input value={form.reservation_expiry_date} onChange={(e) => setForm({ ...form, reservation_expiry_date: e.target.value })} placeholder="YYYY-MM-DD" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Responsible Admin Email</label>
                      <Input value={form.assigned_admin_email || ''} onChange={(e) => setForm({ ...form, assigned_admin_email: e.target.value })} placeholder="admin@example.com" />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <InfoRow label="Section" value={row.section} />
                <InfoRow label="Row" value={row.row_number} />
                <InfoRow label="Plot #" value={row.plot_number} />
                <InfoRow label="Status" value={row.status} />
                <InfoRow label="First Name" value={row.first_name} />
                <InfoRow label="Last Name" value={row.last_name} />
                <InfoRow label="Family / Owner" value={row.family_name} />
                <InfoRow label="Birth Date" value={row.birth_date} />
                <InfoRow label="Death Date" value={row.death_date} />
                <InfoRow label="Reservation Expiry" value={row.reservation_expiry_date} />
                <InfoRow label="Responsible Admin" value={row.assigned_admin_email} />
                <div className="md:col-span-4">
                  <div className="text-xs uppercase tracking-wide text-gray-500">Notes</div>
                  <div className="text-gray-900 whitespace-pre-wrap">{row.notes || "-"}</div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Public/User Reservation Status */}
        {!isAdmin && (
          <section className="bg-white rounded-lg border p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-800">Your Reservation Request</h2>
            </div>
            {user?.email ? (
              <UserReservationList reservations={reservations} email={user.email} />
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end">
                <div className="flex-1 w-full">
                  <div className="text-xs text-gray-500 mb-1">Enter your email to check status</div>
                  <Input type="email" value={viewerEmail} onChange={(e)=>setViewerEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <Button onClick={()=>setViewerEmail(viewerEmail.trim())}>Check Status</Button>
              </div>
            )}
            {!user?.email && viewerEmail && (
              <div className="mt-3">
                <UserReservationList reservations={reservations} email={viewerEmail} />
              </div>
            )}
          </section>
        )}

         {isAdmin && (
          <section className="bg-white rounded-lg border p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-800">Reservations</h2>
            </div>
            {reservationsLoading ? (
              <div className="text-sm text-gray-500">Loading reservations…</div>
            ) : (
              <div className="space-y-2">
                {reservations?.length === 0 ? (
                  <div className="text-sm text-gray-500">No reservation requests yet.</div>
                ) : (
                  reservations.map((resv) => (
                    <div key={resv.id} className="flex items-center justify-between border rounded-md p-3">
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium text-gray-900">{resv.requester_name} <span className="text-gray-400">({resv.requester_email || 'n/a'})</span></div>
                        <div className="text-xs text-gray-600">Status: <span className={`px-1.5 py-0.5 rounded-full border ${(resv.status === 'Pending' || resv.status === 'Pending Review') ? 'bg-amber-50 border-amber-200 text-amber-700' : resv.status === 'Confirmed' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>{resv.status}</span></div>
                        {resv.donation_amount ? <div className="text-xs text-gray-600">Donation: ${resv.donation_amount}</div> : null}
                        {resv.notes ? <div className="text-xs text-gray-600">Notes: {resv.notes}</div> : null}
                        {resv.rejection_reason ? <div className="text-xs text-red-700">Reason: {resv.rejection_reason}</div> : null}
                      </div>
                      {(resv.status === 'Pending' || resv.status === 'Pending Review') && (
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => confirmReservation.mutate(resv)} disabled={confirmReservation.isPending}>
                            {confirmReservation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                            Confirm
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => { const reason = window.prompt('Enter rejection reason (optional):'); rejectReservation.mutate({ reservation: resv, reason }); }} disabled={rejectReservation.isPending}>
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </section>
        )}

          {isAdmin && (
          <section className="bg-white rounded-lg border p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-800">Associated Media</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {/* No linked media yet - placeholder */}
              <div className="col-span-2 text-sm text-gray-500 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> No media linked to this plot.
              </div>
            </div>
          </section>
        )}

        {isAdmin && (
          <section className="bg-white rounded-lg border p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">System</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <InfoRow label="Matched Plot ID" value={row.matched_plot_id} />
              <InfoRow label="Action Taken" value={row.action_taken} />
              <InfoRow label="Error" value={row.error} />
            </div>
          </section>
        )}

        <NewReservationDialog 
          open={reservationOpen} 
          onOpenChange={setReservationOpen} 
          plot={row} 
          onCreated={() => { refetchReservations(); }}
        />
      </main>
    </div>
  );
}