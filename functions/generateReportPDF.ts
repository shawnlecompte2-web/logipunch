import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import PDFDocument from 'npm:pdfkit@0.14.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, projectId, projectName, date, weekStart, reports, workers, totalHours } = body;

    const doc = new PDFDocument({ bufferPages: true, margin: 40 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    const docFinish = new Promise(resolve => doc.on('end', resolve));

    const margin = 40;
    const pageWidth = doc.page.width;

    // Header
    doc.fontSize(24).fillColor('#22c55e').font('Helvetica-Bold').text(type === 'day' ? 'Rapport Journalier' : 'Rapport Hebdomadaire');
    doc.moveDown(0.5);

    // Info box
    doc.fontSize(10).fillColor('#000000').font('Helvetica');
    doc.rect(margin, doc.y, pageWidth - 2 * margin, 60).stroke('#22c55e');
    
    const infoY = doc.y + 8;
    doc.fontSize(10).text(`Projet: ${projectName}`, margin + 10, infoY);
    
    if (type === 'day') {
      const dateObj = new Date(date + 'T12:00:00');
      const formattedDate = dateObj.toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      doc.text(`Date: ${formattedDate}`, margin + 10);
    } else {
      const startDate = new Date(weekStart + 'T12:00:00');
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      const dateRange = `${startDate.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      doc.text(`Semaine du: ${dateRange}`, margin + 10);
    }
    doc.text(`Généré le: ${new Date().toLocaleDateString('fr-CA')}`, margin + 10);
    
    doc.y = infoY + 65;
    doc.moveDown(0.5);

    // Total hours
    doc.fontSize(14).fillColor('#22c55e').font('Helvetica-Bold').text(`Heures totales: ${parseFloat(totalHours).toFixed(2)}h`);
    doc.moveDown(1);

    // Workers section
    if (workers && workers.length > 0) {
      doc.fontSize(12).fillColor('#22c55e').font('Helvetica-Bold').text('Employés');
      doc.moveDown(0.5);

      doc.fontSize(9).fillColor('#000000').font('Helvetica');
      
      const tableTop = doc.y;
      const colWidths = [(pageWidth - 2 * margin) / 5, (pageWidth - 2 * margin) / 5, (pageWidth - 2 * margin) / 5, (pageWidth - 2 * margin) / 5, (pageWidth - 2 * margin) / 5];
      const headers = ['Nom', 'Arrivée', 'Départ', 'Dîner', 'Total'];
      
      // Draw headers
      doc.rect(margin, tableTop, pageWidth - 2 * margin, 20).fillColor('#22c55e').stroke('#22c55e');
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
      let xPos = margin + 5;
      headers.forEach((header, i) => {
        doc.text(header, xPos, tableTop + 5, { width: colWidths[i] - 10, align: 'center' });
        xPos += colWidths[i];
      });

      // Draw rows
      doc.fillColor('#000000').font('Helvetica').fontSize(8);
      let rowY = tableTop + 25;
      const rowHeight = 18;
      let rowIndex = 0;

      workers.forEach(worker => {
        if (rowY + rowHeight > doc.page.height - 40) {
          doc.addPage();
          rowY = margin;
        }

        const rowData = [
          worker.name,
          worker.punchIn ? new Date(worker.punchIn).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }) : '-',
          worker.punchOut ? new Date(worker.punchOut).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }) : '-',
          worker.lunchBreak > 0 ? `${worker.lunchBreak} min` : '-',
          `${parseFloat(worker.totalHours).toFixed(2)}h`
        ];

        // Background color for alternating rows
        if (rowIndex % 2 === 1) {
          doc.rect(margin, rowY - 8, pageWidth - 2 * margin, rowHeight).fill('#f5f5f5');
          doc.fillColor('#000000');
        } else {
          doc.fillColor('#000000');
        }

        // Draw border
        doc.rect(margin, rowY - 8, pageWidth - 2 * margin, rowHeight).stroke('#c8c8c8');

        xPos = margin + 5;
        rowData.forEach((cell, i) => {
          const isBold = i === 4;
          if (isBold) {
            doc.font('Helvetica-Bold').fillColor('#22c55e');
          } else {
            doc.font('Helvetica').fillColor('#000000');
          }
          doc.fontSize(8).text(cell, xPos, rowY - 3, { width: colWidths[i] - 10, align: i === 0 ? 'left' : 'center' });
          xPos += colWidths[i];
        });

        rowY += rowHeight;
        rowIndex++;
      });

      doc.moveDown(2);
    }

    // Reports details
    if (reports && reports.length > 0) {
      if (doc.y + 40 > doc.page.height - 40) {
        doc.addPage();
      }

      doc.fontSize(12).fillColor('#22c55e').font('Helvetica-Bold').text('Détails des travaux');
      doc.moveDown(0.5);

      reports.forEach((report, idx) => {
        if (doc.y + 50 > doc.page.height - 40) {
          doc.addPage();
        }

        doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold').text(`Rapport ${idx + 1}`);
        doc.fontSize(9).font('Helvetica').fillColor('#505050');
        
        doc.text(`Employé: ${report.user_name}`);
        if (report.machine) doc.text(`Machine: ${report.machine}`);
        if (report.truck_count) doc.text(`Camions: ${report.truck_count}`);
        if (report.subcontractor) doc.text(`Sous-traitant: ${report.subcontractor}`);
        
        doc.fillColor('#000000').font('Helvetica-Bold').text('Travaux effectués:');
        doc.font('Helvetica').fillColor('#505050').text(report.work_description, { width: pageWidth - 2 * margin - 20 });
        
        if (report.other_notes) {
          doc.fillColor('#000000').font('Helvetica-Bold').text('Notes:');
          doc.font('Helvetica').fillColor('#505050').text(report.other_notes, { width: pageWidth - 2 * margin - 20 });
        }

        doc.moveDown(0.5);
      });
    }

    doc.end();
    await docFinish;

    const pdfBuffer = new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []));
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
    console.error('PDF generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});