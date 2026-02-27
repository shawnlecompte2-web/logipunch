import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, addWeeks, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import * as XLSX from "xlsx";

const GROUPS = ["DDL Excavation", "DDL Logistique", "Groupe DDL"];

export default function TimeSheet() {
  const [entries, setEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [weekDate, setWeekDate] = useState(new Date());
  const [activeGroup, setActiveGroup] = useState("DDL Excavation");
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("week"); // week | day
  const [selectedDay, setSelectedDay] = useState(format(new Date(), "yyyy-MM-dd"));

  const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    loadData();
  }, [weekDate]);

  const loadData = async () => {
    setLoading(true);
    const allUsers = await base44.entities.AppUser.filter({ is_active: true });
    setUsers(allUsers);
    const allEntries = await base44.entities.PunchEntry.filter({ week_start: weekStartStr });
    setEntries(allEntries.filter(e => e.status === "approved" || e.status === "completed"));
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

  const exportCSV = () => {
    const groupUsers = getUsersForGroup();
    const headers = ["Nom", "Rôle", "Groupe", ...days.map(d => format(d, "EEE dd/MM", { locale: fr })), "Total Semaine"];
    const rows = groupUsers.map(user => {
      const dayTotals = days.map(d => {
        const day = getDayEntry(user.id, format(d, "yyyy-MM-dd"));
        return day ? day.totalHours.toFixed(2) : "0";
      });
      return [user.full_name, user.role, user.group, ...dayTotals, getWeekTotal(user.id).toFixed(2)];
    });
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `heures_${activeGroup}_${weekStartStr}.csv`;
    a.click();
  };

  const groupUsers = getUsersForGroup();

  return (
    <div className="min-h-screen p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold">Compilation des heures</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Heures approuvées uniquement</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-all">
            <Download size={15} />
            Exporter CSV
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
                          </div>
                        ) : (
                          <p className="text-zinc-800 text-center">—</p>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-3 text-center">
                    <p className="text-green-400 font-bold">{getWeekTotal(user.id).toFixed(1)}h</p>
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
    </div>
  );
}