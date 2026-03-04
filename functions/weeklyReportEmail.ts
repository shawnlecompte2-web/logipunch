import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@4.0.0';

const RECIPIENTS = [
  'Shawn@groupeddl.ca',
  'Andreanne@groupeddl.ca',
  'Raphael@groupeddl.ca'
];

function sanitize(str) {
  if (!str) return '';
  return str
    .replace(/œ/gi, (m) => m === m.toUpperCase() ? 'OE' : 'oe')
    .replace(/æ/gi, (m) => m === m.toUpperCase() ? 'AE' : 'ae')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019\u02BC\u02BB]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-');
}

function toHM(hours) {
  const h = Math.floor(parseFloat(hours) || 0);
  const m = Math.round(((parseFloat(hours) || 0) - h) * 60);
  return `${h}h${m.toString().padStart(2, '0')}`;
}

function frDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const days = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const months = ['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Toronto', hour12: false });
}

function drawSectionBar(doc, x, y, w, title) {
  doc.setFillColor(30, 64, 175);
  doc.rect(x, y, w, 8, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(title, x + 4, y + 5.5);
  return y + 8;
}

function drawTextBox(doc, x, y, w, text) {
  const safe = text && text.trim() ? sanitize(text.trim()) : 'Aucun';
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  const lines = doc.splitTextToSize(safe, w - 8);
  const bh = Math.max(12, lines.length * 5.5 + 6);
  doc.setFillColor(248, 250, 255);
  doc.setDrawColor(180, 195, 230);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, bh, 'F');
  doc.rect(x, y, w, bh, 'S');
  lines.forEach((line, i) => doc.text(line, x + 4, y + 5 + i * 5.5));
  return y + bh;
}

function drawCell(doc, x, y, w, h, label, value) {
  doc.setFillColor(240, 245, 255);
  doc.setDrawColor(180, 195, 230);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, h, 'F');
  doc.rect(x, y, w, h, 'S');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text(label, x + 3, y + 4);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  const lines = doc.splitTextToSize(sanitize(String(value || '-')), w - 6);
  doc.text(lines[0] || '-', x + 3, y + 11);
}

function addDayToDoc(doc, dayReport, workers, companyName, companyLogo, logoBase64, logoFmt, firstPage) {
  const PW = 210;
  const M = 12;
  const CW = PW - M * 2;

  if (!firstPage) doc.addPage();

  let y = 0;

  // Header
  doc.setFillColor(15, 40, 120);
  doc.rect(0, 0, PW, 38, 'F');
  doc.setFillColor(34, 197, 94);
  doc.rect(0, 0, 5, 38, 'F');

  let textX = 10;
  if (logoBase64) {
    try {
      doc.addImage(`data:image/${logoFmt === 'PNG' ? 'png' : 'jpeg'};base64,${logoBase64}`, logoFmt, 9, 5, 22, 22);
      textX = 35;
    } catch(e) {}
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(sanitize(companyName || 'TapIN'), textX, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 210, 255);
  doc.text('RAPPORT JOURNALIER DE CHANTIER', textX, 25);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 197, 94);
  doc.text(frDate(dayReport.report_date).toUpperCase(), PW - M, 20, { align: 'right' });

  y = 43;

  // 1. INFO GENERALES
  y = drawSectionBar(doc, M, y, CW, '1.  INFORMATIONS GENERALES');
  y += 2;
  const cellH = 16;
  const w2 = (CW - 2) / 2;
  drawCell(doc, M,      y, w2, cellH, 'PROJET', dayReport.project_name);
  drawCell(doc, M+w2+2, y, w2, cellH, 'ADRESSE', dayReport.project_address || '-');
  y += cellH + 2;
  drawCell(doc, M,      y, w2, cellH, 'DATE', frDate(dayReport.report_date));
  drawCell(doc, M+w2+2, y, w2, cellH, 'CONTREMAITRE', dayReport.user_name || '-');
  y += cellH + 5;

  // 2. MAIN D'OEUVRE
  y = drawSectionBar(doc, M, y, CW, "2.  MAIN D'OEUVRE");
  const cols = [
    { label: 'NOM',     x: M + 2,   w: 60 },
    { label: 'ARRIVEE', x: M + 62,  w: 30 },
    { label: 'DEPART',  x: M + 92,  w: 30 },
    { label: 'DINER',   x: M + 122, w: 22 },
    { label: 'TOTAL',   x: M + 144, w: 40 },
  ];
  doc.setFillColor(219, 234, 254);
  doc.setDrawColor(150, 180, 230);
  doc.setLineWidth(0.3);
  doc.rect(M, y, CW, 7, 'F');
  doc.rect(M, y, CW, 7, 'S');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  cols.forEach(c => doc.text(c.label, c.x, y + 5));
  y += 7;

  if (workers && workers.length > 0) {
    let totalHours = 0;
    workers.forEach((w, i) => {
      if (y > 255) { doc.addPage(); y = 14; }
      doc.setFillColor(i % 2 === 0 ? 250 : 240, i % 2 === 0 ? 252 : 246, i % 2 === 0 ? 255 : 254);
      doc.setDrawColor(200, 215, 240);
      doc.setLineWidth(0.2);
      doc.rect(M, y, CW, 7, 'F');
      doc.line(M, y+7, M+CW, y+7);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 20, 20);
      doc.text(sanitize((w.user_name || '').substring(0, 30)), cols[0].x, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      doc.text(fmtTime(w.punch_in), cols[1].x, y + 5);
      doc.text(fmtTime(w.punch_out), cols[2].x, y + 5);
      doc.text(w.lunch_break > 0 ? `${w.lunch_break}m` : '-', cols[3].x, y + 5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 163, 74);
      doc.text(toHM(w.total_hours), cols[4].x, y + 5);
      totalHours += parseFloat(w.total_hours) || 0;
      y += 7;
    });
    doc.setFillColor(34, 197, 94);
    doc.rect(M, y, CW, 8, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL HEURES:', M + 4, y + 5.5);
    doc.text(toHM(totalHours), cols[4].x, y + 5.5);
    y += 12;
  } else {
    doc.setFillColor(248, 250, 255);
    doc.setDrawColor(180, 195, 230);
    doc.setLineWidth(0.3);
    doc.rect(M, y, CW, 10, 'F');
    doc.rect(M, y, CW, 10, 'S');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('Aucun employe enregistre pour cette journee.', M + 4, y + 7);
    y += 14;
  }

  // 3. SOUS-TRAITANTS
  y = drawSectionBar(doc, M, y, CW, '3.  SOUS-TRAITANTS');
  y += 2;
  y = drawTextBox(doc, M, y, CW, dayReport.subcontractor) + 5;

  // 4. EQUIPEMENTS
  if (y > 220) { doc.addPage(); y = 14; }
  y = drawSectionBar(doc, M, y, CW, '4.  EQUIPEMENTS & MACHINERIE');
  y += 2;
  let equipText = '';
  if (dayReport.machine) equipText += dayReport.machine;
  if (dayReport.truck_count) equipText += (equipText ? '\nCamions: ' : 'Camions: ') + dayReport.truck_count;
  y = drawTextBox(doc, M, y, CW, equipText || null) + 5;

  // 5. TRAVAUX
  if (y > 195) { doc.addPage(); y = 14; }
  y = drawSectionBar(doc, M, y, CW, '5.  DESCRIPTION DES TRAVAUX EFFECTUES');
  y += 2;
  y = drawTextBox(doc, M, y, CW, dayReport.work_description) + 5;

  // 6. OBSERVATIONS
  if (y > 220) { doc.addPage(); y = 14; }
  y = drawSectionBar(doc, M, y, CW, '6.  RETARDS, PROBLEMES OU OBSERVATIONS');
  y += 2;
  drawTextBox(doc, M, y, CW, dayReport.other_notes);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Compute previous week (Sunday to Saturday)
    // "Previous week" = the last fully completed Sunday-Saturday week
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    // Go back to the most recent Saturday (end of last week)
    const daysToLastSaturday = dayOfWeek === 6 ? 7 : dayOfWeek + 1;
    const lastSaturday = new Date(now);
    lastSaturday.setDate(now.getDate() - daysToLastSaturday);
    const lastSunday = new Date(lastSaturday);
    lastSunday.setDate(lastSaturday.getDate() - 6);

    const weekStartStr = lastSunday.toISOString().split('T')[0];
    const weekEndStr = lastSaturday.toISOString().split('T')[0];

    // Fetch all reports and filter by report_date range (not week_start)
    const allReportsRaw = await base44.asServiceRole.entities.DailyReport.list('-report_date', 1000);
    const allReports = (allReportsRaw || []).filter(r => r.report_date >= weekStartStr && r.report_date <= weekEndStr);

    if (!allReports || allReports.length === 0) {
      return Response.json({ success: true, message: `No reports found for last week (${weekStartStr} to ${weekEndStr}).` });
    }

    // Group reports by company_id then project_id
    const byCompanyProject = {};
    for (const r of allReports) {
      const key = `${r.company_id}__${r.project_id}`;
      if (!byCompanyProject[key]) byCompanyProject[key] = [];
      byCompanyProject[key].push(r);
    }

    // Get unique company IDs and fetch company data
    const companyIds = [...new Set(allReports.map(r => r.company_id).filter(Boolean))];
    const companiesMap = {};
    for (const cid of companyIds) {
      try {
        const companies = await base44.asServiceRole.entities.Company.filter({ id: cid });
        if (companies && companies.length > 0) companiesMap[cid] = companies[0];
      } catch(e) {}
    }

    // Fetch all punch entries for the week by work_date range
    const allPunchesRaw = await base44.asServiceRole.entities.PunchEntry.list('-work_date', 2000);
    const allPunches = (allPunchesRaw || []).filter(p => p.work_date >= weekStartStr && p.work_date <= weekEndStr);

    const results = [];

    for (const [key, reports] of Object.entries(byCompanyProject)) {
      const [companyId, projectId] = key.split('__');
      const company = companiesMap[companyId] || {};
      const projectName = reports[0]?.project_name || 'Projet';

      // Sort reports by date
      const sortedReports = reports.sort((a, b) => a.report_date.localeCompare(b.report_date));

      // Load logo once
      let logoBase64 = null;
      let logoFmt = 'JPEG';
      if (company.logo_url) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(company.logo_url, { signal: controller.signal });
          clearTimeout(timeout);
          const contentType = res.headers.get('content-type') || '';
          const buf = await res.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let bin = '';
          for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
          logoBase64 = btoa(bin);
          if (contentType.includes('png') || company.logo_url.toLowerCase().includes('.png')) {
            logoFmt = 'PNG';
          }
        } catch(e) { console.error('Logo error:', e.message); }
      }

      // Build PDF - one page per day
      const doc = new jsPDF();

      sortedReports.forEach((dayReport, idx) => {
        // Get workers for this day and project
        const dayWorkers = allPunches.filter(p =>
          p.project_id === projectId &&
          p.work_date === dayReport.report_date &&
          p.status !== 'active'
        );

        addDayToDoc(doc, dayReport, dayWorkers, company.name, company.logo_url, logoBase64, logoFmt, idx === 0);
      });

      // Footer on all pages
      const pageCount = doc.internal.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFillColor(15, 40, 120);
        doc.rect(0, 288, 210, 9, 'F');
        doc.setFillColor(34, 197, 94);
        doc.rect(0, 288, 5, 9, 'F');
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(180, 210, 255);
        const now2 = new Date();
        doc.text(`TapIN · Semaine du ${weekStartStr} au ${weekEndStr}`, 10, 293.5);
        doc.setTextColor(34, 197, 94);
        doc.text(`Page ${p} / ${pageCount}`, 200, 293.5, { align: 'right' });
      }

      // Convert PDF to base64
      const pdfBytes = doc.output('arraybuffer');
      const pdfUint8 = new Uint8Array(pdfBytes);
      let pdfBin = '';
      for (let i = 0; i < pdfUint8.length; i++) pdfBin += String.fromCharCode(pdfUint8[i]);
      const pdfBase64 = btoa(pdfBin);

      const filename = `rapport_semaine_${weekStartStr}_${sanitize(projectName).replace(/\s+/g, '_')}.pdf`;

      // Upload PDF and get a public URL
      let downloadUrl = null;
      try {
        const pdfFile = new File([pdfUint8], filename, { type: 'application/pdf' });
        const uploadRes = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfFile });
        downloadUrl = uploadRes?.file_url || null;
      } catch(e) { console.error('Upload error:', e.message); }

      // Build a nice HTML email body
      const frDateRange = `${frDate(weekStartStr)} au ${frDate(weekEndStr)}`;
      const totalWorkerHours = allPunches
        .filter(p => p.project_id === projectId)
        .reduce((sum, p) => sum + (parseFloat(p.total_hours) || 0), 0);
      const uniqueWorkers = [...new Set(allPunches.filter(p => p.project_id === projectId).map(p => p.user_id))].length;

      const emailBody = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f2878 0%,#1e3fa8 100%);padding:32px 36px;border-bottom:4px solid #22c55e;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">TapIN</div>
                  <div style="font-size:13px;color:#b0c8ff;margin-top:4px;">${sanitize(company.name || 'Groupe DDL')}</div>
                </td>
                <td align="right">
                  <div style="background:#22c55e;color:#fff;font-weight:700;font-size:11px;padding:6px 14px;border-radius:20px;letter-spacing:1px;">RAPPORT HEBDOMADAIRE</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Project Title -->
        <tr>
          <td style="padding:28px 36px 0 36px;">
            <div style="font-size:11px;color:#6b7280;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">Projet</div>
            <div style="font-size:22px;font-weight:900;color:#0f2878;">${sanitize(projectName)}</div>
            <div style="font-size:13px;color:#6b7280;margin-top:4px;">Semaine du ${frDateRange}</div>
          </td>
        </tr>
        <!-- Stats -->
        <tr>
          <td style="padding:24px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="33%" style="padding:0 6px 0 0;">
                  <div style="background:#f0f5ff;border-radius:10px;padding:16px;text-align:center;border:1px solid #dbeafe;">
                    <div style="font-size:28px;font-weight:900;color:#1e3fa8;">${sortedReports.length}</div>
                    <div style="font-size:11px;color:#6b7280;margin-top:4px;font-weight:600;">JOURS TRAVAILLES</div>
                  </div>
                </td>
                <td width="33%" style="padding:0 3px;">
                  <div style="background:#f0fdf4;border-radius:10px;padding:16px;text-align:center;border:1px solid #bbf7d0;">
                    <div style="font-size:28px;font-weight:900;color:#16a34a;">${toHM(totalWorkerHours)}</div>
                    <div style="font-size:11px;color:#6b7280;margin-top:4px;font-weight:600;">HEURES TOTALES</div>
                  </div>
                </td>
                <td width="33%" style="padding:0 0 0 6px;">
                  <div style="background:#fff7ed;border-radius:10px;padding:16px;text-align:center;border:1px solid #fed7aa;">
                    <div style="font-size:28px;font-weight:900;color:#ea580c;">${uniqueWorkers}</div>
                    <div style="font-size:11px;color:#6b7280;margin-top:4px;font-weight:600;">EMPLOYES</div>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Download Button -->
        ${downloadUrl ? `
        <tr>
          <td style="padding:0 36px 28px 36px;">
            <div style="background:#f8fafc;border-radius:10px;padding:20px;border:1px solid #e2e8f0;text-align:center;">
              <div style="font-size:13px;color:#374151;margin-bottom:16px;">Le rapport complet en PDF est disponible au telechargement :</div>
              <a href="${downloadUrl}" style="display:inline-block;background:linear-gradient(135deg,#16a34a,#22c55e);color:#ffffff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;">
                &#8659; Telecharger le rapport PDF
              </a>
            </div>
          </td>
        </tr>` : `
        <tr>
          <td style="padding:0 36px 28px 36px;">
            <div style="background:#fef2f2;border-radius:10px;padding:16px;border:1px solid #fecaca;text-align:center;color:#dc2626;font-size:13px;">
              Une erreur est survenue lors de la generation du fichier PDF.
            </div>
          </td>
        </tr>`}
        <!-- Footer -->
        <tr>
          <td style="background:#0f2878;padding:20px 36px;border-top:4px solid #22c55e;">
            <div style="font-size:11px;color:#b0c8ff;text-align:center;">
              Ce courriel a ete genere automatiquement par <strong style="color:#22c55e;">TapIN</strong> &mdash; Systeme de gestion du temps de chantier
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      // Send email to each recipient
      for (const email of RECIPIENTS) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: `📋 Rapport hebdomadaire - ${sanitize(projectName)} - Semaine du ${weekStartStr} au ${weekEndStr}`,
          body: emailBody
        });
      }

      results.push({ project: projectName, days: sortedReports.length, filename });
    }

    return Response.json({ success: true, sent: results });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});