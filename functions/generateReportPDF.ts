import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import jsPDF from 'npm:jspdf@4.0.0';

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
    const maxWidth = doc.internal.pageSize.width - 2 * margin;

    const addPage = () => {
      doc.addPage();
      yPos = margin;
    };

    const checkPageBreak = (height = 10) => {
      if (yPos + height > pageHeight - margin) {
        addPage();
      }
    };

    // Header
    doc.setFontSize(16);
    doc.setTextColor(34, 197, 94);
    doc.text(type === 'day' ? 'Rapport Journalier' : 'Rapport Hebdomadaire', margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Projet: ${projectName}`, margin, yPos);
    yPos += 6;

    if (type === 'day') {
      const dateObj = new Date(date + 'T12:00:00');
      const formattedDate = dateObj.toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      doc.text(`Date: ${formattedDate}`, margin, yPos);
    } else {
      const startDate = new Date(weekStart + 'T12:00:00');
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      const dateRange = `${startDate.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      doc.text(`Semaine du: ${dateRange}`, margin, yPos);
    }
    yPos += 8;

    doc.text(`Généré le: ${new Date().toLocaleDateString('fr-CA')} à ${new Date().toLocaleTimeString('fr-CA')}`, margin, yPos);
    yPos += 12;

    // Total hours summary
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text(`Heures totales: ${parseFloat(totalHours).toFixed(2)}h`, margin, yPos);
    yPos += 8;

    // Workers section
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(34, 197, 94);
    doc.text('Employés ayant travaillé', margin, yPos);
    yPos += 6;

    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');

    workers.forEach(worker => {
      checkPageBreak(18);
      
      doc.setFont(undefined, 'bold');
      doc.text(worker.name, margin + 2, yPos);
      yPos += 5;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);

      if (worker.punchIn) {
        const arrivalTime = new Date(worker.punchIn).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
        doc.text(`Arrivée: ${arrivalTime}`, margin + 4, yPos);
        yPos += 4;
      }

      if (worker.punchOut) {
        const departureTime = new Date(worker.punchOut).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
        doc.text(`Départ: ${departureTime}`, margin + 4, yPos);
        yPos += 4;
      }

      if (worker.lunchBreak > 0) {
        doc.text(`Dîner: ${worker.lunchBreak} min`, margin + 4, yPos);
        yPos += 4;
      }

      doc.setFont(undefined, 'bold');
      doc.setTextColor(34, 197, 94);
      doc.text(`Total: ${parseFloat(worker.totalHours).toFixed(2)}h`, margin + 4, yPos);
      yPos += 6;

      doc.setTextColor(0, 0, 0);
    });

    yPos += 4;

    // Daily reports section
    if (reports && reports.length > 0) {
      checkPageBreak(8);
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(34, 197, 94);
      doc.text('Détails des travaux', margin, yPos);
      yPos += 6;

      reports.forEach((report, index) => {
        checkPageBreak(20);
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`Rapport ${index + 1}`, margin + 2, yPos);
        yPos += 4;

        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(80, 80, 80);

        doc.text(`Employé: ${report.user_name}`, margin + 4, yPos);
        yPos += 3;

        if (report.machine) {
          doc.text(`Machine: ${report.machine}`, margin + 4, yPos);
          yPos += 3;
        }

        if (report.truck_count) {
          doc.text(`Camions: ${report.truck_count}`, margin + 4, yPos);
          yPos += 3;
        }

        if (report.subcontractor) {
          doc.text(`Sous-traitant: ${report.subcontractor}`, margin + 4, yPos);
          yPos += 3;
        }

        doc.setFont(undefined, 'bold');
        doc.text('Travaux effectués:', margin + 4, yPos);
        yPos += 3;

        doc.setFont(undefined, 'normal');
        const workDescLines = doc.splitTextToSize(report.work_description, maxWidth - 8);
        workDescLines.forEach(line => {
          checkPageBreak(3);
          doc.text(line, margin + 6, yPos);
          yPos += 3;
        });

        if (report.other_notes) {
          yPos += 1;
          doc.setFont(undefined, 'bold');
          doc.text('Notes:', margin + 4, yPos);
          yPos += 3;
          
          doc.setFont(undefined, 'normal');
          const notesLines = doc.splitTextToSize(report.other_notes, maxWidth - 8);
          notesLines.forEach(line => {
            checkPageBreak(3);
            doc.text(line, margin + 6, yPos);
            yPos += 3;
          });
        }

        yPos += 3;
      });
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