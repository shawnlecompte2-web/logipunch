import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { LogOut, Clock, Search, X, CheckCircle, UserPlus } from "lucide-react";
import { format, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { calcEntryHoursRounded } from "@/utils/timeCalc";

function getStoredUser() {
  try { return JSON.parse(sessionStorage.getItem("logipunch_user") || "null"); } catch { return null; }
}
function getStoredCompany() {
  try { return JSON.parse(sessionStorage.getItem("logipunch_company") || "null"); } catch { return null; }
}

const ALLOWED_ROLES = ["Adjointe administrative", "admin", "Administrateur"];
const canForceCheckout = (user) => {
  if (!user) return false;
  if (user.is_admin) return true;
  return ALLOWED_ROLES.some(r => user.role?.includes(r)) || user.role?.includes("Surintendant");
};

export default function ForceCheckout() {
  const currentUser = getStoredUser();
  const company = getStoredCompany();
  const [activeEntries, setActiveEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmEntry, setConfirmEntry] = useState(null);
  const [punchOutTime, setPunchOutTime] = useState("");
  const [lunchBreak, setLunchBreak] = useState(30);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);

  // Force punch-in state
  const [showPunchInModal, setShowPunchInModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [piUserId, setPiUserId] = useState("");
  const [piProjectId, setPiProjectId] = useState("");
  const [piTime, setPiTime] = useState("");
  const [piSaving, setPiSaving] = useState(false);
  const [piDone, setPiDone] = useState(null);

  useEffect(() => { loadActive(); loadUsersProjects(); }, []);

  const loadUsersProjects = async () => {
    const companyId = company?.id;
    const [users, projects] = await Promise.all([
      companyId ? base44.entities.AppUser.filter({ is_active: true, company_id: companyId }) : base44.entities.AppUser.filter({ is_active: true }),
      companyId ? base44.entities.Project.filter({ is_active: true, company_id: companyId }) : base44.entities.Project.filter({ is_active: true }),
    ]);
    setAllUsers(users);
    setAllProjects(projects);
  };

  const openPunchInModal = () => {
    const now = new Date();
    const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setPiTime(localISO);
    setPiUserId("");
    setPiProjectId("");
    setPiDone(null);
    setShowPunchInModal(true);
  };

  const handleForcePunchIn = async () => {
    if (!piUserId || !piProjectId || !piTime) return;
    setPiSaving(true);
    const selectedUser = allUsers.find(u => u.id === piUserId);
    const selectedProject = allProjects.find(p => p.id === piProjectId);
    const punchInDate = new Date(piTime);
    const workDate = punchInDate.toISOString().split("T")[0];
    const weekStart = startOfWeek(punchInDate, { weekStartsOn: 0 }).toISOString().split("T")[0];
    await base44.entities.PunchEntry.create({
      user_id: piUserId,
      user_name: selectedUser?.full_name || "",
      project_id: piProjectId,
      project_name: selectedProject?.name || "",
      punch_in: punchInDate.toISOString(),
      status: "active",
      work_date: workDate,
      week_start: weekStart,
      company_id: company?.id,
      breaks_taken: 2,
      lunch_break: 0,
      modified_by: currentUser?.full_name,
      modified_at: new Date().toISOString(),
    });
    setPiSaving(false);
    setPiDone(selectedUser?.full_name);
    loadActive();
  };

  const loadActive = async () => {
    setLoading(true);
    const entries = await base44.entities.PunchEntry.filter({
      status: "active",
      ...(company?.id ? { company_id: company.id } : {})
    });
    setActiveEntries(entries);
    setLoading(false);
  };

  const openConfirm = (entry) => {
    setConfirmEntry(entry);
    // Default punch-out to now
    const now = new Date();
    const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setPunchOutTime(localISO);
    setLunchBreak(30);
    setDone(null);
  };

  const handleCheckout = async () => {
    if (!confirmEntry || !punchOutTime) return;
    setSaving(true);
    const punchOut = new Date(punchOutTime).toISOString();
    const totalHours = calcEntryHoursRounded({
      punch_in: confirmEntry.punch_in,
      punch_out: punchOut,
      lunch_break: lunchBreak,
      breaks_taken: confirmEntry.breaks_taken ?? 2,
    });
    await base44.entities.PunchEntry.update(confirmEntry.id, {
      punch_out: punchOut,
      lunch_break: lunchBreak,
      total_hours: totalHours,
      status: "completed",
      modified_by: currentUser?.full_name,
      modified_at: new Date().toISOString(),
    });
    setSaving(false);
    setDone(confirmEntry.user_name);
    setConfirmEntry(null);
    loadActive();
  };

  if (!canForceCheckout(currentUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-500">Accès non autorisé.</p>
      </div>
    );
  }

  const filtered = activeEntries.filter(e =>
    !search.trim() ||
    e.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.project_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold mb-1">Gestion des pointages</h1>
          <p className="text-zinc-500 text-sm">Employés actuellement punchés-in — fermez leur session si oubli.</p>
        </div>
        <button
          onClick={openPunchInModal}
          className="shrink-0 flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-all"
        >
          <UserPlus size={15} /> Puncher
        </button>
      </div>

      {done && (
        <div className="flex items-center gap-2 bg-green-900/30 border border-green-700/40 rounded-xl px-4 py-3 mb-4 text-green-400 text-sm font-semibold">
          <CheckCircle size={16} /> {done} a été dépunché avec succès.
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un employé ou projet..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-700 placeholder:text-zinc-600"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-zinc-600 text-sm text-center py-12 animate-pulse">Chargement...</p>
      ) : filtered.length === 0 ? (
        <p className="text-zinc-600 text-sm text-center py-12">Aucun employé actuellement punché.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(entry => {
            const elapsed = entry.punch_in ? Math.floor((Date.now() - new Date(entry.punch_in)) / 60000) : 0;
            const h = Math.floor(elapsed / 60);
            const m = elapsed % 60;
            return (
              <div key={entry.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-white font-bold">{entry.user_name}</p>
                    <p className="text-zinc-500 text-sm mt-0.5">{entry.project_name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="flex items-center gap-1 text-green-400 text-xs font-semibold">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        Depuis {format(new Date(entry.punch_in), "HH:mm")}
                      </span>
                      <span className="text-zinc-600 text-xs">({h}h {m.toString().padStart(2,"0")}m écoulé)</span>
                    </div>
                  </div>
                  <button
                    onClick={() => openConfirm(entry)}
                    className="shrink-0 flex items-center gap-2 px-4 py-2 bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 text-red-400 text-sm font-semibold rounded-xl transition-all"
                  >
                    <LogOut size={14} /> Dépuncher
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Force Punch-In modal */}
      {showPunchInModal && (
        <div className="fixed inset-0 bg-black/70 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">Puncher un employé</h3>
              <button onClick={() => setShowPunchInModal(false)} className="text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>

            {piDone ? (
              <div className="text-center py-4">
                <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
                <p className="text-green-400 font-bold">{piDone} a été punché avec succès.</p>
                <button onClick={() => { setPiDone(null); setPiUserId(""); setPiProjectId(""); }} className="mt-4 text-zinc-500 text-sm hover:text-white">Puncher un autre</button>
                <button onClick={() => setShowPunchInModal(false)} className="mt-2 w-full h-10 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-semibold hover:bg-zinc-700 transition-all">Fermer</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Employé</label>
                  <select value={piUserId} onChange={e => setPiUserId(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600">
                    <option value="">— Choisir un employé —</option>
                    {allUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Projet</label>
                  <select value={piProjectId} onChange={e => setPiProjectId(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600">
                    <option value="">— Choisir un projet —</option>
                    {allProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Heure de punch-in</label>
                  <input type="datetime-local" value={piTime} onChange={e => setPiTime(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowPunchInModal(false)} className="flex-1 h-11 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-semibold hover:bg-zinc-700 transition-all">Annuler</button>
                  <button onClick={handleForcePunchIn} disabled={piSaving || !piUserId || !piProjectId || !piTime}
                    className="flex-1 h-11 rounded-xl bg-green-700 hover:bg-green-600 text-white text-sm font-bold transition-all disabled:opacity-40">
                    {piSaving ? "..." : "Puncher"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirmEntry && (
        <div className="fixed inset-0 bg-black/70 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-bold text-lg mb-1">Dépuncher {confirmEntry.user_name}</h3>
            <p className="text-zinc-500 text-sm mb-5">Projet : {confirmEntry.project_name}</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Heure de punch-out</label>
                <input
                  type="datetime-local"
                  value={punchOutTime}
                  onChange={e => setPunchOutTime(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600"
                />
              </div>
              <div>
                <label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Dîner (minutes)</label>
                <div className="flex gap-2">
                  {[0, 15, 30, 45, 60].map(v => (
                    <button key={v} onClick={() => setLunchBreak(v)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${lunchBreak === v ? "bg-green-900/40 border-green-700/60 text-green-400" : "bg-zinc-800 border-zinc-700 text-zinc-400"}`}>
                      {v}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setConfirmEntry(null)} className="flex-1 h-11 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-semibold hover:bg-zinc-700 transition-all">Annuler</button>
              <button onClick={handleCheckout} disabled={saving || !punchOutTime}
                className="flex-1 h-11 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-bold transition-all disabled:opacity-40">
                {saving ? "..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}