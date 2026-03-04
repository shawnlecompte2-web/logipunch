import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, parseISO, differenceInMinutes, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { MapPin, Clock, RefreshCw, Users, TrendingUp, Timer } from "lucide-react";
import PullToRefresh from "@/components/PullToRefresh";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function getStoredCompany() {
  try { return JSON.parse(sessionStorage.getItem("logipunch_company") || "null"); } catch { return null; }
}

const COLORS = ["#22c55e", "#16a34a", "#15803d", "#4ade80", "#86efac", "#bbf7d0"];

export default function ActiveUsers() {
  const [activeEntries, setActiveEntries] = useState([]);
  const [weekEntries, setWeekEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadData();
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    setLoading(true);
    const company = getStoredCompany();
    const companyId = company?.id;
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const [allEntries, allUsers] = await Promise.all([
      base44.entities.PunchEntry.list("-punch_in", 500),
      companyId ? base44.entities.AppUser.filter({ is_active: true, company_id: companyId }) : base44.entities.AppUser.filter({ is_active: true }),
    ]);
    const companyEntries = allEntries.filter(e => companyId ? e.company_id === companyId : true);
    setActiveEntries(companyEntries.filter(e => !e.punch_out));
    setWeekEntries(companyEntries.filter(e => e.week_start === weekStart));
    setUsers(allUsers);
    setLoading(false);
  };

  const getElapsedMinutes = (punchIn) => differenceInMinutes(currentTime, new Date(punchIn));

  const getElapsed = (punchIn) => {
    const diff = getElapsedMinutes(punchIn);
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h}h ${m.toString().padStart(2, "0")}m`;
  };

  // Group by project
  const byProject = {};
  activeEntries.forEach(e => {
    if (!byProject[e.project_name]) byProject[e.project_name] = [];
    byProject[e.project_name].push(e);
  });

  // Chart data: total hours per project (from week entries)
  const weekByProject = {};
  weekEntries.forEach(e => {
    if (!weekByProject[e.project_name]) weekByProject[e.project_name] = 0;
    weekByProject[e.project_name] += parseFloat(e.total_hours) || 0;
  });
  const chartData = Object.entries(weekByProject).map(([name, heures]) => ({
    name: name.length > 18 ? name.slice(0, 18) + "…" : name,
    fullName: name,
    heures: parseFloat(heures.toFixed(1)),
  }));

  // Total accumulated hours (active right now)
  const totalHours = activeEntries.reduce((sum, e) => sum + getElapsedMinutes(e.punch_in), 0) / 60;

  // Top worker of the week (most hours)
  const weekHoursByUser = {};
  weekEntries.forEach(e => {
    if (!weekHoursByUser[e.user_id]) weekHoursByUser[e.user_id] = { user_name: e.user_name, hours: 0 };
    weekHoursByUser[e.user_id].hours += parseFloat(e.total_hours) || 0;
  });
  const topWorker = Object.values(weekHoursByUser).length > 0
    ? Object.values(weekHoursByUser).reduce((max, u) => u.hours > max.hours ? u : max, Object.values(weekHoursByUser)[0])
    : null;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs">
          <p className="text-white font-bold mb-1">{d.fullName}</p>
          <p className="text-green-400">{d.heures}h cette semaine</p>
        </div>
      );
    }
    return null;
  };

  return (
    <PullToRefresh onRefresh={loadData}>
    <div className="min-h-screen p-4 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold">Actifs en ce moment</h1>
          <p className="text-zinc-500 text-sm mt-0.5 capitalize">
            {format(currentTime, "EEEE d MMMM · HH:mm", { locale: fr })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-green-900/30 border border-green-700/40 rounded-xl flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-400 text-sm font-semibold">{activeEntries.length} actif{activeEntries.length > 1 ? "s" : ""}</span>
          </div>
          <button onClick={loadData} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-400 transition-all">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading && <p className="text-zinc-500 text-center py-10">Chargement...</p>}

      {!loading && activeEntries.length === 0 && (
        <div className="text-center py-16">
          <Clock size={40} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">Aucun utilisateur actif en ce moment</p>
        </div>
      )}

      {!loading && activeEntries.length > 0 && (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-1">
              <Users size={16} className="text-green-400 mb-1" />
              <p className="text-2xl font-black text-white">{activeEntries.length}</p>
              <p className="text-zinc-500 text-xs">Employés actifs</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-1">
              <TrendingUp size={16} className="text-green-400 mb-1" />
              <p className="text-2xl font-black text-white">{totalHours.toFixed(1)}h</p>
              <p className="text-zinc-500 text-xs">Heures cumulées</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-1">
              <MapPin size={16} className="text-green-400 mb-1" />
              <p className="text-2xl font-black text-white">{Object.keys(byProject).length}</p>
              <p className="text-zinc-500 text-xs">Projet{Object.keys(byProject).length > 1 ? "s" : ""} actif{Object.keys(byProject).length > 1 ? "s" : ""}</p>
            </div>
          </div>

          {/* Bar chart */}
          {chartData.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-5">
              <p className="text-white font-bold text-sm mb-4">Heures de la semaine par projet</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} barCategoryGap="30%">
                  <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} unit="h" width={32} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="heures" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top worker of the week */}
          {topWorker && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 mb-5 flex items-center gap-3">
              <Timer size={18} className="text-yellow-400 shrink-0" />
              <div>
                <p className="text-zinc-400 text-xs">Plus d'heures cette semaine</p>
                <p className="text-white text-sm font-bold">{topWorker.user_name} · <span className="text-yellow-400">{topWorker.hours.toFixed(1)}h</span></p>
              </div>
            </div>
          )}

          {/* By project list */}
          <div className="space-y-4">
            {Object.entries(byProject).map(([projectName, pEntries], pi) => {
              const projectHours = (pEntries.reduce((sum, e) => sum + getElapsedMinutes(e.punch_in), 0) / 60).toFixed(1);
              return (
                <div key={projectName} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[pi % COLORS.length] }} />
                    <MapPin size={14} className="text-green-400" />
                    <span className="text-white font-bold text-sm flex-1">{projectName}</span>
                    <span className="text-green-400 text-xs font-semibold">{projectHours}h</span>
                    <span className="text-zinc-500 text-xs ml-2">{pEntries.length} emp.</span>
                  </div>
                  <div className="divide-y divide-zinc-800/50">
                    {pEntries.map(entry => {
                      const user = users.find(u => u.id === entry.user_id);
                      return (
                        <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-green-900/20 border border-green-800/30 flex items-center justify-center shrink-0">
                              <span className="text-green-400 text-sm font-bold">{(entry.user_name || "?")[0]}</span>
                            </div>
                            <div>
                              <p className="text-white font-semibold text-sm">{entry.user_name}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-zinc-500 text-xs">{user?.role}</span>
                                {entry.machine && <span className="text-zinc-600 text-xs">· {entry.machine}</span>}
                                {entry.plate_number && <span className="text-zinc-600 text-xs">· {entry.plate_number}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-zinc-400 text-xs">Depuis {format(parseISO(entry.punch_in), "HH:mm")}</p>
                            <p className="text-green-400 text-sm font-bold">{getElapsed(entry.punch_in)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
    </PullToRefresh>
  );
}