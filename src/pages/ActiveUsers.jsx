import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { fr } from "date-fns/locale";
import { MapPin, Clock, RefreshCw } from "lucide-react";

export default function ActiveUsers() {
  const [activeEntries, setActiveEntries] = useState([]);
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
    const entries = await base44.entities.PunchEntry.filter({ status: "active" });
    const allUsers = await base44.entities.AppUser.filter({ is_active: true });
    setActiveEntries(entries);
    setUsers(allUsers);
    setLoading(false);
  };

  const getElapsed = (punchIn) => {
    const diff = differenceInMinutes(currentTime, new Date(punchIn));
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

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold">Utilisateurs actifs</h1>
          <p className="text-zinc-500 text-sm mt-0.5 capitalize">
            {format(currentTime, "EEEE d MMMM yyyy · HH:mm", { locale: fr })}
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

      <div className="space-y-4">
        {Object.entries(byProject).map(([projectName, pEntries]) => (
          <div key={projectName} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
              <MapPin size={15} className="text-green-400" />
              <span className="text-green-400 font-bold text-sm">{projectName}</span>
              <span className="ml-auto text-zinc-500 text-xs">{pEntries.length} employé{pEntries.length > 1 ? "s" : ""}</span>
            </div>
            <div className="divide-y divide-zinc-800/50">
              {pEntries.map(entry => {
                const user = users.find(u => u.id === entry.user_id);
                return (
                  <div key={entry.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-green-900/30 border border-green-700/30 flex items-center justify-center">
                        <span className="text-green-400 text-sm font-bold">{(entry.user_name || "?")[0]}</span>
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{entry.user_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-zinc-500 text-xs">{user?.role}</span>
                          {entry.machine && <span className="text-zinc-600 text-xs">· {entry.machine}</span>}
                          {entry.plate_number && <span className="text-zinc-600 text-xs">· {entry.plate_number}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-sm font-semibold">{format(parseISO(entry.punch_in), "HH:mm")}</p>
                      <p className="text-green-400 text-xs font-semibold">{getElapsed(entry.punch_in)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}