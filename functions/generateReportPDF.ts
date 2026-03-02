import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

function toHM(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${m.toString().padStart(2, '0')}`;
}

function formatDate(isoStr) {
  const date = new Date(isoStr);
  const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

function formatTime(isoStr) {
  const date = new Date(isoStr);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, projectId, projectName, date, weekStart, reports, workers, totalHours } = body;

    const doc = new jsPDF({ compress: true });
    doc.setLanguage("fr");
    const pageW = 210;
    const margin = 14;
    const colW = pageW - margin * 2;

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageW, 297, "F");

    let y = 14;

    // Header
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(projectName.toUpperCase(), margin, y + 12);

    doc.setFillColor(20, 20, 20);
    doc.roundedRect(pageW - margin - 52, y + 2, 52, 12, 1, 1, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(type === 'day' ? 'RAPPORT JOUR' : 'RAPPORT SEMAINE', pageW - margin - 49, y + 10);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(140, 140, 140);
    doc.text("TRAVAUX ET HEURES  ·  SITE", margin, y + 20);
    doc.setFontSize(7);
    doc.text("DOCUMENT GENERE ELECTRONIQUEMENT", pageW - margin - 51, y + 20);

    y += 26;
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    // Info card
    const cardH = 28;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, colW, cardH, "S");
    doc.line(margin + colW / 2, y, margin + colW / 2, y + cardH);

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(140, 140, 140);
    doc.text("PROJET", margin + 4, y + 8);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text(projectName.substring(0, 30), margin + 4, y + 18);

    const midX = margin + colW / 2 + 4;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(140, 140, 140);
    doc.text("TOTAL HEURES", midX, y + 8);

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 200, 80);
    doc.text(toHM(parseFloat(totalHours)), midX, y + 19);

    if (type === 'day') {
      const dateObj = new Date(date + 'T12:00:00');
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(140, 140, 140);
      doc.text(`DATE : ${formatDate(date + 'T12:00:00').toUpperCase()}`, midX, y + cardH - 4);
    } else {
      const startDate = new Date(weekStart + 'T12:00:00');
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(140, 140, 140);
      doc.text(`SEMAINE : ${startDate.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })}`, midX, y + cardH - 4);
    }

    y += cardH + 8;

    // Workers table
    if (workers && workers.length > 0) {
      doc.setFillColor(240, 242, 245);
      doc.rect(margin, y, colW, 9, "F");

      const cName = margin + 2;
      const cIn = margin + 50;
      const cOut = margin + 80;
      const cLunch = margin + 108;
      const cTotal = pageW - margin - 2;

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text("EMPLOYÉ", cName, y + 6);
      doc.text("ARRIVÉE", cIn, y + 6);
      doc.text("DÉPART", cOut, y + 6);
      doc.text("DÎNER", cLunch, y + 6);
      doc.text("TOTAL", cTotal, y + 6, { align: "right" });
      y += 12;

      workers.forEach((worker, idx) => {
        if (y > 255) {
          doc.addPage();
          doc.setFillColor(255, 255, 255);
          doc.rect(0, 0, pageW, 297, "F");
          y = 14;
        }

        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.line(margin, y + 7, pageW - margin, y + 7);

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);
        doc.text(worker.name.substring(0, 28), cName, y + 5);

        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        doc.text(worker.punchIn ? formatTime(worker.punchIn) : "-", cIn, y + 5);
        doc.text(worker.punchOut ? formatTime(worker.punchOut) : "-", cOut, y + 5);

        if (worker.lunchBreak > 0) {
          doc.setTextColor(220, 130, 30);
          doc.text(`${worker.lunchBreak}m`, cLunch, y + 5);
        } else {
          doc.setTextColor(180, 180, 180);
          doc.text("--", cLunch, y + 5);
        }

        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 200, 80);
        doc.text(toHM(parseFloat(worker.totalHours)), cTotal, y + 5, { align: "right" });
        y += 8;
      });

      y += 4;
    }

    // Details box
    if (reports && reports.length > 0) {
      const boxH = 20;
      if (y + boxH > 260) { doc.addPage(); doc.setFillColor(255,255,255); doc.rect(0,0,pageW,297,"F"); y = 14; }
      
      doc.setFillColor(20, 25, 40);
      doc.roundedRect(margin, y, colW, boxH, 2, 2, "F");

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 200, 80);
      doc.text(`${reports.length} RAPPORT(S) DE TRAVAUX`, margin + 6, y + 12);

      y += boxH + 6;

      // List reports
      reports.forEach((report, idx) => {
        if (y > 260) {
          doc.addPage();
          doc.setFillColor(255, 255, 255);
          doc.rect(0, 0, pageW, 297, "F");
          y = 14;
        }

        // Employee name - BIGGER
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 30, 30);
        doc.text(`${idx + 1}. ${report.user_name}`, margin, y);
        y += 6;

        // Details - LARGER
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);

        if (report.machine) doc.text(`Machine: ${report.machine}`, margin + 4, y), (y += 4);
        if (report.truck_count) doc.text(`Camions: ${report.truck_count}`, margin + 4, y), (y += 4);
        if (report.subcontractor) doc.text(`Sous-traitant: ${report.subcontractor}`, margin + 4, y), (y += 4);

        // Work section title
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 30, 30);
        doc.text("Travaux:", margin + 4, y);
        y += 4;

        const lines = doc.splitTextToSize(report.work_description, colW - 8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        lines.forEach(line => {
          if (y > 270) { doc.addPage(); doc.setFillColor(255,255,255); doc.rect(0,0,pageW,297,"F"); y = 14; }
          doc.text(line, margin + 4, y);
          y += 4;
        });

        if (report.other_notes) {
          y += 2;
          if (y > 270) { doc.addPage(); doc.setFillColor(255,255,255); doc.rect(0,0,pageW,297,"F"); y = 14; }
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 30, 30);
          doc.text("Notes:", margin + 4, y);
          y += 4;
          const noteLines = doc.splitTextToSize(report.other_notes, colW - 8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(80, 80, 80);
          noteLines.forEach(line => {
            if (y > 270) { doc.addPage(); doc.setFillColor(255,255,255); doc.rect(0,0,pageW,297,"F"); y = 14; }
            doc.text(line, margin + 4, y);
            y += 4;
          });
        }

        y += 4;
      });
    }

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    const now = new Date();
    doc.text(`Généré par TapIN · ${now.toLocaleDateString("fr-CA")} à ${now.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}`, pageW / 2, 290, { align: "center" });

    const pdfBuf = doc.output("arraybuffer");
    const pdfBuffer = new Uint8Array(pdfBuf);
    const filename = type === 'day' 
      ? `rapport_${new Date(date + 'T12:00:00').toLocaleDateString('fr-CA')}.pdf`
      : `rapport_semaine_${weekStart}.pdf`;

    return new Response(pdfBuffer, {
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