import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

function toHM(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${m.toString().padStart(2, '0')}`;
}

function formatDateStr(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const months = ['jan.', 'fev.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'aout', 'sept.', 'oct.', 'nov.', 'dec.'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatTime(isoStr) {
  const date = new Date(isoStr);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function sectionHeader(doc, x, y, w, title) {
  doc.setFillColor(22, 163, 74);
  doc.rect(x, y, w, 7, "F");
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(title, x + 3, y + 5);
  return y + 7;
}

function infoBox(doc, x, y, w, h, label, value) {
  doc.setFillColor(248, 248, 248);
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, h, "F");
  doc.rect(x, y, w, h, "S");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120, 120, 120);
  doc.text(label, x + 3, y + 4.5);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  const lines = doc.splitTextToSize(String(value || "-"), w - 6);
  doc.text(lines[0] || "-", x + 3, y + 11);
}

function textSection(doc, x, y, w, title, text) {
  const safeText = String(text || "Aucun");
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(safeText, w - 8);
  const lineH = 5;
  const boxH = Math.max(14, lines.length * lineH + 8);
  if (y + 7 + boxH > 270) { doc.addPage(); y = 12; }
  y = sectionHeader(doc, x, y, w, title);
  doc.setFillColor(252, 252, 252);
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, boxH, "F");
  doc.rect(x, y, w, boxH, "S");
  doc.setTextColor(30, 30, 30);
  lines.forEach((line, i) => {
    doc.text(line, x + 4, y + 6 + (i * lineH));
  });
  return y + boxH;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { type, projectName, projectAddress, date, weekStart, reports, workers, totalHours, companyName, companyLogo } = body;

    const doc = new jsPDF();
    const pageW = 210;
    const M = 12;
    const cW = pageW - M * 2;
    let y = 12;

    // --- HEADER ---
    let logoW = 0;
    if (companyLogo) {
      try {
        const res = await fetch(companyLogo);
        const buf = await res.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const b64 = btoa(binary);
        const fmt = companyLogo.toLowerCase().includes('.png') ? 'PNG' : 'JPEG';
        doc.addImage(`data:image/${fmt.toLowerCase()};base64,${b64}`, fmt, M, y, 18, 18);
        logoW = 22;
      } catch(e) { /* skip */ }
    }

    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(companyName || "TapIN", M + logoW, y + 8);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(22, 163, 74);
    doc.text("RAPPORT JOURNALIER DE CHANTIER", pageW - M, y + 6, { align: "right" });

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    const dateLabel = type === 'day' ? formatDateStr(date) : `Semaine du ${new Date(weekStart + 'T12:00:00').toLocaleDateString('fr-CA')}`;
    doc.text(dateLabel, pageW - M, y + 14, { align: "right" });

    y += 24;
    doc.setFillColor(22, 163, 74);
    doc.rect(M, y, cW, 1.5, "F");
    y += 5;

    // --- INFORMATIONS GÉNÉRALES ---
    y = sectionHeader(doc, M, y, cW, "INFORMATIONS GENERALES");
    y += 2;

    const bW = (cW - 3) / 2;
    const bH = 14;
    const foreman = reports && reports.length > 0 ? reports[0].user_name : "-";

    infoBox(doc, M, y, bW, bH, "PROJET", projectName);
    infoBox(doc, M + bW + 3, y, bW, bH, "ADRESSE", projectAddress || "-");
    y += bH + 2;
    infoBox(doc, M, y, bW, bH, "DATE", type === 'day' ? formatDateStr(date) : dateLabel);
    infoBox(doc, M + bW + 3, y, bW, bH, "CONTREMAITRE", foreman);
    y += bH + 5;

    // --- MAIN D'OEUVRE ---
    y = sectionHeader(doc, M, y, cW, "MAIN D'OEUVRE");

    const cols = [
      { label: "NOM", x: M + 2 },
      { label: "ARRIVEE", x: M + 68 },
      { label: "DEPART", x: M + 97 },
      { label: "DINER", x: M + 126 },
      { label: "TOTAL", x: M + 153 },
    ];

    doc.setFillColor(235, 235, 235);
    doc.rect(M, y, cW, 7, "F");
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(M, y, cW, 7, "S");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    cols.forEach(c => doc.text(c.label, c.x, y + 5));
    y += 7;

    if (workers && workers.length > 0) {
      workers.forEach((w, i) => {
        if (y > 255) { doc.addPage(); y = 12; }
        doc.setFillColor(i % 2 === 0 ? 252 : 245, i % 2 === 0 ? 252 : 249, i % 2 === 0 ? 252 : 245);
        doc.rect(M, y, cW, 7, "F");
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.line(M, y + 7, M + cW, y + 7);

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 30, 30);
        doc.text(w.name.substring(0, 32), cols[0].x, y + 5);

        doc.setFont("helvetica", "normal");
        doc.text(w.punchIn ? formatTime(w.punchIn) : "-", cols[1].x, y + 5);
        doc.text(w.punchOut ? formatTime(w.punchOut) : "-", cols[2].x, y + 5);
        doc.text(w.lunchBreak > 0 ? `${w.lunchBreak}m` : "-", cols[3].x, y + 5);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(22, 163, 74);
        doc.text(toHM(parseFloat(w.totalHours)), cols[4].x, y + 5);
        y += 7;
      });

      doc.setFillColor(200, 230, 201);
      doc.setDrawColor(22, 163, 74);
      doc.setLineWidth(0.4);
      doc.rect(M, y, cW, 8, "F");
      doc.rect(M, y, cW, 8, "S");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(22, 163, 74);
      doc.text("TOTAL:", M + 2, y + 5.5);
      doc.text(toHM(parseFloat(totalHours)), cols[4].x, y + 5.5);
      y += 12;
    } else {
      doc.setFillColor(252, 252, 252);
      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.3);
      doc.rect(M, y, cW, 10, "F");
      doc.rect(M, y, cW, 10, "S");
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150, 150, 150);
      doc.text("Aucun employe enregistre", M + 4, y + 7);
      y += 14;
    }

    const report = reports && reports.length > 0 ? reports[0] : {};

    // --- SOUS-TRAITANTS ---
    y = textSection(doc, M, y, cW, "SOUS-TRAITANTS", report.subcontractor) + 4;

    // --- EQUIPEMENTS & MACHINERIE ---
    let equipText = "";
    if (report.machine) equipText += report.machine;
    if (report.truck_count) equipText += (equipText ? "\nCamions: " : "Camions: ") + report.truck_count;
    y = textSection(doc, M, y, cW, "EQUIPEMENTS & MACHINERIE", equipText || null) + 4;

    // --- DESCRIPTION DES TRAVAUX ---
    y = textSection(doc, M, y, cW, "DESCRIPTION DES TRAVAUX EFFECTUES", report.work_description) + 4;

    // --- RETARDS, PROBLÈMES OU OBSERVATIONS ---
    y = textSection(doc, M, y, cW, "RETARDS, PROBLEMES OU OBSERVATIONS", report.other_notes) + 6;

    // --- SIGNATURE CONTREMAÎTRE ---
    if (y + 30 > 275) { doc.addPage(); y = 12; }
    y = sectionHeader(doc, M, y, cW, "SIGNATURE CONTREMAITRE");
    y += 3;

    const sigW = cW / 2;
    const sigH = 24;
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(M, y, sigW, sigH, "F");
    doc.rect(M, y, sigW, sigH, "S");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(120, 120, 120);
    doc.text("Nom:", M + 4, y + 7);
    doc.setTextColor(30, 30, 30);
    doc.text(foreman, M + 18, y + 7);

    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.5);
    doc.line(M + 4, y + sigH - 4, M + sigW - 8, y + sigH - 4);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text("Signature", M + 4, y + sigH - 1);

    // Footer
    doc.setFontSize(6);
    doc.setTextColor(180, 180, 180);
    const now = new Date();
    doc.text(`Genere par TapIN - ${now.toLocaleDateString("fr-CA")} ${now.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}`, pageW / 2, 292, { align: "center" });

    const pdfBuf = doc.output("arraybuffer");
    const filename = type === 'day' ? `rapport_${date}.pdf` : `rapport_semaine_${weekStart}.pdf`;

    return new Response(new Uint8Array(pdfBuf), {
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