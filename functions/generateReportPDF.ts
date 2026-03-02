import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';
import 'npm:jspdf-autotable@3.5.35';

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
    let yPos = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;

    const addPage = () => {
      doc.addPage();
      yPos = margin;
    };

    // Header
    doc.setFontSize(24);
    doc.setTextColor(34, 197, 94);
    doc.text(type === 'day' ? 'Rapport Journalier' : 'Rapport Hebdomadaire', margin, yPos);
    yPos += 12;

    // Info box
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos - 2, doc.internal.pageSize.width - 2 * margin, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Projet: ${projectName}`, margin + 3, yPos + 3);
    
    let infoY = yPos + 3;
    if (type === 'day') {
      const dateObj = new Date(date + 'T12:00:00');
      const formattedDate = dateObj.toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      doc.text(`Date: ${formattedDate}`, margin + 3, infoY + 6);
    } else {
      const startDate = new Date(weekStart + 'T12:00:00');
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      const dateRange = `${startDate.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      doc.text(`Semaine du: ${dateRange}`, margin + 3, infoY + 6);
    }
    doc.text(`Généré le: ${new Date().toLocaleDateString('fr-CA')}`, margin + 3, infoY + 12);
    
    yPos += 28;

    // Total hours
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(34, 197, 94);
    doc.text(`Heures totales: ${parseFloat(totalHours).toFixed(2)}h`, margin, yPos);
    yPos += 12;

    // Workers table
    if (workers && workers.length > 0) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(34, 197, 94);
      doc.text('Employés', margin, yPos);
      yPos += 6;

      const workerData = workers.map(w => [
        w.name,
        w.punchIn ? new Date(w.punchIn).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }) : '-',
        w.punchOut ? new Date(w.punchOut).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }) : '-',
        w.lunchBreak > 0 ? `${w.lunchBreak} min` : '-',
        `${parseFloat(w.totalHours).toFixed(2)}h`
      ]);

      doc.autoTable({
        head: [['Nom', 'Arrivée', 'Départ', 'Dîner', 'Total']],
        body: workerData,
        startY: yPos,
        margin: { left: margin, right: margin },
        headerStyles: { 
          fillColor: [34, 197, 94],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: { 
          textColor: [0, 0, 0],
          lineColor: [200, 200, 200]
        },
        alternateRowStyles: { 
          fillColor: [245, 245, 245] 
        },
        columnStyles: {
          0: { halign: 'left' },
          1: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center', fontStyle: 'bold', textColor: [34, 197, 94] }
        },
        didDrawPage: function(data) {
          yPos = data.lastAutoTable.finalY + 10;
        }
      });

      yPos = doc.lastAutoTable.finalY + 10;
    }

    // Reports table
    if (reports && reports.length > 0) {
      if (yPos + 20 > pageHeight - margin) {
        addPage();
        yPos = margin;
      }

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(34, 197, 94);
      doc.text('Détails des travaux', margin, yPos);
      yPos += 6;

      const reportData = reports.map((r, idx) => [
        idx + 1,
        r.user_name,
        r.machine || '-',
        r.truck_count || '-',
        r.subcontractor || '-',
        r.work_description.length > 30 ? r.work_description.substring(0, 30) + '...' : r.work_description
      ]);

      doc.autoTable({
        head: [['#', 'Employé', 'Machine', 'Camions', 'Sous-traitant', 'Travaux']],
        body: reportData,
        startY: yPos,
        margin: { left: margin, right: margin },
        headerStyles: { 
          fillColor: [34, 197, 94],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: { 
          textColor: [0, 0, 0],
          lineColor: [200, 200, 200],
          fontSize: 9
        },
        alternateRowStyles: { 
          fillColor: [245, 245, 245] 
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'left' },
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'left' },
          5: { halign: 'left' }
        }
      });

      // Add detailed notes on new page if needed
      if (reports.some(r => r.other_notes)) {
        if (doc.lastAutoTable.finalY + 20 > pageHeight - margin) {
          addPage();
        }
        yPos = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(34, 197, 94);
        doc.text('Notes supplémentaires', margin, yPos);
        yPos += 8;

        reports.forEach((report, index) => {
          if (report.other_notes) {
            if (yPos + 15 > pageHeight - margin) {
              addPage();
              yPos = margin;
            }

            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(`Rapport ${index + 1} (${report.user_name}):`, margin, yPos);
            yPos += 5;

            doc.setFont(undefined, 'normal');
            doc.setFontSize(9);
            const notesLines = doc.splitTextToSize(report.other_notes, doc.internal.pageSize.width - 2 * margin - 5);
            notesLines.forEach(line => {
              if (yPos + 4 > pageHeight - margin) {
                addPage();
                yPos = margin;
              }
              doc.text(line, margin + 3, yPos);
              yPos += 4;
            });
            yPos += 3;
          }
        });
      }
    }

    const pdfBytes = doc.output('arraybuffer');
    const filename = type === 'day' 
      ? `rapport_${new Date(date + 'T12:00:00').toLocaleDateString('fr-CA')}.pdf`
      : `rapport_semaine_${weekStart}.pdf`;

    return new Response(pdfBytes, {
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