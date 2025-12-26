import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function getAdminRecipients(base44) {
  // Prefer NotificationSettings.email_recipients
  try {
    const settings = await base44.asServiceRole.entities.NotificationSettings.filter({}, null, 1);
    const first = settings?.[0];
    if (first?.email_recipients && first.email_recipients.length > 0) return first.email_recipients;
  } catch (_) {}
  // Fallback: all admin users
  try {
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' }, null, 100);
    return (admins || []).map((u) => u.email).filter(Boolean);
  } catch (_) {
    return [];
  }
}

function makeEmail(event, reservation, extra = {}) {
  const title = 'Union Springs Cemetery';
  const who = reservation?.requester_name || 'Member';
  const plot = reservation?.new_plot_id ? `Plot ID: ${reservation.new_plot_id}` : '';
  const status = reservation?.status ? `Status: ${reservation.status}` : '';
  switch (event) {
    case 'submission':
      return {
        subject: 'Reservation Received',
        body: `Hello ${who},\n\nWe received your plot reservation request. ${plot}\nWe will review and update you shortly.\n\n— ${title}`,
      };
    case 'admin_new_submission':
      return {
        subject: 'New Reservation Request (Admin)',
        body: `A new reservation request was submitted.\nRequester: ${who} (${reservation?.requester_email})\n${plot}\nDonation: ${reservation?.donation_amount ?? 'N/A'}\nNotes: ${reservation?.notes || ''}`,
      };
    case 'status_change':
      return {
        subject: `Reservation ${extra.status || reservation?.status}`,
        body: `Hello ${who},\n\nYour reservation has been updated.\n${plot}\n${status}\n\n— ${title}`,
      };
    case 'payment_reminder':
      return {
        subject: 'Payment Reminder: Plot Reservation',
        body: `Hello ${who},\n\nThis is a friendly reminder to complete payment for your reservation.\n${plot}\nCurrent payment status: ${reservation?.payment_status || 'Pending'}\n\n— ${title}`,
      };
    case 'signature_request':
      return {
        subject: 'Action Required: Please Sign Your Certificate',
        body: `Hello ${who},\n\nPlease log in to your Member Portal and navigate to Reservations to review and digitally sign your Certificate of Interment Rights.\n${plot}\n\n— ${title}`,
      };
    default:
      return { subject: 'Notification', body: 'Update regarding your reservation.' };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Best-effort user detection; proceed even without user (service role will be used for emails)
    let user = null;
    try { user = await base44.auth.me(); } catch (_) { user = null; }

    const payload = await req.json();
    const { event, reservationId, status } = payload || {};

    let reservation = payload?.reservation;
    if (!reservation && reservationId) {
      const list = await base44.asServiceRole.entities.NewPlotReservation.filter({ id: reservationId }, null, 1);
      reservation = list?.[0] || null;
    }
    if (!reservation) {
      return Response.json({ error: 'Reservation not found' }, { status: 404 });
    }

    // Send to requester
    const { subject, body } = makeEmail(event, reservation, { status });
    if (reservation.requester_email) {
      await base44.asServiceRole.integrations.Core.SendEmail({ to: reservation.requester_email, subject, body });
    }

    // Admin notification on new submission
    if (event === 'submission') {
      const adminEmail = makeEmail('admin_new_submission', reservation);
      const admins = await getAdminRecipients(base44);
      await Promise.all(
        (admins || []).map((to) => base44.integrations.Core.SendEmail({ to, subject: adminEmail.subject, body: adminEmail.body }))
      );
    }

    // On status change, also notify admins
    if (event === 'status_change') {
      const admins = await getAdminRecipients(base44);
      await Promise.all(
        (admins || []).map((to) => base44.integrations.Core.SendEmail({ to, subject: `Reservation ${status} (Admin Notice)`, body: `Reservation ${reservation.id} is now ${status}. Requester: ${reservation.requester_name} (${reservation.requester_email})` }))
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});