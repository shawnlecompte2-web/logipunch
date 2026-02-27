import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, Trash2 } from "lucide-react";

function getStoredUser() {
  try { return JSON.parse(sessionStorage.getItem("logipunch_user") || "null"); } catch { return null; }
}

export default function MyHours() {
  const [user] = useState(getStoredUser);
  const [entries, setEntries] = useState([]);
  const [weekDate, setWeekDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  const weekStart = startOfWeek(weekDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(weekDate, { weekStartsOn: 0 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    if (!user) return;
    loadEntries();
  }, [user, weekDate]);

  const loadEntries = async () => {
    setLoading(true);
    const data = await base44.entities.PunchEntry.filter({ user_id: user.id, week_start: weekStartStr });
    setEntries(data);
    setLoading(false);
  };

  const getDayEntries = (dateStr) => entries.filter(e => e.work_date === dateStr);

  const getWeekTotal = () => entries.reduce((sum, e) => sum + (e.total_hours || 0), 0);

  const handleDelete = async (entryId) => {
    if (!window.confirm("Supprimer cette entrée?")) return;
    await base44.entities.PunchEntry.delete(entryId);
    setEntries(prev => prev.filter(e => e.id !== entryId));
  };

  if (!user) return null;

  return (
    <div className="min-h-screen p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-xl font-bold">Mes heures</h1>
          <p className="text-zinc-500 text-sm">{user.full_name} · {user.role}</p>
        </div>
      </div>

      {/* Week Nav */}
      <div className="flex items-center gap-3 mb-5 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
        <button onClick={() => setWeekDate(subWeeks(weekDate, 1))} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 transition-all">
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-white text-sm font-semibold">
            Semaine du {format(weekStart, "d MMM", { locale: fr })} au {format(weekEnd, "d MMM yyyy", { locale: fr })}
          </p>
        </div>
        <button onClick={() => setWeekDate(addWeeks(weekDate, 1))} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 transition-all">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Week Total */}
      <div className="bg-green-950/30 border border-green-700/30 rounded-2xl p-4 mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-green-400" />
          <span className="text-green-400 font-bold">Total semaine</span>
        </div>
        <span className="text-green-400 text-2xl font-black">{getWeekTotal().toFixed(2)}h</span>
      </div>

      {loading && <p className="text-zinc-500 text-center py-8">Chargement...</p>}

      {/* Day breakdown */}
      {!loading && (
        <div className="space-y-3">
          {days.map(day => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayEntries = getDayEntries(dateStr);
            const dayTotal = dayEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);

            return (
              <div key={dateStr} className={`bg-zinc-900 border rounded-2xl overflow-hidden ${dayEntries.length > 0 ? "border-zinc-700" : "border-zinc-800"}`}>
                <div className={`flex items-center justify-between px-4 py-3 ${dayEntries.length > 0 ? "bg-zinc-800/50" : ""}`}>
                  <p className="text-white font-semibold text-sm capitalize">
                    {format(day, "EEEE d MMMM", { locale: fr })}
                  </p>
                  {dayEntries.length > 0 ? (
                    <span className="text-green-400 font-bold">{dayTotal.toFixed(2)}h</span>
                  ) : (
                    <span className="text-zinc-700 text-sm">—</span>
                  )}
                </div>

                {dayEntries.length > 0 && (
                  <div className="divide-y divide-zinc-800/50">
                    {dayEntries.map(entry => (
                      <div key={entry.id} className="px-4 py-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-white text-sm font-semibold">{entry.project_name}</p>
                              <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                                entry.status === "approved" ? "bg-green-900/40 text-green-400 border border-green-700/40" :
                                entry.status === "active" ? "bg-blue-900/40 text-blue-400 border border-blue-700/40" :
                                "bg-yellow-900/40 text-yellow-400 border border-yellow-700/40"
                              }`}>
                                {entry.status === "active" ? "En cours" : entry.status === "approved" ? "Approuvé" : "En attente"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-zinc-500">
                              <span>Entrée: <span className="text-zinc-300">{entry.punch_in ? format(parseISO(entry.punch_in), "HH:mm") : "—"}</span></span>
                              <span>Sortie: <span className="text-zinc-300">{entry.punch_out ? format(parseISO(entry.punch_out), "HH:mm") : "—"}</span></span>
                              {entry.lunch_break > 0 && <span>Diner: <span className="text-zinc-300">{entry.lunch_break}m</span></span>}
                              {entry.machine && <span>Machine: <span className="text-zinc-300">{entry.machine}</span></span>}
                              {entry.plate_number && <span>Plaque: <span className="text-zinc-300">{entry.plate_number}</span></span>}
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <p className="text-green-400 font-bold text-sm">{entry.total_hours?.toFixed(2) || "—"}h</p>
                            {entry.approved_by && (
                              <p className="text-zinc-600 text-xs mt-0.5">par {entry.approved_by}</p>
                            )}
                            {entry.status !== "approved" && (
                              <button onClick={() => handleDelete(entry.id)} className="p-1.5 bg-zinc-800 hover:bg-red-900/40 border border-zinc-700 hover:border-red-700/40 rounded-lg transition-all mt-1">
                                <Trash2 size={13} className="text-zinc-500 hover:text-red-400" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}