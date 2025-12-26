import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

async function pngToBase64(url) {
  const res = await fetch(url);
  const buf = new Uint8Array(await res.arrayBuffer());
  let binary = '';
  for (let i = 0; i < buf.byteLength; i++) binary += String.fromCharCode(buf[i]);
  const b64 = btoa(binary);
  return `data:image/png;base64,${b64}`;
}

function drawCertificateWithSignature(doc, { plot, reservation, signatureDataUrl }) {
  // Header
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(13, 148, 136);
  doc.text('Union Springs Cemetery', 105, 18, { align: 'center' });
  doc.setFontSize(13);
  doc.setTextColor(60, 60, 60);
  doc.text('Certificate of Interment Rights', 105, 26, { align: 'center' });

  // Body
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  let y = 40;

  const owner = reservation?.requester_name || '—';
  const email = reservation?.requester_email || '—';
  const confirmed = reservation?.confirmed_date || new Date().toISOString().slice(0, 10);
  const section = plot?.section || '—';
  const row = plot?.row_number || '—';
  const number = plot?.plot_number || '—';

  const lines = [
    `THIS CERTIFIES that ${owner} is granted the perpetual use and exclusive Right of Interment`,
    `in the grounds of Union Springs Cemetery, subject to the rules and regulations of the`,
    `Cemetery Authority and the laws of the State of Louisiana.`,
  ];
  lines.forEach((t) => { doc.text(t, 20, y); y += 6; });
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.text('Plot Details', 20, y); y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Section: ${section}`, 20, y);
  doc.text(`Row: ${row}`, 80, y);
  doc.text(`Plot: ${number}`, 140, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('Owner', 20, y); y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${owner}`, 20, y); y += 6;
  doc.text(`Email: ${email}`, 20, y); y += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('Effective Date', 20, y); y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`${confirmed}`, 20, y); y += 14;

  doc.setFont('helvetica', 'bold');
  doc.text('Rules & Conditions (Summary)', 20, y); y += 6;
  doc.setFont('helvetica', 'normal');
  const body = [
    '• Interments subject to cemetery rules (markers, decorations, hours, conduct).',
    '• Approved vault/liner required; only designated personnel may open/close graves.',
    '• The cemetery may correct errors by relocating remains to an equivalent plot.',
  ];
  body.forEach((t) => { doc.text(t, 20, y); y += 6; });
  y += 10;

  // Signature blocks
  const sigLineY = y;
  doc.setDrawColor(180);
  doc.line(20, sigLineY, 100, sigLineY);
  doc.text('Owner / Representative Signature', 20, sigLineY + 6);
  doc.line(120, sigLineY, 200, sigLineY);
  doc.text('Cemetery Authority', 120, sigLineY + 6);

  // Place user signature image above the owner line
  if (signatureDataUrl) {
    try {
      doc.addImage(signatureDataUrl, 'PNG', 24, sigLineY - 14, 70, 14);
    } catch (_) {
      // ignore if image fails
    }
  }

  // Footer
  doc.setDrawColor(200);
  doc.line(20, 270, 190, 270);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('Union Springs Cemetery Association • Shongaloo, Louisiana', 105, 276, { align: 'center' });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { reservationId, userSignatureFileUri } = payload || {};
    if (!reservationId || !userSignatureFileUri) {
      return Response.json({ error: 'reservationId and userSignatureFileUri are required' }, { status: 400 });
    }

    // Load reservation and plot
    const rList = await base44.asServiceRole.entities.NewPlotReservation.filter({ id: reservationId }, null, 1);
    const reservation = rList?.[0];
    if (!reservation) return Response.json({ error: 'Reservation not found' }, { status: 404 });

    let plot = null;
    if (reservation.new_plot_id) {
      const pList = await base44.asServiceRole.entities.NewPlot.filter({ id: reservation.new_plot_id }, null, 1);
      plot = pList?.[0] || null;
    }

    // Get signature as base64
    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: userSignatureFileUri, expires_in: 300 });
    const sigDataUrl = await pngToBase64(signed_url);

    // Create PDF
    const doc = new jsPDF();
    drawCertificateWithSignature(doc, { plot, reservation, signatureDataUrl: sigDataUrl });

    const arrayBuffer = doc.output('arraybuffer');
    const file = new File([new Uint8Array(arrayBuffer)], `certificate_${reservation.id}_signed.pdf`, { type: 'application/pdf' });

    const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file });

    const nowIso = new Date().toISOString();
    const newDoc = {
      id: crypto.randomUUID(),
      name: 'Certificate of Interment Rights (User Signed)',
      file_uri,
      uploaded_at: nowIso,
    };

    const existing = Array.isArray(reservation.signed_documents) ? reservation.signed_documents : [];
    // Remove prior user-signed versions to avoid clutter
    const filtered = existing.filter(d => !String(d.name || '').toLowerCase().includes('user signed'));
    const nextDocs = [...filtered, newDoc];

    await base44.asServiceRole.entities.NewPlotReservation.update(reservation.id, { signed_documents: nextDocs });

    return Response.json({ file_uri });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});