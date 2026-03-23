import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const today = new Date();
    const toDateStr = (d) => new Date(d).toISOString().split('T')[0];

    // Fetch pending reservation plots (limit reasonable batch)
    const pendingPlots = await base44.entities.NewPlot.filter({ status: 'Pending Reservation' }, undefined, 1000);

  // Load notification settings
  const settingsList = await base44.entities.NotificationSettings.list();
  const settings = (settingsList && settingsList[0]) || null;
  const notifEnabled = settings?.reservation_expirations?.enabled !== false;
  const inAppEnabled = settings?.reservation_expirations?.in_app !== false;
  const defaultRecipients = settings?.email_recipients || [];

    let expiredCount = 0;
    let soonCount = 0;

    for (const plot of pendingPlots) {
      const expStr = plot.reservation_expiry_date;
      if (!expStr) continue;

      const expDate = new Date(expStr + 'T00:00:00');
      const diffMs = expDate.getTime() - today.getTime();
      const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));

      // Find the latest pending reservation for this plot
      const reservations = await base44.entities.NewPlotReservation.filter({ new_plot_id: plot.id }, '-created_date', 10);
      const pendingReservation = (reservations || []).find(r => r.status === 'Pending Review' || r.status === 'Pending');

      if (hoursLeft <= 0) {
        // Expired: release plot and mark reservation as rejected (expired)
        await base44.entities.NewPlot.update(plot.id, { status: 'Available', reservation_expiry_date: '' });
        if (pendingReservation) {
          await base44.entities.NewPlotReservation.update(pendingReservation.id, {
            status: 'Rejected',
            rejected_date: toDateStr(today),
            rejection_reason: 'Expired - no admin confirmation before expiry',
          });
          await base44.entities.Notification.create({
            message: `Reservation for plot ${plot.plot_number || ''} (Section ${plot.section || ''}) expired and was released.`,
            type: 'alert',
            is_read: false,
            user_email: null,
            related_entity_id: pendingReservation.id,
            related_entity_type: 'NewPlotReservation',
            link: `/NewPlotDetails?id=${plot.id}`,
            created_at: new Date().toISOString(),
          });
        } else {
          await base44.entities.Notification.create({
            message: `Reservation hold expired for plot ${plot.plot_number || ''} (Section ${plot.section || ''}); plot released.`,
            type: 'alert',
            is_read: false,
            user_email: null,
            related_entity_id: plot.id,
            related_entity_type: 'Plot',
            link: `/NewPlotDetails?id=${plot.id}`,
            created_at: new Date().toISOString(),
          });
        }
        expiredCount++;
        continue;
      }

      // Notify targeted admin if expiring within 24 hours
      if (hoursLeft > 0 && hoursLeft <= 24) {
        if (!pendingReservation) continue;
        if (notifEnabled && inAppEnabled) {
          const targetEmail = plot.assigned_admin_email || (defaultRecipients[0] || null);
          await base44.entities.Notification.create({
            message: `Reservation for plot ${plot.plot_number || ''} (Section ${plot.section || ''}) will expire within 24 hours on ${toDateStr(expDate)}.`,
            type: 'alert',
            is_read: false,
            user_email: targetEmail,
            related_entity_id: pendingReservation.id,
            related_entity_type: 'NewPlotReservation',
            link: `/NewPlotDetails?id=${plot.id}`,
            created_at: new Date().toISOString(),
          });
          soonCount++;
        }
      }
    }

    return Response.json({ status: 'ok', expired: expiredCount, expiring_soon: soonCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});