import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

function sanitize(str) {
  if (!str) return '';
  return str
    // Normalize ligatures before NFD decomposition
    .replace(/œ/gi, (m) => m === m.toUpperCase() ? 'OE' : 'oe')
    .replace(/æ/gi, (m) => m === m.toUpperCase() ? 'AE' : 'ae')
    // Normalize to NFD and strip combining diacritical marks (accents)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    // Apostrophes and quotes
    .replace(/[\u2018\u2019\u02BC\u02BB]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Dashes
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

// Draw a section title bar (blue)
function drawSectionBar(doc, x, y, w, title) {
  doc.setFillColor(30, 64, 175);
  doc.rect(x, y, w, 8, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(title, x + 4, y + 5.5);
  return y + 8;
}

// Draw a labeled text box
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

// Draw an info cell (label top, value below)
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { type, projectName, projectAddress, date, weekStart, reports, workers, totalHours, companyName, companyLogo } = body;

    const doc = new jsPDF();
    const PW = 210;
    const M = 12;
    const CW = PW - M * 2;

    let y = 0;

    // =====================================================================
    // HEADER BAND - dark blue gradient-look
    // =====================================================================
    doc.setFillColor(15, 40, 120);
    doc.rect(0, 0, PW, 38, 'F');

    // Left green accent bar
    doc.setFillColor(34, 197, 94);
    doc.rect(0, 0, 5, 38, 'F');

    // Company name
    const textX = 10;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(sanitize(companyName || 'TapIN'), textX, 16);

    // Title
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 210, 255);
    doc.text('RAPPORT JOURNALIER DE CHANTIER', textX, 25);

    // Date top-right
    let dateLabel;
    if (type === 'day') {
      dateLabel = frDate(date);
    } else {
      const wStart = new Date(weekStart + 'T12:00:00');
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 6);
      dateLabel = `Semaine du ${wStart.toLocaleDateString('fr-CA')} au ${wEnd.toLocaleDateString('fr-CA')}`;
    }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94);
    doc.text(dateLabel.toUpperCase(), PW - M, 20, { align: 'right' });

    y = 43;

    // =====================================================================
    // 1. INFORMATIONS GÉNÉRALES
    // =====================================================================
    y = drawSectionBar(doc, M, y, CW, '1.  INFORMATIONS GENERALES');
    y += 2;

    const foreman = (reports && reports.length > 0) ? reports[0].user_name : '-';
    const cellH = 16;
    const w2 = (CW - 2) / 2;

    drawCell(doc, M,       y, w2, cellH, 'PROJET', projectName);
    drawCell(doc, M+w2+2,  y, w2, cellH, 'ADRESSE', projectAddress || '-');
    y += cellH + 2;
    drawCell(doc, M,       y, w2, cellH, 'DATE', type === 'day' ? frDate(date) : dateLabel);
    drawCell(doc, M+w2+2,  y, w2, cellH, 'CONTREMAITRE', foreman);
    y += cellH + 2;
    drawCell(doc, M,       y, CW, cellH, 'MÉTÉO', report.weather || '-');
    y += cellH + 5;

    // =====================================================================
    // 2. MAIN D'OEUVRE
    // =====================================================================
    y = drawSectionBar(doc, M, y, CW, "2.  MAIN D'OEUVRE");

    // Table header
    const cols = [
      { label: 'NOM',      x: M + 2,   w: 60 },
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
        doc.text(sanitize(w.name.substring(0, 30)), cols[0].x, y + 5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        doc.text(fmtTime(w.punchIn),  cols[1].x, y + 5);
        doc.text(fmtTime(w.punchOut), cols[2].x, y + 5);
        doc.text(w.lunchBreak > 0 ? `${w.lunchBreak}m` : '-', cols[3].x, y + 5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(22, 163, 74);
        doc.text(toHM(w.totalHours), cols[4].x, y + 5);
        y += 7;
      });

      // Total row
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

    // =====================================================================
    // 3. SOUS-TRAITANTS
    // =====================================================================
    const report = (reports && reports.length > 0) ? reports[0] : {};

    y = drawSectionBar(doc, M, y, CW, '3.  SOUS-TRAITANTS');
    y += 2;
    y = drawTextBox(doc, M, y, CW, report.subcontractor) + 5;

    // =====================================================================
    // 4. ÉQUIPEMENTS & MACHINERIE
    // =====================================================================
    if (y > 220) { doc.addPage(); y = 14; }
    y = drawSectionBar(doc, M, y, CW, '4.  EQUIPEMENTS & MACHINERIE');
    y += 2;

    let equipText = '';
    if (report.machine) equipText += report.machine;
    
    // Handle machine hours
    let machineHours = {};
    try {
      machineHours = JSON.parse(report.machine_hours || '{}');
    } catch {}
    if (Object.keys(machineHours).length > 0) {
      equipText += (equipText ? '\n\nHEURES PAR EQUIPEMENT:\n' : 'HEURES PAR EQUIPEMENT:\n');
      Object.entries(machineHours).forEach(([machine, hours]) => {
        if (hours) equipText += `${machine}: ${hours}h\n`;
      });
    }
    
    // Handle trucks (new format)
    let trucks = [];
    try {
      trucks = JSON.parse(report.trucks || '[]');
    } catch {}
    if (trucks && trucks.length > 0) {
      equipText += (equipText ? '\nCAMIONS:\n' : 'CAMIONS:\n');
      trucks.forEach(t => {
        if (t && t.type && t.plate) {
          equipText += `- ${t.type} (${t.plate}): ${t.trips || 0} voyage${t.trips !== 1 ? 's' : ''}\n`;
        }
      });
    }
    
    y = drawTextBox(doc, M, y, CW, equipText || null) + 5;

    // =====================================================================
    // 5. DESCRIPTION DES TRAVAUX
    // =====================================================================
    if (y > 195) { doc.addPage(); y = 14; }
    y = drawSectionBar(doc, M, y, CW, '5.  DESCRIPTION DES TRAVAUX EFFECTUES');
    y += 2;
    y = drawTextBox(doc, M, y, CW, report.work_description) + 5;

    // =====================================================================
    // 6. RETARDS, PROBLÈMES OU OBSERVATIONS
    // =====================================================================
    if (y > 220) { doc.addPage(); y = 14; }
    y = drawSectionBar(doc, M, y, CW, '6.  RETARDS, PROBLEMES OU OBSERVATIONS');
    y += 2;
    y = drawTextBox(doc, M, y, CW, report.other_notes) + 6;

    // =====================================================================
    // 7. SIGNATURE CONTREMAÎTRE
    // =====================================================================
    if (y + 34 > 275) { doc.addPage(); y = 14; }
    y = drawSectionBar(doc, M, y, CW, '7.  SIGNATURE CONTREMAITRE');
    y += 4;

    const sigBoxW = 90;
    const sigBoxH = 28;

    // Left: info
    doc.setFillColor(240, 245, 255);
    doc.setDrawColor(150, 180, 230);
    doc.setLineWidth(0.3);
    doc.rect(M, y, sigBoxW, sigBoxH, 'F');
    doc.rect(M, y, sigBoxW, sigBoxH, 'S');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text('NOM:', M + 4, y + 7);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    doc.text(sanitize(foreman), M + 4, y + 15);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('DATE: ' + (type === 'day' ? frDate(date) : dateLabel), M + 4, y + 22);

    // Right: signature line
    const sigX = M + sigBoxW + 10;
    const sigW = CW - sigBoxW - 10;
    doc.setFillColor(248, 250, 255);
    doc.setDrawColor(150, 180, 230);
    doc.rect(sigX, y, sigW, sigBoxH, 'F');
    doc.rect(sigX, y, sigW, sigBoxH, 'S');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text('SIGNATURE:', sigX + 4, y + 7);

    // Stamp: APPROUVE PAR [foreman]
    const stampText = `APPROUVE PAR ${sanitize(foreman).toUpperCase()}`;
    const stampCenterX = sigX + sigW / 2;
    const stampCenterY = y + sigBoxH / 2 + 2;
    const stampPad = { x: 8, y: 4 };

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const stampW = doc.getTextWidth(stampText) + stampPad.x * 2;
    const stampH = 10;

    doc.setDrawColor(100, 180, 100);
    doc.setLineWidth(1.2);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(stampCenterX - stampW / 2, stampCenterY - stampH / 2, stampW, stampH, 3, 3, 'FD');

    doc.setTextColor(100, 160, 90);
    doc.text(stampText, stampCenterX, stampCenterY + 3, { align: 'center' });

    // Underline below stamp
    doc.setDrawColor(180, 210, 180);
    doc.setLineWidth(0.4);
    doc.line(sigX + 6, y + sigBoxH - 3, sigX + sigW - 6, y + sigBoxH - 3);

    // =====================================================================
    // FOOTER
    // =====================================================================
    const pageCount = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFillColor(15, 40, 120);
      doc.rect(0, 288, PW, 9, 'F');
      doc.setFillColor(34, 197, 94);
      doc.rect(0, 288, 5, 9, 'F');
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 210, 255);
      const now = new Date();
      doc.text(`TapIN · Genere le ${now.toLocaleDateString('fr-CA')} a ${now.toLocaleTimeString('fr-CA',{hour:'2-digit',minute:'2-digit'})}`, 10, 293.5);
      doc.setTextColor(34, 197, 94);
      doc.text(`Page ${p} / ${pageCount}`, PW - 10, 293.5, { align: 'right' });
    }

    const filename = type === 'day' ? `rapport_${date}.pdf` : `rapport_semaine_${weekStart}.pdf`;
    return new Response(new Uint8Array(doc.output('arraybuffer')), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});