import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, parseISO } from "date-fns";
import { Check, X, Edit2, ChevronDown, ChevronUp } from "lucide-react";

function getStoredUser() {
  try { return JSON.parse(sessionStorage.getItem("logipunch_user") || "null"); } catch { return null; }
}

function EditEntryModal({ entry, approver, onClose, onSaved }) {
  const [punchIn, setPunchIn] = useState(
    entry.punch_in ? format(parseISO(entry.punch_in), "yyyy-MM-dd'T'HH:mm") : ""
  );
  const [punchOut, setPunchOut] = useState(
    entry.punch_out ? format(parseISO(entry.punch_out), "yyyy-MM-dd'T'HH:mm") : ""
  );
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
    await base44.entities.PunchEntry.update(entry.id, {
      punch_in: new Date(punchIn).toISOString(),
      punch_out: punchOut ? new Date(punchOut).toISOString() : undefined,
      lunch_break: lunch,
      total_hours: total ? parseFloat(total) : entry.total_hours,
      modified_by: approver.full_name,
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

const APPROVE_ROLES = ["Administrateur", "Surintendant", "Chargé de projet", "Gestionnaire Chauffeur", "Gestionnaire Cour", "Gestionnaire Mécanique", "Contremaitre"];

export default function Approvals() {
  const [entries, setEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [approverUser] = useState(() => {
    const u = getStoredUser();
    return u && APPROVE_ROLES.includes(u.role) ? u : null;
  });
  const [loading, setLoading] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [filter, setFilter] = useState("pending");
  const [expandedUser, setExpandedUser] = useState(null);

  useEffect(() => {
    if (!approverUser) return;
    loadData();
  }, [approverUser, filter]);

  const loadData = async () => {
    setLoading(true);
    const allUsers = await base44.entities.AppUser.list();
    setUsers(allUsers);
    let allEntries = filter === "pending"
      ? await base44.entities.PunchEntry.filter({ status: "completed" })
      : await base44.entities.PunchEntry.list("-punch_in");

    const isAdmin = ["Administrateur", "Surintendant", "Chargé de projet"].includes(approverUser.role);
    if (!isAdmin) {
      if (approverUser.role === "Gestionnaire Chauffeur") {
        const ids = allUsers.filter(u => u.role === "Chauffeur").map(u => u.id);
        allEntries = allEntries.filter(e => ids.includes(e.user_id));
      } else if (approverUser.role === "Gestionnaire Cour") {
        allEntries = allEntries.filter(e => e.project_name === "Éco-Vrac");
      } else if (approverUser.role === "Gestionnaire Mécanique") {
        const ids = allUsers.filter(u => u.role === "Mécano").map(u => u.id);
        allEntries = allEntries.filter(e => ids.includes(e.user_id));
      } else if (approverUser.role === "Contremaitre") {
        const ids = allUsers.filter(u => ["Manœuvre", "Opérateur"].includes(u.role)).map(u => u.id);
        allEntries = allEntries.filter(e => ids.includes(e.user_id));
      } else if (approverUser.approves_users?.length > 0) {
        allEntries = allEntries.filter(e => approverUser.approves_users.includes(e.user_id));
      }
    }
    setEntries(allEntries);
    setLoading(false);
  };

  const handleApprove = async (entry) => {
    await base44.entities.PunchEntry.update(entry.id, { status: "approved", approved_by: approverUser.full_name, approved_at: new Date().toISOString() });
    loadData();
  };

  const handleReject = async (entry) => {
    await base44.entities.PunchEntry.update(entry.id, { status: "rejected" });
    loadData();
  };

  const groupedByUser = {};
  entries.forEach(e => {
    if (!groupedByUser[e.user_id]) groupedByUser[e.user_id] = [];
    groupedByUser[e.user_id].push(e);
  });

  if (!approverUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <p className="text-zinc-500">Accès non autorisé pour votre rôle.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold">Approbation des heures</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{approverUser.full_name} · {approverUser.role}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilter("pending")} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${filter === "pending" ? "bg-green-700 text-white" : "bg-zinc-800 text-zinc-400"}`}>En attente</button>
          <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${filter === "all" ? "bg-green-700 text-white" : "bg-zinc-800 text-zinc-400"}`}>Tout</button>
          <button onClick={() => setApproverUser(null)} className="px-3 py-1.5 rounded-lg text-sm text-zinc-400 bg-zinc-800 hover:bg-zinc-700">Quitter</button>
        </div>
      </div>
      {loading && <p className="text-zinc-500 text-center py-10">Chargement...</p>}
      {!loading && Object.keys(groupedByUser).length === 0 && (
        <div className="text-center py-16"><Check size={40} className="text-green-600 mx-auto mb-3" /><p className="text-zinc-400">Aucune heure en attente d'approbation</p></div>
      )}
      <div className="space-y-3">
        {Object.entries(groupedByUser).map(([userId, userEntries]) => {
          const u = users.find(x => x.id === userId);
          const name = u?.full_name || userEntries[0]?.user_name || "Inconnu";
          const isExpanded = expandedUser === userId;
          const pending = userEntries.filter(e => e.status === "completed").length;
          return (
            <div key={userId} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <button onClick={() => setExpandedUser(isExpanded ? null : userId)} className="w-full flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center"><span className="text-white text-sm font-bold">{name[0]}</span></div>
                  <div className="text-left">
                    <p className="text-white font-semibold">{name}</p>
                    <p className="text-zinc-500 text-xs">{u?.role} · {userEntries.length} entrée(s)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {pending > 0 && <span className="px-2 py-0.5 bg-yellow-900/50 border border-yellow-700/50 text-yellow-400 text-xs rounded-full font-semibold">{pending} en attente</span>}
                  {isExpanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
                </div>
              </button>
              {isExpanded && (
                <div className="border-t border-zinc-800">
                  {userEntries.sort((a, b) => new Date(b.punch_in) - new Date(a.punch_in)).map(entry => (
                    <div key={entry.id} className="p-4 border-b border-zinc-800/50 last:border-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-white text-sm font-semibold">{entry.project_name}</span>
                            <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${entry.status === "approved" ? "bg-green-900/40 text-green-400 border border-green-700/40" : entry.status === "rejected" ? "bg-red-900/40 text-red-400 border border-red-700/40" : entry.status === "active" ? "bg-blue-900/40 text-blue-400 border border-blue-700/40" : "bg-yellow-900/40 text-yellow-400 border border-yellow-700/40"}`}>
                              {entry.status === "completed" ? "En attente" : entry.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            <div><span className="text-zinc-500">Date</span><p className="text-zinc-300">{entry.work_date}</p></div>
                            <div><span className="text-zinc-500">Entrée</span><p className="text-zinc-300">{entry.punch_in ? format(parseISO(entry.punch_in), "HH:mm") : "-"}</p></div>
                            <div><span className="text-zinc-500">Sortie</span><p className="text-zinc-300">{entry.punch_out ? format(parseISO(entry.punch_out), "HH:mm") : "-"}</p></div>
                            <div><span className="text-zinc-500">Diner</span><p className="text-zinc-300">{entry.lunch_break ?? 0} min</p></div>
                            <div><span className="text-zinc-500">Total</span><p className="text-green-400 font-bold">{entry.total_hours?.toFixed(2) || "-"}h</p></div>
                            {entry.machine && <div><span className="text-zinc-500">Machine</span><p className="text-zinc-300">{entry.machine}</p></div>}
                            {entry.plate_number && <div><span className="text-zinc-500">Plaque</span><p className="text-zinc-300">{entry.plate_number}</p></div>}
                          </div>
                          {entry.approved_by && <p className="text-zinc-600 text-xs mt-1">Approuvé par {entry.approved_by}</p>}
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <button onClick={() => setEditEntry(entry)} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all"><Edit2 size={14} className="text-zinc-400" /></button>
                          {entry.status === "completed" && (
                            <>
                              <button onClick={() => handleApprove(entry)} className="p-2 bg-green-900/40 hover:bg-green-800/60 border border-green-700/40 rounded-lg transition-all"><Check size={14} className="text-green-400" /></button>
                              <button onClick={() => handleReject(entry)} className="p-2 bg-red-900/40 hover:bg-red-800/60 border border-red-700/40 rounded-lg transition-all"><X size={14} className="text-red-400" /></button>
                            </>
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
      {editEntry && <EditEntryModal entry={editEntry} approver={approverUser} onClose={() => setEditEntry(null)} onSaved={() => { setEditEntry(null); loadData(); }} />}
    </div>
  );
}