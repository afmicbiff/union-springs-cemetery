import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { reservationId, plotId, plotNumber } = payload || {};

    let resv = null;

    if (reservationId) {
      const resvs = await base44.asServiceRole.entities.NewPlotReservation.filter({ id: reservationId });
      resv = resvs?.[0] || null;
    } else {
      let targetPlotId = plotId || null;
      if (!targetPlotId && plotNumber) {
        const plots = await base44.asServiceRole.entities.NewPlot.filter({ plot_number: String(plotNumber) });
        targetPlotId = plots?.[0]?.id || null;
      }
      if (targetPlotId) {
        const resvs = await base44.asServiceRole.entities.NewPlotReservation.filter({ new_plot_id: targetPlotId }, '-created_date', 1);
        resv = resvs?.[0] || null;
      }
    }

    if (!resv) {
      return Response.json({ success: false, error: 'Reservation not found (provide reservationId, plotId, or plotNumber)' });
    }

    // Require requester_email present
    const to = (resv.requester_email || '').trim();
    if (!to) {
      return Response.json({ success: false, error: 'Reservation has no requester_email' });
    }

    // Optional freshness check (ensure created within last 24h)
    try {
      const createdAt = new Date(resv.created_date);
      const ageMs = Date.now() - createdAt.getTime();
      if (isFinite(ageMs) && ageMs > 24 * 60 * 60 * 1000) {
        // Still proceed but include note
      }
    } catch (_) {}

    // Fetch plot for nicer subject/body
    let plotLabel = '';
    if (resv.new_plot_id) {
      const plots = await base44.asServiceRole.entities.NewPlot.filter({ id: resv.new_plot_id });
      const plot = plots?.[0];
      if (plot) {
        plotLabel = `${plot.plot_number || ''}${plot.section ? ` (Section ${plot.section})` : ''}`.trim();
      }
    }

    const fromName = Deno.env.get('SENDGRID_FROM_NAME') || 'Union Springs';

    const subject = 'We received your plot reservation request';
    const body = `Hello ${resv.requester_name || 'there'},\n\nThank you for submitting a reservation request${plotLabel ? ` for plot ${plotLabel}` : ''}. Our administrator will review your request and get back to you within 24 hours.\n\nIf you have any questions in the meantime, simply reply to this email.\n\nUnion Springs Cemetery`;

    const resp = await base44.functions.invoke('sendEmail', {
      to,
      subject,
      body
    });

    if (resp.data?.success === false || resp.data?.error) {
      return Response.json({ success: false, provider: 'sendgrid', details: resp.data, status: 400 });
    }

    return Response.json({ success: true, provider: 'sendgrid' });
  } catch (error) {
    return Response.json({ success: false, error: error.message });
  }
});