import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, addWeeks, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Download, X, Edit2, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

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
  const [activeGroup, setActiveGroup] = useState("DDL Excavation");
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("week"); // week | day
  const [selectedDay, setSelectedDay] = useState(format(new Date(), "yyyy-MM-dd"));
  const [editEntry, setEditEntry] = useState(null);
  const currentUser = getStoredUser();
  const isAdmin = currentUser?.role === "Administrateur";

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
    const allUsers = await base44.entities.AppUser.filter({ is_active: true });
    setUsers(allUsers);
    const allEntries = await base44.entities.PunchEntry.list("-punch_in", 500);
    setEntries(allEntries.filter(e => 
      (e.status === "approved" || e.status === "completed") &&
      e.work_date >= weekStartStr && e.work_date <= weekEndStr
    ));
    setLoading(false);
  };

  const getUsersForGroup = () => {
    if (activeGroup === "Groupe DDL") return users.filter(u => u.group === "Groupe DDL");
    return users.filter(u => u.group === activeGroup || u.group === "Groupe DDL");
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

  const printPaySlip = (user) => {
    const doc = new jsPDF();
    const userEntries = getEntriesForUser(user.id);
    const weekTotal = getWeekTotal(user.id);
    const weekLabel = `${format(weekStart, "d MMMM yyyy", { locale: fr })} – ${format(weekEnd, "d MMMM yyyy", { locale: fr })}`;

    // Header
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("LOGIPUNCH", 14, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Feuille de temps — Slip de paye", 14, 28);
    doc.text(weekLabel, 14, 36);

    // Employee info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(user.full_name, 14, 55);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`${user.role} · ${user.group}`, 14, 63);

    // Table header
    let y = 78;
    doc.setFillColor(34, 197, 94);
    doc.rect(14, y - 6, 182, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Date", 16, y);
    doc.text("Projet", 50, y);
    doc.text("Arrivée", 120, y);
    doc.text("Départ", 143, y);
    doc.text("Dîner", 164, y);
    doc.text("Total", 183, y);

    // Group entries by date
    const byDate = {};
    userEntries.forEach(e => {
      if (!byDate[e.work_date]) byDate[e.work_date] = [];
      byDate[e.work_date].push(e);
    });
    const sortedDates = Object.keys(byDate).sort();

    y += 10;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    let rowIdx = 0;

    sortedDates.forEach(date => {
      const dayEntries = byDate[date].sort((a, b) => a.punch_in.localeCompare(b.punch_in));
      const dayTotal = dayEntries.reduce((s, e) => s + (e.total_hours || 0), 0);

      dayEntries.forEach((e, idx) => {
        if (rowIdx % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(14, y - 5, 182, 8, "F");
        }
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        if (idx === 0) doc.text(format(parseISO(date), "EEE d/MM", { locale: fr }), 16, y);
        const proj = (e.project_name || "-").substring(0, 30);
        doc.text(proj, 50, y);
        doc.text(e.punch_in ? format(parseISO(e.punch_in), "HH:mm") : "-", 120, y);
        doc.text(e.punch_out ? format(parseISO(e.punch_out), "HH:mm") : "-", 143, y);
        doc.text(`${e.lunch_break || 0}m`, 164, y);
        doc.text(`${(e.total_hours || 0).toFixed(2)}h`, 183, y);
        y += 9;
        rowIdx++;
      });

      // Day total
      doc.setFillColor(220, 252, 231);
      doc.rect(14, y - 5, 182, 7, "F");
      doc.setTextColor(22, 101, 52);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("Total jour", 164, y);
      doc.text(`${dayTotal.toFixed(2)}h`, 183, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      y += 10;
    });

    // Week total
    y += 4;
    doc.setFillColor(22, 101, 52);
    doc.rect(14, y - 6, 182, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TOTAL SEMAINE", 16, y + 1);
    doc.text(`${weekTotal.toFixed(2)} heures`, 155, y + 1);

    // Footer
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Généré le ${format(new Date(), "d MMMM yyyy à HH:mm", { locale: fr })}`, 14, 285);

    doc.save(`slip_paye_${user.full_name.replace(/\s+/g, "_")}_${weekStartStr}.pdf`);
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
        {["DDL Excavation", "DDL Logistique"].map(g => (
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