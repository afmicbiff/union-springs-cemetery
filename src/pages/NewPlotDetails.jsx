import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Save, Pencil, X, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import NewReservationDialog from "@/components/plots/NewReservationDialog";
import PlotInfoGrid from "@/components/plots/details/PlotInfoGrid";
import PlotEditForm from "@/components/plots/details/PlotEditForm";
import PlotStatusBadge from "@/components/plots/details/PlotStatusBadge";
import { AdminReservations, UserReservations } from "@/components/plots/details/PlotReservationsList";

export default function NewPlotDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({});
  const [reservationOpen, setReservationOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me().catch(() => null),
  });
  const isAdmin = user?.role === "admin";

  const { data: row, isLoading } = useQuery({
    queryKey: ["newplot", id],
    enabled: !!id,
    queryFn: async () => {
      const list = await base44.entities.NewPlot.filter({ id });
      return list?.[0] || null;
    },
  });

  useEffect(() => {
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
    mutationFn: () => base44.entities.NewPlot.update(id, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newplot", id] });
      setIsEditing(false);
    },
  });

  const { data: reservations = [], isLoading: reservationsLoading, refetch: refetchReservations } = useQuery({
    queryKey: ["newplot-reservations", id],
    enabled: !!id,
    queryFn: () => base44.entities.NewPlotReservation.filter({ new_plot_id: id }, "-created_date", 100),
    initialData: [],
  });

  const confirmReservation = useMutation({
    mutationFn: async (reservation) => {
      const today = new Date().toISOString().split("T")[0];
      await base44.entities.NewPlotReservation.update(reservation.id, { status: "Confirmed", confirmed_date: today });
      await base44.entities.NewPlot.update(id, { status: "Reserved" });
      await base44.entities.Notification.create({
        message: `Reservation confirmed for plot ${row.plot_number || ""} (Section ${row.section || ""}) for ${reservation.requester_name || "requester"}.`,
        type: "info",
        is_read: false,
        user_email: null,
        related_entity_id: reservation.id,
        related_entity_type: "NewPlotReservation",
        link: createPageUrl("NewPlotDetails") + `?id=${id}`,
      });
      if (reservation.requester_email) {
        await base44.functions.invoke("sendEmail", {
          to: reservation.requester_email,
          subject: "Your plot reservation has been confirmed",
          body: `Hello ${reservation.requester_name || ""},\n\nYour reservation for plot ${row.plot_number || ""} (Section ${row.section || ""}) has been confirmed.${reservation.donation_amount ? ` The requested donation amount is $${reservation.donation_amount}.` : ""}\n\nThank you.`,
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
      const today = new Date().toISOString().split("T")[0];
      await base44.entities.NewPlotReservation.update(reservation.id, { status: "Rejected", rejected_date: today, rejection_reason: reason || "" });
      await base44.entities.NewPlot.update(id, { status: "Available" });
      await base44.entities.Notification.create({
        message: `Reservation rejected for plot ${row.plot_number || ""} (Section ${row.section || ""}). Reason: ${reason || "No reason provided"}.`,
        type: "alert",
        is_read: false,
        user_email: null,
        related_entity_id: reservation.id,
        related_entity_type: "NewPlotReservation",
        link: createPageUrl("NewPlotDetails") + `?id=${id}`,
      });
      if (reservation.requester_email) {
        await base44.functions.invoke("sendEmail", {
          to: reservation.requester_email,
          subject: "Your plot reservation was rejected",
          body: `Hello ${reservation.requester_name || ""},\n\nWe're sorry to inform you that your reservation for plot ${row.plot_number || ""} (Section ${row.section || ""}) was rejected.\nReason: ${reason || "No reason provided"}.\n\nIf you have questions, please reply to this email.`,
        });
      }
    },
    onSuccess: () => refetchReservations(),
  });

  const handleExtendExpiry = async (days = 7) => {
    const baseDate = row.reservation_expiry_date ? new Date(row.reservation_expiry_date + "T00:00:00") : new Date();
    baseDate.setDate(baseDate.getDate() + days);
    const newStr = baseDate.toISOString().split("T")[0];
    await base44.entities.NewPlot.update(id, { reservation_expiry_date: newStr });
    queryClient.invalidateQueries({ queryKey: ["newplot", id] });
    alert(`Hold extended to ${newStr}`);
  };

  const handleReject = (resv) => {
    const reason = window.prompt("Enter rejection reason (optional):");
    rejectReservation.mutate({ reservation: resv, reason });
  };

  // --- Render states ---
  if (!id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-gray-500">Missing plot ID.</p>
          <Link to={createPageUrl("NewPlotsAndMap")} className="text-teal-700 hover:underline text-sm">← Back to Plots</Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!row) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-gray-500">Plot not found.</p>
          <Link to={createPageUrl("NewPlotsAndMap")} className="text-teal-700 hover:underline text-sm">← Back to Plots</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-3 min-w-0">
              <Link to={createPageUrl("NewPlotsAndMap")} className="text-teal-700 hover:text-teal-800 shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                    Plot {row.plot_number || "—"}
                  </h1>
                  <PlotStatusBadge status={row.status} />
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Section {row.section || "—"} · Row {row.row_number || "—"}
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {!isEditing && row.status === "Available" && (
                <Button className="bg-teal-700 hover:bg-teal-800 text-white text-sm" onClick={() => setReservationOpen(true)}>
                  Request Reservation
                </Button>
              )}
              {isAdmin && row.status === "Pending Reservation" && !isEditing && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExtendExpiry(7)}>
                  <Clock className="w-3.5 h-3.5" /> Extend 7d
                </Button>
              )}
              {isAdmin && (
                !isEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-1.5">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="gap-1.5 text-gray-500">
                      <X className="w-3.5 h-3.5" /> Cancel
                    </Button>
                    <Button size="sm" onClick={() => updateMutation.mutate()} className="bg-teal-700 hover:bg-teal-800 gap-1.5">
                      {updateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save
                    </Button>
                  </>
                )
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {isEditing ? (
          <PlotEditForm form={form} setForm={setForm} />
        ) : (
          <PlotInfoGrid row={row} isAdmin={isAdmin} />
        )}

        {/* Reservations */}
        {isAdmin ? (
          <AdminReservations
            reservations={reservations}
            isLoading={reservationsLoading}
            onConfirm={(resv) => confirmReservation.mutate(resv)}
            onReject={handleReject}
            isConfirming={confirmReservation.isPending}
            isRejecting={rejectReservation.isPending}
          />
        ) : (
          <UserReservations reservations={reservations} userEmail={user?.email} />
        )}
      </main>

      <NewReservationDialog
        open={reservationOpen}
        onOpenChange={setReservationOpen}
        plot={row}
        onCreated={() => refetchReservations()}
      />
    </div>
  );
}