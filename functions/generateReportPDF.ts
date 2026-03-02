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

    const doc = new jsPDF();
    const pageW = 210;
    const margin = 12;
    const colW = pageW - margin * 2;

    let y = 10;

    // Header - green bar
    doc.setFillColor(22, 163, 74);
    doc.rect(0, y, pageW, 18, "F");
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(projectName.toUpperCase(), margin, y + 12);

    y += 22;

    // Info boxes
    const boxW = (colW - 3) / 2;
    const boxH = 20;
    
    // Date box
    doc.setFillColor(200, 230, 201);
    doc.rect(margin, y, boxW, boxH, "F");
    doc.setDrawColor(22, 163, 74);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, boxW, boxH, "S");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(27, 94, 32);
    doc.text("DATE", margin + 3, y + 4);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(type === 'day' ? formatDate(date + 'T12:00:00') : new Date(weekStart + 'T12:00:00').toLocaleDateString('fr-CA'), margin + 3, y + 14);
    
    // Total hours box
    doc.setFillColor(200, 230, 201);
    doc.rect(margin + boxW + 3, y, boxW, boxH, "F");
    doc.setDrawColor(22, 163, 74);
    doc.setLineWidth(0.5);
    doc.rect(margin + boxW + 3, y, boxW, boxH, "S");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(27, 94, 32);
    doc.text("TOTAL HEURES", margin + boxW + 6, y + 4);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(22, 163, 74);
    doc.text(toHM(parseFloat(totalHours)), margin + boxW + 6, y + 15);
    
    y += boxH + 8;

    // Workers section
    if (workers && workers.length > 0) {
      doc.setFillColor(22, 163, 74);
      doc.rect(margin, y, colW, 7, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("EMPLOYES", margin + 3, y + 5);
      y += 9;

      workers.forEach((worker) => {
        if (y > 250) {
          doc.addPage();
          y = 10;
        }

        const wBoxH = 28;
        doc.setFillColor(245, 245, 245);
        doc.setDrawColor(22, 163, 74);
        doc.setLineWidth(0.4);
        doc.rect(margin, y, colW, wBoxH, "F");
        doc.rect(margin, y, colW, wBoxH, "S");

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(22, 163, 74);
        doc.text(worker.name, margin + 4, y + 5);

        const w1 = (colW - 8) / 3;
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);
        doc.text(`Arrivée: ${worker.punchIn ? formatTime(worker.punchIn) : "-"}`, margin + 4, y + 12);
        doc.text(`Départ: ${worker.punchOut ? formatTime(worker.punchOut) : "-"}`, margin + 4, y + 19);
        
        doc.setFont("helvetica", "bold");
        doc.setTextColor(22, 163, 74);
        doc.text(`Dîner: ${worker.lunchBreak > 0 ? worker.lunchBreak + "m" : "-"}`, margin + 4 + w1, y + 12);
        doc.text(`Total: ${toHM(parseFloat(worker.totalHours))}`, margin + 4 + w1 * 2, y + 12);

        y += wBoxH + 4;
      });

      y += 2;
    }

    // Reports section
    if (reports && reports.length > 0) {
      doc.setFillColor(22, 163, 74);
      doc.rect(margin, y, colW, 7, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(`RAPPORTS DE TRAVAUX (${reports.length})`, margin + 3, y + 5);
      y += 9;

      reports.forEach((report, idx) => {
        if (y > 235) {
          doc.addPage();
          y = 10;
        }

        const rBoxH = 68;
        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(22, 163, 74);
        doc.setLineWidth(0.4);
        doc.rect(margin, y, colW, rBoxH, "F");
        doc.rect(margin, y, colW, rBoxH, "S");

        // Employee number and name
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(22, 163, 74);
        doc.text(`${idx + 1}. ${report.user_name}`, margin + 4, y + 6);

        let cy = y + 14;
        const halfW = (colW - 8) / 2;

        // Left column
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.text("MACHINE:", margin + 4, cy);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(9);
        doc.text(report.machine || "-", margin + 4, cy + 5);

        cy += 11;
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.text("CAMIONS:", margin + 4, cy);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(9);
        doc.text(report.truck_count ? report.truck_count.toString() : "-", margin + 4, cy + 5);

        // Right column
        cy = y + 14;
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.text("SOUS-TRAITANT:", margin + 4 + halfW, cy);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(9);
        doc.text(report.subcontractor || "-", margin + 4 + halfW, cy + 5);

        // Work description box
        cy = y + 38;
        doc.setFillColor(230, 245, 230);
        doc.setDrawColor(22, 163, 74);
        doc.setLineWidth(0.3);
        doc.rect(margin + 2, cy, colW - 4, 18, "F");
        doc.rect(margin + 2, cy, colW - 4, 18, "S");

        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(22, 163, 74);
        doc.text("TRAVAUX", margin + 5, cy + 3);

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);
        const workLines = doc.splitTextToSize(report.work_description, colW - 10);
        workLines.slice(0, 2).forEach((line, i) => {
          doc.text(line, margin + 5, cy + 7 + (i * 4));
        });

        y += rBoxH + 4;
      });
    }

    // Footer
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    const now = new Date();
    doc.text(`TapIN · ${now.toLocaleDateString("fr-CA")} ${now.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}`, pageW / 2, 292, { align: "center" });

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