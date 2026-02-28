import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, addWeeks, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Download, X, Edit2, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

function getStoredCompany() {
  try { return JSON.parse(sessionStorage.getItem("logipunch_company") || "null"); } catch { return null; }
}

const GROUPS = ["DDL Excavation", "DDL Logistique", "Groupe DDL"];

function getStoredUser() {
  try { return JSON.parse(sessionStorage.getItem("logipunch_user") || "null"); } catch { return null; }
}

function EditEntryModal({ entry, onClose, onSaved }) {
  const [punchIn, setPunchIn] = useState(entry.punch_in ? format(parseISO(entry.punch_in), "yyyy-MM-dd'T'HH:mm") : "");
  const [punchOut, setPunchOut] = useState(entry.punch_out ? format(parseISO(entry.punch_out), "yyyy-MM-dd'T'HH:mm") : "");
  const [lunch, setLunch] = useState(entry.lunch_break ?? 0);
  const [saving, setSaving] = useState(false);

  const calcTotal = () => {
    if (!punchIn || !punchOut) return null;
    const mins = (new Date(punchOut) - new Date(punchIn)) / 60000 - lunch;
    return Math.max(0, mins / 60).toFixed(2);
  };

  const handleSave = async () => {
    setSaving(true);
    const total = calcTotal();
    const currentUser = getStoredUser();
    await base44.entities.PunchEntry.update(entry.id, {
      punch_in: new Date(punchIn).toISOString(),
      punch_out: punchOut ? new Date(punchOut).toISOString() : undefined,
      lunch_break: lunch,
      total_hours: total ? parseFloat(total) : entry.total_hours,
      modified_by: currentUser?.full_name,
      modified_at: new Date().toISOString(),
    });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h3 className="text-white font-bold">Modifier l'entrée</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div><label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Projet</label><p className="text-white text-sm font-semibold">{entry.project_name}</p></div>
          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Punch In</label>
            <input type="datetime-local" value={punchIn} onChange={e => setPunchIn(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600" />
          </div>
          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Punch Out</label>
            <input type="datetime-local" value={punchOut} onChange={e => setPunchOut(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600" />
          </div>
          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Dîner (minutes)</label>
            <select value={lunch} onChange={e => setLunch(parseInt(e.target.value))} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600">
              {[0,15,30,45,60].map(v => <option key={v} value={v}>{v === 0 ? "Aucun" : `${v} min`}</option>)}
            </select>
          </div>
          {calcTotal() && (
            <div className="bg-zinc-800 rounded-xl p-3 text-center">
              <span className="text-zinc-500 text-xs">Total calculé : </span>
              <span className="text-green-400 font-bold">{calcTotal()}h</span>
            </div>
          )}
        </div>
        <div className="flex gap-3 p-5 border-t border-zinc-800">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-semibold hover:bg-zinc-700 transition-all">Annuler</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 h-10 rounded-xl bg-green-700 hover:bg-green-600 text-white text-sm font-bold transition-all">
            {saving ? "..." : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TimeSheet() {
  const [entries, setEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [weekDate, setWeekDate] = useState(new Date());
  const [activeGroup, setActiveGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("week"); // week | day
  const [selectedDay, setSelectedDay] = useState(format(new Date(), "yyyy-MM-dd"));
  const [editEntry, setEditEntry] = useState(null);
  const [company] = useState(getStoredCompany);
  const currentUser = getStoredUser();
  const isAdmin = currentUser?.is_admin === true || currentUser?.role === "Administrateur";

  const weekStart = startOfWeek(weekDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(weekDate, { weekStartsOn: 0 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    loadData();
  }, [weekDate]);

  const loadData = async () => {
    setLoading(true);
    const companyId = company?.id;
    const [allUsers, allEntries] = await Promise.all([
      companyId ? base44.entities.AppUser.filter({ is_active: true, company_id: companyId }) : base44.entities.AppUser.filter({ is_active: true }),
      base44.entities.PunchEntry.list("-punch_in", 500),
    ]);
    setUsers(allUsers);

    // Detect groups from users dynamically
    const groups = [...new Set(allUsers.map(u => u.group).filter(Boolean))];
    if (!activeGroup && groups.length > 0) setActiveGroup(groups[0]);

    setEntries(allEntries.filter(e =>
      (companyId ? e.company_id === companyId : true) &&
      (e.status === "approved" || e.status === "completed") &&
      e.work_date >= weekStartStr && e.work_date <= weekEndStr
    ));
    setLoading(false);
  };

  const allGroups = [...new Set(users.map(u => u.group).filter(Boolean))];

  const getUsersForGroup = () => {
    if (!activeGroup) return users;
    return users.filter(u => u.group === activeGroup);
  };

  const getEntriesForUser = (userId) => entries.filter(e => e.user_id === userId);

  const getDayEntry = (userId, dateStr) => {
    const dayEntries = entries.filter(e => e.user_id === userId && e.work_date === dateStr);
    if (dayEntries.length === 0) return null;
    return {
      entries: dayEntries,
      totalHours: dayEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0),
      firstIn: dayEntries.reduce((min, e) => e.punch_in < min ? e.punch_in : min, dayEntries[0].punch_in),
      lastOut: dayEntries.reduce((max, e) => (e.punch_out || "") > max ? (e.punch_out || "") : max, ""),
      lunch: Math.max(...dayEntries.map(e => e.lunch_break || 0)),
    };
  };

  const getWeekTotal = (userId) => {
    return getEntriesForUser(userId).reduce((sum, e) => sum + (e.total_hours || 0), 0);
  };

  const exportXLSX = () => {
    const groupUsers = getUsersForGroup();
    const wb = XLSX.utils.book_new();
    const wsData = [];

    // Title rows
    wsData.push([activeGroup.toUpperCase()]);
    wsData.push([`Semaine du ${format(weekStart, "d MMMM yyyy", { locale: fr })}`]);
    wsData.push([]); // blank

    const usersWithHours = groupUsers.filter(user => getEntriesForUser(user.id).length > 0);

    usersWithHours.forEach(user => {
      // User name header
      wsData.push([user.full_name]);
      // Column headers
      wsData.push(["Date", "Projet", "No Projet", "Équipement/Plaque", "Arrivée", "Départ", "Dîner (min)", "Total (h)"]);

      const userEntries = getEntriesForUser(user.id);
      // Group by date
      const byDate = {};
      userEntries.forEach(e => {
        if (!byDate[e.work_date]) byDate[e.work_date] = [];
        byDate[e.work_date].push(e);
      });

      const sortedDates = Object.keys(byDate).sort();
      let weekTotal = 0;

      sortedDates.forEach(date => {
        const dayEntries = byDate[date].sort((a, b) => a.punch_in.localeCompare(b.punch_in));
        let dayTotal = 0;
        dayEntries.forEach((e, idx) => {
          const arrivee = e.punch_in ? format(parseISO(e.punch_in), "HH 'h' mm") : "-";
          const depart = e.punch_out ? format(parseISO(e.punch_out), "HH 'h' mm") : "-";
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
        // Day total row
        wsData.push(["", "", "", "", "", "Total jour", "", parseFloat(dayTotal.toFixed(2))]);
      });

      // Week total row
      wsData.push(["", "", "", "", "", "Total semaine", "", parseFloat(weekTotal.toFixed(2))]);
      wsData.push([]); // blank between users
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws["!cols"] = [
      { wch: 14 }, { wch: 20 }, { wch: 12 }, { wch: 20 },
      { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Heures");
    XLSX.writeFile(wb, `heures_${activeGroup}_${weekStartStr}.xlsx`);
  };

  const printPaySlip = async (user) => {
    const doc = new jsPDF();
    const userEntries = getEntriesForUser(user.id);
    const weekTotal = getWeekTotal(user.id);
    const totalLunch = userEntries.reduce((s, e) => s + (e.lunch_break || 0), 0);
    const grossHours = userEntries.reduce((s, e) => {
      if (!e.punch_in || !e.punch_out) return s + (e.total_hours || 0);
      return s + (new Date(e.punch_out) - new Date(e.punch_in)) / 3600000;
    }, 0);
    const weekLabel = `DU ${format(weekStart, "d MMM", { locale: fr }).toUpperCase()} AU ${format(weekEnd, "d MMM yyyy", { locale: fr }).toUpperCase()}`;
    const pageW = 210;
    const margin = 14;
    const colW = pageW - margin * 2;

    // Helper: load image and get natural dimensions for ratio preservation
    const loadImgWithSize = (url) => new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve({ img, w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = url;
    });

    const toHM = (hrs) => {
      const totalMin = Math.round(hrs * 60);
      const h = Math.floor(Math.abs(totalMin) / 60);
      const m = Math.abs(totalMin) % 60;
      const sign = totalMin < 0 ? "-" : "";
      return `${sign}${h}h ${String(m).padStart(2, "0")}m`;
    };

    // ── White background ──────────────────────────────────────────
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageW, 297, "F");

    // ── HEADER ────────────────────────────────────────────────────
    let y = 14;
    const logoUrl = company?.logo_url;
    const logoMaxH = 18; // max logo height in mm
    const logoMaxW = 50; // max logo width in mm

    if (logoUrl) {
      const imgData = await loadImgWithSize(logoUrl);
      if (imgData) {
        // Preserve ratio
        let lw = logoMaxW;
        let lh = (imgData.h / imgData.w) * lw;
        if (lh > logoMaxH) { lh = logoMaxH; lw = (imgData.w / imgData.h) * lh; }
        try { doc.addImage(imgData.img, "PNG", margin, y, lw, lh); } catch(e) {}
        y += lh + 4;
      }
    }

    // Company name (large, two-color)
    const nameParts = (company?.name || "LOGIPUNCH").toUpperCase().split(" ");
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(nameParts[0], margin, y + 12);
    if (nameParts.length > 1) {
      const firstW = doc.getTextWidth(nameParts[0] + " ");
      doc.setTextColor(100, 200, 80);
      doc.text(nameParts.slice(1).join(" "), margin + firstW, y + 12);
    }

    // "RAPPORT DE PAIE" badge — right-aligned, same vertical level as company name
    doc.setFillColor(20, 20, 20);
    doc.roundedRect(pageW - margin - 52, y + 2, 52, 12, 1, 1, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("RAPPORT DE PAIE", pageW - margin - 49, y + 10);

    // Subtitle under company name
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(140, 140, 140);
    doc.text("FEUILLE DE TEMPS  ·  LOGISTIQUE", margin, y + 20);

    // "DOCUMENT GÉNÉRÉ..." under badge
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text("DOCUMENT GÉNÉRÉ ÉLECTRONIQUEMENT", pageW - margin - 51, y + 20);

    // Separator line
    y += 26;
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    // ── EMPLOYEE CARD ─────────────────────────────────────────────
    const cardH = 36;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, colW, cardH, "S");
    // Vertical divider at midpoint
    doc.line(margin + colW / 2, y, margin + colW / 2, y + cardH);

    // Left: employee info
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(140, 140, 140);
    doc.text("IDENTIFICATION DE L'EMPLOYÉ", margin + 4, y + 8);

    const nameFull = user.full_name.toUpperCase();
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    // Wrap name if needed
    const nameLines = doc.splitTextToSize(nameFull, colW / 2 - 8);
    doc.text(nameLines, margin + 4, y + 17);

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 200, 80);
    doc.text(`${(user.group || "").toUpperCase()}  ·  ${(user.role || "").toUpperCase()}`, margin + 4, y + cardH - 4);

    // Right: week total
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

    // ── TABLE HEADER ──────────────────────────────────────────────
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

    // ── TABLE ROWS ────────────────────────────────────────────────
    const byDate = {};
    userEntries.forEach(e => {
      if (!byDate[e.work_date]) byDate[e.work_date] = [];
      byDate[e.work_date].push(e);
    });
    const sortedDates = Object.keys(byDate).sort();

    sortedDates.forEach(date => {
      const dayEntries = byDate[date].sort((a, b) => a.punch_in.localeCompare(b.punch_in));
      const dayTotal = dayEntries.reduce((s, e) => s + (e.total_hours || 0), 0);

      dayEntries.forEach((e, idx) => {
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.line(margin, y + 7, pageW - margin, y + 7);

        doc.setFontSize(8.5);
        doc.setFont("helvetica", idx === 0 ? "bold" : "normal");
        doc.setTextColor(30, 30, 30);
        if (idx === 0) doc.text(format(parseISO(date), "dd/MM/yyyy"), cDate, y + 5);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        doc.text(e.punch_in ? format(parseISO(e.punch_in), "HH:mm") : "-", cIn, y + 5);
        doc.text(e.punch_out ? format(parseISO(e.punch_out), "HH:mm") : "-", cOut, y + 5);

        if (e.lunch_break > 0) {
          doc.setTextColor(220, 130, 30);
          doc.text(`${e.lunch_break}m`, cDiner, y + 5);
        } else {
          doc.setTextColor(180, 180, 180);
          doc.text("—", cDiner, y + 5);
        }

        doc.setTextColor(120, 120, 120);
        doc.text((e.project_name || "-").substring(0, 24), cProjet, y + 5);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 30, 30);
        doc.text(toHM(e.total_hours || 0), cTotal, y + 5, { align: "right" });
        y += 8;
      });

      // Day subtotal (only if multiple entries)
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

    // ── SUMMARY BOX ───────────────────────────────────────────────
    const boxH = 26;
    doc.setFillColor(20, 25, 40);
    doc.roundedRect(margin, y, colW, boxH, 2, 2, "F");

    // 4 columns: label | total brut | total diner | net à payer
    const col1x = margin + 6;
    const col2x = margin + 60;
    const col3x = margin + 110;
    const col4x = pageW - margin - 4;

    // Label
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 200, 80);
    doc.text("RÉSUMÉ", col1x, y + 10);
    doc.text("HEBDOMADAIRE", col1x, y + 18);

    // Total brut
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 160, 160);
    doc.text("TOTAL BRUT", col2x, y + 9);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(toHM(grossHours), col2x, y + 20);

    // Total dîner
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 160, 160);
    doc.text("TOTAL DÎNER", col3x, y + 9);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 130, 30);
    doc.text(`-${toHM(totalLunch / 60)}`, col3x, y + 20);

    // Net à payer
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 200, 80);
    doc.text("NET À PAYER", col4x, y + 9, { align: "right" });
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 200, 80);
    doc.text(toHM(weekTotal), col4x, y + 21, { align: "right" });

    y += boxH + 6;

    // ── SIGNATURES ────────────────────────────────────────────────
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

    // ── LOGIPUNCH FOOTER ──────────────────────────────────────────
    doc.setFontSize(7);
    doc.setTextColor(200, 200, 200);
    doc.text(`Généré par LOGIPUNCH · ${format(new Date(), "d MMMM yyyy 'à' HH:mm", { locale: fr })}`, pageW / 2, 290, { align: "center" });

    const nameParts2 = user.full_name.trim().split(/\s+/);
    const firstName = nameParts2[0];
    const lastInitial = nameParts2.length > 1 ? nameParts2[nameParts2.length - 1][0].toUpperCase() : "";
    const startDay = format(weekStart, "d");
    const endDay = format(weekEnd, "d");
    const monthFr = format(weekEnd, "MMM", { locale: fr });
    const monthCap = monthFr.charAt(0).toUpperCase() + monthFr.slice(1);
    const fileName = `${startDay}-${endDay}${monthCap}${firstName}${lastInitial}.pdf`;
    doc.save(fileName);
  };

  const groupUsers = getUsersForGroup().sort((a, b) => getWeekTotal(b.id) - getWeekTotal(a.id));

  return (
    <div className="min-h-screen p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold">Compilation des heures</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Heures approuvées uniquement</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportXLSX} className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-all">
            <Download size={15} />
            Exporter XLSX
          </button>
        </div>
      </div>

      {/* Group Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {allGroups.map(g => (
          <button
            key={g}
            onClick={() => setActiveGroup(g)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              activeGroup === g ? "bg-green-700 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Week Navigation */}
      <div className="flex items-center gap-3 mb-5 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
        <button onClick={() => setWeekDate(subWeeks(weekDate, 1))} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 transition-all">
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-white text-sm font-semibold">
            {format(weekStart, "d MMM", { locale: fr })} – {format(weekEnd, "d MMM yyyy", { locale: fr })}
          </p>
        </div>
        <button onClick={() => setWeekDate(addWeeks(weekDate, 1))} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 transition-all">
          <ChevronRight size={16} />
        </button>
      </div>

      {loading && <p className="text-zinc-500 text-center py-10">Chargement...</p>}

      {/* Table */}
      {!loading && (
        <div className="overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left p-3 text-zinc-400 font-semibold bg-zinc-900/80 sticky left-0 min-w-[160px]">Employé</th>
                <th className="text-left p-3 text-zinc-400 font-semibold bg-zinc-900/80 whitespace-nowrap">Rôle</th>
                {days.map(d => (
                  <th key={d.toISOString()} className="p-3 text-zinc-400 font-semibold bg-zinc-900/80 min-w-[120px]">
                    <div className="text-center">
                      <p className="capitalize text-xs">{format(d, "EEE", { locale: fr })}</p>
                      <p className="text-white">{format(d, "d/MM")}</p>
                    </div>
                  </th>
                ))}
                <th className="p-3 text-green-400 font-bold bg-zinc-900/80 min-w-[80px] text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {groupUsers.length === 0 && (
                <tr>
                  <td colSpan={days.length + 3} className="text-center p-8 text-zinc-600">
                    Aucun utilisateur dans ce groupe
                  </td>
                </tr>
              )}
              {groupUsers.map((user, idx) => (
                <tr key={user.id} className={`border-b border-zinc-800/50 hover:bg-zinc-900/40 transition-colors ${idx % 2 === 0 ? "" : "bg-zinc-950/30"}`}>
                  <td className="p-3 sticky left-0 bg-[#0a0a0a]">
                    <p className="text-white font-semibold text-sm">{user.full_name}</p>
                    <p className="text-zinc-600 text-xs">{user.group}</p>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-xs rounded-full whitespace-nowrap">{user.role}</span>
                  </td>
                  {days.map(d => {
                    const dateStr = format(d, "yyyy-MM-dd");
                    const day = getDayEntry(user.id, dateStr);
                    return (
                      <td key={dateStr} className="p-3">
                        {day ? (
                          <div className="text-center">
                            <p className="text-green-400 font-bold text-sm">{day.totalHours.toFixed(1)}h</p>
                            <p className="text-zinc-500 text-xs">
                              {day.firstIn ? format(parseISO(day.firstIn), "HH:mm") : "-"}
                              {" → "}
                              {day.lastOut ? format(parseISO(day.lastOut), "HH:mm") : "—"}
                            </p>
                            {day.lunch > 0 && <p className="text-zinc-600 text-xs">🍽 {day.lunch}m</p>}
                            {day.entries.length > 1 && (
                              <p className="text-zinc-600 text-xs">{day.entries.length} projets</p>
                            )}
                            {isAdmin && day.entries.map(e => (
                              <button key={e.id} onClick={() => setEditEntry(e)} className="mt-1 p-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all block mx-auto">
                                <Edit2 size={11} className="text-zinc-500" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-zinc-800 text-center">—</p>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-3 text-center">
                    <p className="text-green-400 font-bold">{getWeekTotal(user.id).toFixed(1)}h</p>
                    <button
                      onClick={() => printPaySlip(user)}
                      title="Imprimer slip de paye"
                      className="mt-1 p-1.5 bg-zinc-800 hover:bg-blue-700 rounded-lg transition-all block mx-auto"
                    >
                      <Printer size={12} className="text-zinc-400 hover:text-white" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-700">
                <td colSpan={2} className="p-3 text-zinc-400 font-bold text-sm bg-zinc-900/80 sticky left-0">TOTAL ÉQUIPE</td>
                {days.map(d => {
                  const dateStr = format(d, "yyyy-MM-dd");
                  const total = groupUsers.reduce((sum, user) => {
                    const day = getDayEntry(user.id, dateStr);
                    return sum + (day?.totalHours || 0);
                  }, 0);
                  return (
                    <td key={dateStr} className="p-3 text-center bg-zinc-900/80">
                      <p className="text-white font-bold text-sm">{total.toFixed(1)}h</p>
                    </td>
                  );
                })}
                <td className="p-3 text-center bg-zinc-900/80">
                  <p className="text-green-400 font-bold">
                    {groupUsers.reduce((sum, u) => sum + getWeekTotal(u.id), 0).toFixed(1)}h
                  </p>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {editEntry && <EditEntryModal entry={editEntry} onClose={() => setEditEntry(null)} onSaved={() => { setEditEntry(null); loadData(); }} />}
    </div>
  );
}