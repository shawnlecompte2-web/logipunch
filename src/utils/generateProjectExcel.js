import * as XLSX from "xlsx";

const MONTHS_FR = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
const LABOR_ROLE_ORDER = ["Contremaître", "Journalier", "Opérateur", "Arpenteur", "Chargée"];

function formatDateHeader(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return `${String(d.getDate()).padStart(2, "0")}-${MONTHS_FR[d.getMonth()]}`;
}

function round2(n) {
  if (!n || n === 0) return 0;
  return Math.round(n * 100) / 100;
}

function sum(vals) {
  return vals.reduce((s, v) => s + (parseFloat(v) || 0), 0);
}

export function generateProjectExcel({ project, company, dates, reports, punchEntries }) {
  const numDates = dates.length;
  const totalCols = numDates + 2;
  const rows = [];
  const merges = [];

  function emptyRow() {
    return Array(totalCols).fill(null);
  }

  function addMergedRow(text) {
    const idx = rows.length;
    rows.push([text, ...Array(totalCols - 1).fill(null)]);
    merges.push({ s: { r: idx, c: 0 }, e: { r: idx, c: totalCols - 1 } });
  }

  function addSectionHeader(title) {
    rows.push([title, ...dates.map(formatDateHeader), "Cumulé"]);
  }

  function addDataRow(label, dailyValues, cumule) {
    rows.push([label, ...dailyValues, cumule]);
  }

  // --- HEADER ---
  addMergedRow(company?.name || "");
  addMergedRow(company?.address || "");
  rows.push(emptyRow());
  addMergedRow(`Projet: ${project?.name || ""}${project?.project_number ? ` (${project.project_number})` : ""}`);
  if (project?.address) addMergedRow(`Adresse: ${project.address}`);
  rows.push(emptyRow());

  // --- MAIN D'ŒUVRE ---
  addSectionHeader("MAIN D'ŒUVRE");

  const laborByUser = {};
  punchEntries.forEach((e) => {
    if (!laborByUser[e.user_id]) {
      laborByUser[e.user_id] = { name: e.user_name, role: e.role || "Employé", dailyHours: {} };
    }
    const dateKey = e.work_date || (e.punch_in ? e.punch_in.substring(0, 10) : null);
    if (dateKey) {
      laborByUser[e.user_id].dailyHours[dateKey] = (laborByUser[e.user_id].dailyHours[dateKey] || 0) + (e.total_hours || 0);
    }
  });

  Object.values(laborByUser)
    .sort((a, b) => {
      const aIdx = LABOR_ROLE_ORDER.findIndex((r) => a.role?.toLowerCase().includes(r.toLowerCase()));
      const bIdx = LABOR_ROLE_ORDER.findIndex((r) => b.role?.toLowerCase().includes(r.toLowerCase()));
      return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx) || (a.name || "").localeCompare(b.name || "");
    })
    .forEach((user) => {
      const daily = dates.map((d) => {
        const v = user.dailyHours[d];
        return v ? round2(v) : null;
      });
      const cumule = round2(sum(dates.map((d) => user.dailyHours[d] || 0)));
      addDataRow(`${user.role || "Employé"} (h)`, daily, cumule);
    });

  rows.push(emptyRow());

  // --- ÉQUIPEMENTS ---
  addSectionHeader("ÉQUIPEMENTS - NON OPÉRÉ");

  const equipByName = {};
  reports.forEach((r) => {
    let hours = {};
    try { hours = JSON.parse(r.machine_hours || "{}"); } catch { hours = {}; }
    Object.entries(hours).forEach(([name, h]) => {
      if (!equipByName[name]) equipByName[name] = {};
      const numVal = parseFloat(h);
      if (!equipByName[name][r.report_date]) {
        equipByName[name][r.report_date] = { num: 0, text: null };
      }
      if (!isNaN(numVal) && h !== "") {
        equipByName[name][r.report_date].num += numVal;
      } else if (typeof h === "string" && isNaN(numVal) && h.trim()) {
        equipByName[name][r.report_date].text = h;
      }
    });
  });

  Object.entries(equipByName)
    .sort()
    .forEach(([name, daily]) => {
      const dailyVals = dates.map((d) => {
        const entry = daily[d];
        if (!entry) return null;
        if (entry.text) return entry.text;
        if (entry.num > 0) return round2(entry.num);
        return null;
      });
      const cumule = round2(sum(dates.map((d) => daily[d]?.num || 0)));
      addDataRow(name, dailyVals, cumule);
    });

  rows.push(emptyRow());

  // --- TRANSPORT ---
  addSectionHeader("TRANSPORT");

  const truckByType = {};
  reports.forEach((r) => {
    let trucks = [];
    try { trucks = JSON.parse(r.trucks || "[]"); } catch { trucks = []; }
    trucks.forEach((t) => {
      if (!t.type) return;
      if (!truckByType[t.type]) truckByType[t.type] = {};
      truckByType[t.type][r.report_date] = (truckByType[t.type][r.report_date] || 0) + (t.trips || 0);
    });
  });

  Object.entries(truckByType)
    .sort()
    .forEach(([type, daily]) => {
      const dailyVals = dates.map((d) => {
        const v = daily[d];
        return v ? round2(v) : null;
      });
      const cumule = round2(sum(dates.map((d) => daily[d] || 0)));
      addDataRow(type, dailyVals, cumule);
    });

  rows.push(emptyRow());

  // --- MATÉRIAUX & DISPOSITION ---
  addSectionHeader("MATÉRIAUX & DISPOSITION");

  const materialByName = {};
  reports.forEach((r) => {
    let trucks = [];
    try { trucks = JSON.parse(r.trucks || "[]"); } catch { trucks = []; }
    trucks.forEach((t) => {
      if (!t.material) return;
      if (!materialByName[t.material]) materialByName[t.material] = {};
      materialByName[t.material][r.report_date] = (materialByName[t.material][r.report_date] || 0) + (t.trips || 0);
    });
  });

  Object.entries(materialByName)
    .sort()
    .forEach(([name, daily]) => {
      const dailyVals = dates.map((d) => {
        const v = daily[d];
        return v ? round2(v) : null;
      });
      const cumule = round2(sum(dates.map((d) => daily[d] || 0)));
      addDataRow(name, dailyVals, cumule);
    });

  rows.push(emptyRow());
  rows.push(emptyRow());

  // --- DESCRIPTION TRAVAUX ---
  addMergedRow("DESCRIPTION TRAVAUX");
  dates.forEach((d) => {
    const dayReports = reports.filter((r) => r.report_date === d);
    const descriptions = dayReports.map((r) => r.work_description).filter(Boolean);
    const notes = dayReports.map((r) => r.other_notes).filter(Boolean);
    const parts = [];
    if (descriptions.length) parts.push(descriptions.join(" | "));
    if (notes.length) parts.push(`Notes: ${notes.join(" | ")}`);
    if (parts.length) {
      const rowIdx = rows.length;
      rows.push([formatDateHeader(d), parts.join(" — "), ...Array(totalCols - 2).fill(null)]);
      merges.push({ s: { r: rowIdx, c: 1 }, e: { r: rowIdx, c: totalCols - 1 } });
    }
  });

  // --- SOUS-TRAITANTS ---
  const subReports = reports.filter((r) => r.subcontractor);
  if (subReports.length) {
    rows.push(emptyRow());
    addMergedRow("SOUS-TRAITANTS");
    dates.forEach((d) => {
      const daySubs = reports.filter((r) => r.report_date === d && r.subcontractor);
      if (daySubs.length) {
        const text = daySubs.map((r) => r.subcontractor).join("; ");
        const rowIdx = rows.length;
        rows.push([formatDateHeader(d), text, ...Array(totalCols - 2).fill(null)]);
        merges.push({ s: { r: rowIdx, c: 1 }, e: { r: rowIdx, c: totalCols - 1 } });
      }
    });
  }

  // Build worksheet
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = merges;
  ws["!cols"] = [{ wch: 36 }, ...Array(numDates).fill({ wch: 11 }), { wch: 10 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rapport");

  const fileName = `Rapport_${(project?.name || "projet").replace(/\s+/g, "_")}_${dates[0]}_a_${dates[dates.length - 1]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}