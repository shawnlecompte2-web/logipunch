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

    // Accept optional week_start override for testing
    let body = {};
    try { body = await req.json(); } catch(e) {}

    let weekStartStr, weekEndStr;

    if (body.week_start) {
      // Manual override: use provided Sunday as start
      const ws = new Date(body.week_start + 'T12:00:00');
      const we = new Date(ws);
      we.setDate(ws.getDate() + 6);
      weekStartStr = ws.toISOString().split('T')[0];
      weekEndStr = we.toISOString().split('T')[0];
    } else {
      // Default: previous week (Sunday to Saturday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const startOfCurrentWeek = new Date(now);
      startOfCurrentWeek.setDate(now.getDate() - dayOfWeek);
      const prevWeekEnd = new Date(startOfCurrentWeek);
      prevWeekEnd.setDate(startOfCurrentWeek.getDate() - 1);
      const prevWeekStart = new Date(prevWeekEnd);
      prevWeekStart.setDate(prevWeekEnd.getDate() - 6);
      weekStartStr = prevWeekStart.toISOString().split('T')[0];
      weekEndStr = prevWeekEnd.toISOString().split('T')[0];
    }

    // Fetch all reports where report_date falls within the week range
    const allReportsRaw = await base44.asServiceRole.entities.DailyReport.list();
    const allReports = allReportsRaw.filter(r =>
      r.report_date >= weekStartStr && r.report_date <= weekEndStr
    );

    if (!allReports || allReports.length === 0) {
      return Response.json({ success: true, message: 'No reports found for last week.' });
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

    // Fetch all punch entries for the week
    const allPunches = await base44.asServiceRole.entities.PunchEntry.filter({
      week_start: weekStartStr
    });

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

      // Upload PDF as base64 string
      let downloadUrl = null;
      try {
        const uploadRes = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfBase64 });
        downloadUrl = uploadRes?.file_url || null;
      } catch(e) { console.error('Upload error:', e.message); }

      // Send email to each recipient
      for (const email of RECIPIENTS) {
        const body = downloadUrl
          ? `Bonjour,\n\nLe rapport de chantier pour le projet "${sanitize(projectName)}" (semaine du ${weekStartStr} au ${weekEndStr}) est disponible en telechargement :\n\n${downloadUrl}\n\nCe rapport contient ${sortedReports.length} jour(s) de travail.\n\nCordialement,\nTapIN`
          : `Bonjour,\n\nLe rapport de chantier pour le projet "${sanitize(projectName)}" (semaine du ${weekStartStr} au ${weekEndStr}) a ete genere mais une erreur est survenue lors de l'upload.\n\nCordialement,\nTapIN`;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: `Rapports de chantier - ${sanitize(projectName)} - Semaine du ${weekStartStr}`,
          body
        });
      }

      results.push({ project: projectName, days: sortedReports.length, filename });
    }

    return Response.json({ success: true, sent: results });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});