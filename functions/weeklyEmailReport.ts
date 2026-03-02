import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as XLSX from 'npm:xlsx@0.18.5';
import { jsPDF } from 'npm:jspdf@4.0.0';

// Group → recipient email mapping
const GROUP_EMAILS = {
  "DDL Excavation": "shawn@groupeddl.ca",
  "DDL Logistique": "manon@groupeddl.ca",
};

// Always CC'd on all groups
const CC_ALL_EMAIL = "julie@groupeddl.ca";

function getPreviousWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() - 1);
  weekEnd.setHours(23, 59, 59, 999);

  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekEnd.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const toDateStr = (d) => d.toISOString().split("T")[0];
  return { weekStart, weekEnd, weekStartStr: toDateStr(weekStart), weekEndStr: toDateStr(weekEnd) };
}

function formatDate(isoStr) {
  if (!isoStr) return "-";
  const d = new Date(isoStr);
  return d.toLocaleDateString("fr-CA", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function formatTime(isoStr) {
  if (!isoStr) return "-";
  const d = new Date(isoStr);
  return d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function toHM(hrs) {
  const totalMin = Math.round(hrs * 60);
  const h = Math.floor(Math.abs(totalMin) / 60);
  const m = Math.abs(totalMin) % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function frDate(dateStr) {
  const months = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  const d = new Date(dateStr + "T12:00:00");
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function generateXLSX(groupName, users, entries, weekStart, weekEnd) {
  const wb = XLSX.utils.book_new();
  const wsData = [];

  wsData.push([groupName.toUpperCase()]);
  wsData.push([`Semaine du ${frDate(weekStart.toISOString().split("T")[0])} au ${frDate(weekEnd.toISOString().split("T")[0])}`]);
  wsData.push([]);

  const usersWithHours = users.filter(u => entries.some(e => e.user_id === u.id));

  usersWithHours.forEach(user => {
    wsData.push([user.full_name]);
    wsData.push(["Date", "Projet", "No Projet", "Équipement/Plaque", "Arrivée", "Départ", "Dîner (min)", "Total (h)"]);

    const userEntries = entries.filter(e => e.user_id === user.id);
    const byDate = {};
    userEntries.forEach(e => {
      if (!byDate[e.work_date]) byDate[e.work_date] = [];
      byDate[e.work_date].push(e);
    });

    const sortedDates = Object.keys(byDate).sort();
    let weekTotal = 0;

    sortedDates.forEach(date => {
      const dayEntries = byDate[date].sort((a, b) => (a.punch_in || "").localeCompare(b.punch_in || ""));
      let dayTotal = 0;
      dayEntries.forEach((e, idx) => {
        const arrivee = e.punch_in ? formatTime(e.punch_in) : "-";
        const depart = e.punch_out ? formatTime(e.punch_out) : "-";
        const equip = e.machine || e.plate_number || "-";
        const hours = e.total_hours || 0;
        dayTotal += hours;
        wsData.push([
          idx === 0 ? date : "",
          e.project_name || "-",
          e.project_id || "-",
          equip,
          arrivee,
          depart,
          e.lunch_break || 0,
          parseFloat(hours.toFixed(2))
        ]);
      });
      weekTotal += dayTotal;
      wsData.push(["", "", "", "", "", "Total jour", "", parseFloat(dayTotal.toFixed(2))]);
    });

    wsData.push(["", "", "", "", "", "Total semaine", "", parseFloat(weekTotal.toFixed(2))]);
    wsData.push([]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [
    { wch: 14 }, { wch: 20 }, { wch: 12 }, { wch: 20 },
    { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Heures");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return buf;
}

async function generatePDF(user, entries, weekStart, weekEnd, companyName, companyLogoUrl) {
  const weekTotal = entries.reduce((s, e) => s + (e.total_hours || 0), 0);
  const totalLunch = entries.reduce((s, e) => s + (e.lunch_break || 0), 0);
  const grossHours = entries.reduce((s, e) => {
    if (!e.punch_in || !e.punch_out) return s + (e.total_hours || 0);
    return s + (new Date(e.punch_out) - new Date(e.punch_in)) / 3600000;
  }, 0);

  const weekLabel = `DU ${frDate(weekStart.toISOString().split("T")[0]).toUpperCase()} AU ${frDate(weekEnd.toISOString().split("T")[0]).toUpperCase()}`;

  const doc = new jsPDF();
  const pageW = 210;
  const margin = 14;
  const colW = pageW - margin * 2;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, 297, "F");

  let y = 14;

  // Company name
  const nameParts = (companyName || "TapIN").toUpperCase().split(" ");
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(nameParts[0], margin, y + 12);
  if (nameParts.length > 1) {
    const firstW = doc.getTextWidth(nameParts[0] + " ");
    doc.setTextColor(100, 200, 80);
    doc.text(nameParts.slice(1).join(" "), margin + firstW, y + 12);
  }

  doc.setFillColor(20, 20, 20);
  doc.roundedRect(pageW - margin - 52, y + 2, 52, 12, 1, 1, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("RAPPORT DE PAIE", pageW - margin - 49, y + 10);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(140, 140, 140);
  doc.text("FEUILLE DE TEMPS  ·  LOGISTIQUE", margin, y + 20);
  doc.setFontSize(7);
  doc.text("DOCUMENT GÉNÉRÉ ÉLECTRONIQUEMENT", pageW - margin - 51, y + 20);

  y += 26;
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // Employee card
  const cardH = 36;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, colW, cardH, "S");
  doc.line(margin + colW / 2, y, margin + colW / 2, y + cardH);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(140, 140, 140);
  doc.text("IDENTIFICATION DE L'EMPLOYÉ", margin + 4, y + 8);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  const nameLines = doc.splitTextToSize(user.full_name.toUpperCase(), colW / 2 - 8);
  doc.text(nameLines, margin + 4, y + 17);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 200, 80);
  doc.text(`${(user.group || "").toUpperCase()}  ·  ${(user.role || "").toUpperCase()}`, margin + 4, y + cardH - 4);

  const midX = margin + colW / 2 + 4;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(140, 140, 140);
  doc.text("TOTAL SEMAINE", midX, y + 10);

  const weekHours = Math.floor(weekTotal);
  const weekMins = Math.round((weekTotal - weekHours) * 60);
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.text(`${weekHours}h`, midX, y + 26);
  const hW = doc.getTextWidth(`${weekHours}h`);
  doc.setFontSize(20);
  doc.text(`${String(weekMins).padStart(2, "0")}m`, midX + hW + 1, y + 26);
  const mW = doc.getTextWidth(`${String(weekMins).padStart(2, "0")}m`);
  doc.setFontSize(9);
  doc.setTextColor(100, 200, 80);
  doc.text("NET", midX + hW + mW + 3, y + 22);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(140, 140, 140);
  doc.text(`PÉRIODE : ${weekLabel}`, midX, y + cardH - 4);

  y += cardH + 8;

  // Table header
  doc.setFillColor(240, 242, 245);
  doc.rect(margin, y, colW, 9, "F");

  const cDate = margin + 2;
  const cIn = margin + 46;
  const cOut = margin + 66;
  const cDiner = margin + 88;
  const cProjet = margin + 108;
  const cTotal = pageW - margin - 2;

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  doc.text("DATE / JOURNÉE", cDate, y + 6);
  doc.text("IN", cIn, y + 6);
  doc.text("OUT", cOut, y + 6);
  doc.text("DÎNER", cDiner, y + 6);
  doc.text("PROJET", cProjet, y + 6);
  doc.text("TOTAL NET", cTotal, y + 6, { align: "right" });
  y += 12;

  // Table rows
  const byDate = {};
  entries.forEach(e => {
    if (!byDate[e.work_date]) byDate[e.work_date] = [];
    byDate[e.work_date].push(e);
  });
  const sortedDates = Object.keys(byDate).sort();

  sortedDates.forEach(date => {
    const dayEntries = byDate[date].sort((a, b) => (a.punch_in || "").localeCompare(b.punch_in || ""));
    const dayTotal = dayEntries.reduce((s, e) => s + (e.total_hours || 0), 0);

    dayEntries.forEach((e, idx) => {
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
      doc.setFont("helvetica", idx === 0 ? "bold" : "normal");
      doc.setTextColor(30, 30, 30);
      if (idx === 0) doc.text(formatDate(date + "T12:00:00"), cDate, y + 5);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(e.punch_in ? formatTime(e.punch_in) : "-", cIn, y + 5);
      doc.text(e.punch_out ? formatTime(e.punch_out) : "-", cOut, y + 5);

      if (e.lunch_break > 0) {
        doc.setTextColor(220, 130, 30);
        doc.text(`${e.lunch_break}m`, cDiner, y + 5);
      } else {
        doc.setTextColor(180, 180, 180);
        doc.text("--", cDiner, y + 5);
      }

      doc.setTextColor(120, 120, 120);
      doc.text((e.project_name || "-").substring(0, 24), cProjet, y + 5);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text(toHM(e.total_hours || 0), cTotal, y + 5, { align: "right" });
      y += 8;
    });

    if (dayEntries.length > 1) {
      doc.setFillColor(245, 248, 245);
      doc.rect(margin, y, colW, 7, "F");
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 160, 80);
      doc.text("SOUS-TOTAL JOUR", cDate, y + 5);
      doc.setTextColor(30, 30, 30);
      doc.text(toHM(dayTotal), cTotal, y + 5, { align: "right" });
      y += 9;
    }
  });

  y += 4;

  // Summary box
  const boxH = 26;
  if (y + boxH > 260) { doc.addPage(); doc.setFillColor(255,255,255); doc.rect(0,0,pageW,297,"F"); y = 14; }
  doc.setFillColor(20, 25, 40);
  doc.roundedRect(margin, y, colW, boxH, 2, 2, "F");

  const col1x = margin + 6;
  const col2x = margin + 60;
  const col3x = margin + 110;
  const col4x = pageW - margin - 4;

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 200, 80);
  doc.text("RÉSUMÉ", col1x, y + 10);
  doc.text("HEBDOMADAIRE", col1x, y + 18);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 160, 160);
  doc.text("TOTAL BRUT", col2x, y + 9);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(toHM(grossHours), col2x, y + 20);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 160, 160);
  doc.text("TOTAL DÎNER", col3x, y + 9);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(220, 130, 30);
  doc.text(`-${toHM(totalLunch / 60)}`, col3x, y + 20);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 200, 80);
  doc.text("NET À PAYER", col4x, y + 9, { align: "right" });
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 200, 80);
  doc.text(toHM(weekTotal), col4x, y + 21, { align: "right" });

  y += boxH + 6;

  // Signatures
  y = Math.max(y, 240);
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + 65, y);
  doc.line(pageW - margin - 65, y, pageW - margin, y);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(140, 140, 140);
  doc.text("SIGNATURE EMPLOYÉ", margin, y + 6);
  doc.text("VALIDATION DIRECTION", pageW - margin, y + 6, { align: "right" });

  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  const now = new Date();
  doc.text(`Généré par TapIN · ${now.toLocaleDateString("fr-CA")} à ${now.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}`, pageW / 2, 290, { align: "center" });

  return doc.output("arraybuffer");
}

function buildEmailHtml(groupName, users, entries, weekStart, weekEnd, pdfLinks, xlsxLink) {
  const weekLabel = `${frDate(weekStart.toISOString().split("T")[0])} au ${frDate(weekEnd.toISOString().split("T")[0])}`;
  const usersWithHours = users.filter(u => entries.some(e => e.user_id === u.id));

  const userRows = usersWithHours.map(u => {
    const total = entries.filter(e => e.user_id === u.id).reduce((s, e) => s + (e.total_hours || 0), 0);
    const link = pdfLinks[u.id];
    return `
      <tr style="border-bottom:1px solid #333;">
        <td style="padding:10px 12px;color:#fff;font-weight:600;">${u.full_name}</td>
        <td style="padding:10px 12px;color:#aaa;">${u.role || ""}</td>
        <td style="padding:10px 12px;color:#4ade80;font-weight:700;">${total.toFixed(1)}h</td>
        <td style="padding:10px 12px;">
          ${link ? `<a href="${link}" style="color:#4ade80;text-decoration:none;border:1px solid #4ade80;padding:4px 10px;border-radius:6px;font-size:12px;">📄 Télécharger PDF</a>` : '<span style="color:#666;">Aucun PDF</span>'}
        </td>
      </tr>`;
  }).join("");

  const groupTotal = entries.reduce((s, e) => s + (e.total_hours || 0), 0);

  return `
<!DOCTYPE html>
<html>
<body style="background:#0a0a0a;font-family:Arial,sans-serif;color:#fff;margin:0;padding:20px;">
  <div style="max-width:680px;margin:0 auto;background:#111;border-radius:16px;overflow:hidden;border:1px solid #222;">
    <div style="background:#111;padding:28px 32px;border-bottom:1px solid #222;">
      <h1 style="margin:0;font-size:22px;color:#fff;">TapIN <span style="color:#4ade80;">·</span> Rapport Hebdomadaire</h1>
      <p style="margin:6px 0 0;color:#666;font-size:14px;">Semaine du ${weekLabel}</p>
    </div>
    <div style="padding:24px 32px;">
      <div style="background:#1a1a1a;border-radius:12px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;gap:16px;">
        <div>
          <p style="margin:0;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:1px;">Groupe</p>
          <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#fff;">${groupName}</p>
        </div>
        <div style="margin-left:auto;">
          <p style="margin:0;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:1px;">Total équipe</p>
          <p style="margin:4px 0 0;font-size:24px;font-weight:900;color:#4ade80;">${groupTotal.toFixed(1)}h</p>
        </div>
      </div>
      
      <h3 style="color:#aaa;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Employés — PDF individuels</h3>
      <table style="width:100%;border-collapse:collapse;background:#1a1a1a;border-radius:12px;overflow:hidden;">
        <thead>
          <tr style="background:#222;">
            <th style="padding:10px 12px;text-align:left;color:#666;font-size:12px;font-weight:600;">Nom</th>
            <th style="padding:10px 12px;text-align:left;color:#666;font-size:12px;font-weight:600;">Rôle</th>
            <th style="padding:10px 12px;text-align:left;color:#666;font-size:12px;font-weight:600;">Total</th>
            <th style="padding:10px 12px;text-align:left;color:#666;font-size:12px;font-weight:600;">Rapport</th>
          </tr>
        </thead>
        <tbody>${userRows}</tbody>
      </table>

      ${xlsxLink ? `
      <div style="margin-top:20px;background:#1a1a1a;border-radius:12px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <p style="margin:0;font-weight:700;color:#fff;">📊 Tableau Excel complet</p>
          <p style="margin:4px 0 0;color:#666;font-size:13px;">Toutes les heures du groupe en format XLSX</p>
        </div>
        <a href="${xlsxLink}" style="color:#4ade80;text-decoration:none;border:1px solid #4ade80;padding:8px 16px;border-radius:8px;font-weight:700;white-space:nowrap;">⬇ Télécharger XLSX</a>
      </div>` : ""}
    </div>
    <div style="padding:16px 32px;border-top:1px solid #222;text-align:center;">
      <p style="margin:0;color:#444;font-size:12px;">Rapport généré automatiquement par TapIN · Les liens expirent dans 7 jours</p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both scheduled (service role) and manual admin calls
    let isAuthorized = false;
    try {
      const user = await base44.auth.me();
      if (user?.role === "admin" || user?.is_admin === true) isAuthorized = true;
    } catch {
      // Called by scheduler without user auth — use service role
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { weekStart, weekEnd, weekStartStr, weekEndStr } = getPreviousWeekRange();

    // Fetch all data
    const allEntries = await base44.asServiceRole.entities.PunchEntry.list("-punch_in", 1000);
    const allUsers = await base44.asServiceRole.entities.AppUser.filter({ is_active: true });
    const companies = await base44.asServiceRole.entities.Company.list();
    const company = companies?.[0] || null;

    // Filter entries for the week
    const weekEntries = allEntries.filter(e =>
      (e.status === "approved" || e.status === "completed") &&
      e.work_date >= weekStartStr && e.work_date <= weekEndStr
    );

    const results = [];

    for (const [groupName, recipientEmail] of Object.entries(GROUP_EMAILS)) {
      const groupUsers = allUsers.filter(u => u.group === groupName);
      if (groupUsers.length === 0) continue;

      const groupEntries = weekEntries.filter(e => groupUsers.some(u => u.id === e.user_id));
      if (groupEntries.length === 0) {
        results.push({ group: groupName, status: "skipped", reason: "no entries" });
        continue;
      }

      // Generate PDFs for each user
      const pdfLinks = {};
      for (const user of groupUsers) {
        const userEntries = groupEntries.filter(e => e.user_id === user.id);
        if (userEntries.length === 0) continue;

        const pdfBuf = await generatePDF(user, userEntries, weekStart, weekEnd, company?.name, company?.logo_url);
        const nameParts = user.full_name.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1][0].toUpperCase() : "";
        const fileName = `rapport_${weekStartStr}_${firstName}${lastInitial}.pdf`;

        const pdfFile = new File([new Uint8Array(pdfBuf)], fileName, { type: "application/pdf" });
        const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfFile });
        pdfLinks[user.id] = file_url;
      }

      // Generate XLSX
      const xlsxBuf = generateXLSX(groupName, groupUsers, groupEntries, weekStart, weekEnd);
      const xlsxFileName = `${groupName.replace(/\s+/g, "_")}_${weekStartStr}.xlsx`;
      const xlsxFile = new File([new Uint8Array(xlsxBuf)], xlsxFileName, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const { file_url: xlsxUrl } = await base44.asServiceRole.integrations.Core.UploadFile({ file: xlsxFile });

      // Send email to group recipient
      const emailHtml = buildEmailHtml(groupName, groupUsers, groupEntries, weekStart, weekEnd, pdfLinks, xlsxUrl);
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: recipientEmail,
        subject: `TapIN · Rapport ${groupName} — Semaine du ${weekStartStr}`,
        body: emailHtml,
      });

      // Also send to Shawn (receives all groups)
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: CC_ALL_EMAIL,
        subject: `TapIN · Rapport ${groupName} — Semaine du ${weekStartStr}`,
        body: emailHtml,
      });

      results.push({ group: groupName, email: recipientEmail, status: "sent", users: groupUsers.length, entries: groupEntries.length });
    }

    return Response.json({ success: true, weekStart: weekStartStr, weekEnd: weekEndStr, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});