import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all reports
    const allReports = await base44.entities.DailyReport.list();
    let updated = 0;

    for (const report of allReports) {
      let needsUpdate = false;
      const updates = {};

      // Ensure machine_hours is a JSON string
      if (report.machine_hours && typeof report.machine_hours !== 'string') {
        updates.machine_hours = JSON.stringify(report.machine_hours);
        needsUpdate = true;
      } else if (!report.machine_hours) {
        updates.machine_hours = '{}';
        needsUpdate = true;
      }

      // Ensure trucks is a JSON string
      if (report.trucks && typeof report.trucks !== 'string') {
        updates.trucks = JSON.stringify(report.trucks);
        needsUpdate = true;
      } else if (!report.trucks) {
        updates.trucks = '[]';
        needsUpdate = true;
      }

      // Ensure other fields exist
      if (!report.weather) {
        updates.weather = '';
        needsUpdate = true;
      }
      if (!report.subcontractor) {
        updates.subcontractor = '';
        needsUpdate = true;
      }
      if (!report.other_notes) {
        updates.other_notes = '';
        needsUpdate = true;
      }

      if (needsUpdate) {
        await base44.entities.DailyReport.update(report.id, updates);
        updated++;
      }
    }

    return Response.json({ success: true, updated, total: allReports.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});