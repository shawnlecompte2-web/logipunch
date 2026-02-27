import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, X, Edit2, ChevronDown, ChevronUp, Clock } from "lucide-react";
import EditEntryModal from "../components/approvals/EditEntryModal";

export default function Approvals() {
  const [entries, setEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [approverUser, setApproverUser] = useState(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [filter, setFilter] = useState("pending"); // pending | all
  const [expandedUser, setExpandedUser] = useState(null);

  const APPROVE_ROLES = ["Administrateur", "Surintendant", "Chargé de projet", "Gestionnaire Chauffeur", "Gestionnaire Cour", "Gestionnaire Mécanique", "Contremaitre"];

  const handlePinLogin = async () => {
    setLoading(true);
    setPinError("");
    const found = await base44.entities.AppUser.filter({ pin_code: pinInput, is_active: true });
    if (!found || found.length === 0 || !APPROVE_ROLES.includes(found[0].role)) {
      setPinError("Accès refusé ou code invalide.");
      setLoading(false);
      return;
    }
    setApproverUser(found[0]);
    setLoading(false);
  };

  useEffect(() => {
    if (!approverUser) return;
    loadData();
  }, [approverUser, filter]);

  const loadData = async () => {
    setLoading(true);
    const allUsers = await base44.entities.AppUser.list();
    setUsers(allUsers);

    let allEntries;
    if (filter === "pending") {
      allEntries = await base44.entities.PunchEntry.filter({ status: "completed" });
    } else {
      allEntries = await base44.entities.PunchEntry.list("-punch_in");
    }

    // Filter based on approver's role/access
    let filtered = allEntries;
    const isAdmin = ["Administrateur", "Surintendant", "Chargé de projet"].includes(approverUser.role);
    if (!isAdmin) {
      if (approverUser.role === "Gestionnaire Chauffeur") {
        const chauffeurs = allUsers.filter(u => u.role === "Chauffeur").map(u => u.id);
        filtered = allEntries.filter(e => chauffeurs.includes(e.user_id));
      } else if (approverUser.role === "Gestionnaire Cour") {
        filtered = allEntries.filter(e => e.project_name === "Éco-Vrac");
      } else if (approverUser.role === "Gestionnaire Mécanique") {
        const mecanos = allUsers.filter(u => u.role === "Mécano").map(u => u.id);
        filtered = allEntries.filter(e => mecanos.includes(e.user_id));
      } else if (approverUser.role === "Contremaitre") {
        const subordinates = allUsers.filter(u => ["Manœuvre", "Opérateur"].includes(u.role)).map(u => u.id);
        filtered = allEntries.filter(e => subordinates.includes(e.user_id));
      } else if (approverUser.approves_users && approverUser.approves_users.length > 0) {
        filtered = allEntries.filter(e => approverUser.approves_users.includes(e.user_id));
      }
    }
    setEntries(filtered);
    setLoading(false);
  };

  const handleApprove = async (entry) => {
    await base44.entities.PunchEntry.update(entry.id, {
      status: "approved",
      approved_by: approverUser.full_name,
      approved_at: new Date().toISOString(),
    });
    loadData();
  };

  const handleReject = async (entry) => {
    await base44.entities.PunchEntry.update(entry.id, { status: "rejected" });
    loadData();
  };

  // Group entries by user
  const groupedByUser = {};
  entries.forEach(e => {
    if (!groupedByUser[e.user_id]) groupedByUser[e.user_id] = [];
    groupedByUser[e.user_id].push(e);
  });

  if (!approverUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center">
                <span className="text-white font-black text-base">L</span>
              </div>
              <span className="text-2xl font-black text-white tracking-tight">LOGIPUNCH</span>
            </div>
            <p className="text-zinc-500 text-sm">Approbation des heures</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Code d'accès</label>
            <input
              type="password"
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handlePinLogin()}
              maxLength={4}
              placeholder="••••"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-center text-2xl font-mono tracking-widest mb-4 focus:outline-none focus:border-green-600"
            />
            {pinError && <p className="text-red-400 text-xs text-center mb-3">{pinError}</p>}
            <button
              onClick={handlePinLogin}
              disabled={loading}
              className="w-full h-12 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all"
            >
              {loading ? "Vérification..." : "Accéder"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold">Approbation des heures</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{approverUser.full_name} · {approverUser.role}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFilter("pending")} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${filter === "pending" ? "bg-green-700 text-white" : "bg-zinc-800 text-zinc-400"}`}>
            En attente
          </button>
          <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${filter === "all" ? "bg-green-700 text-white" : "bg-zinc-800 text-zinc-400"}`}>
            Tout
          </button>
          <button onClick={() => setApproverUser(null)} className="px-3 py-1.5 rounded-lg text-sm text-zinc-400 bg-zinc-800 hover:bg-zinc-700">
            Quitter
          </button>
        </div>
      </div>

      {loading && <p className="text-zinc-500 text-center py-10">Chargement...</p>}

      {!loading && Object.keys(groupedByUser).length === 0 && (
        <div className="text-center py-16">
          <Check size={40} className="text-green-600 mx-auto mb-3" />
          <p className="text-zinc-400">Aucune heure en attente d'approbation</p>
        </div>
      )}

      <div className="space-y-3">
        {Object.entries(groupedByUser).map(([userId, userEntries]) => {
          const u = users.find(x => x.id === userId);
          const name = u?.full_name || userEntries[0]?.user_name || "Inconnu";
          const isExpanded = expandedUser === userId;
          const pending = userEntries.filter(e => e.status === "completed").length;

          return (
            <div key={userId} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedUser(isExpanded ? null : userId)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{name[0]}</span>
                  </div>
                  <div className="text-left">
                    <p className="text-white font-semibold">{name}</p>
                    <p className="text-zinc-500 text-xs">{u?.role} · {userEntries.length} entrée(s)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {pending > 0 && (
                    <span className="px-2 py-0.5 bg-yellow-900/50 border border-yellow-700/50 text-yellow-400 text-xs rounded-full font-semibold">{pending} en attente</span>
                  )}
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
                            <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                              entry.status === "approved" ? "bg-green-900/40 text-green-400 border border-green-700/40" :
                              entry.status === "rejected" ? "bg-red-900/40 text-red-400 border border-red-700/40" :
                              entry.status === "active" ? "bg-blue-900/40 text-blue-400 border border-blue-700/40" :
                              "bg-yellow-900/40 text-yellow-400 border border-yellow-700/40"
                            }`}>
                              {entry.status === "completed" ? "En attente" : entry.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            <div>
                              <span className="text-zinc-500">Date</span>
                              <p className="text-zinc-300">{entry.work_date}</p>
                            </div>
                            <div>
                              <span className="text-zinc-500">Entrée</span>
                              <p className="text-zinc-300">{entry.punch_in ? format(parseISO(entry.punch_in), "HH:mm") : "-"}</p>
                            </div>
                            <div>
                              <span className="text-zinc-500">Sortie</span>
                              <p className="text-zinc-300">{entry.punch_out ? format(parseISO(entry.punch_out), "HH:mm") : "-"}</p>
                            </div>
                            <div>
                              <span className="text-zinc-500">Diner</span>
                              <p className="text-zinc-300">{entry.lunch_break ?? 0} min</p>
                            </div>
                            <div>
                              <span className="text-zinc-500">Total</span>
                              <p className="text-green-400 font-bold">{entry.total_hours?.toFixed(2) || "-"}h</p>
                            </div>
                            {entry.machine && <div><span className="text-zinc-500">Machine</span><p className="text-zinc-300">{entry.machine}</p></div>}
                            {entry.plate_number && <div><span className="text-zinc-500">Plaque</span><p className="text-zinc-300">{entry.plate_number}</p></div>}
                          </div>
                          {entry.approved_by && (
                            <p className="text-zinc-600 text-xs mt-1">Approuvé par {entry.approved_by}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <button onClick={() => setEditEntry(entry)} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all">
                            <Edit2 size={14} className="text-zinc-400" />
                          </button>
                          {entry.status === "completed" && (
                            <>
                              <button onClick={() => handleApprove(entry)} className="p-2 bg-green-900/40 hover:bg-green-800/60 border border-green-700/40 rounded-lg transition-all">
                                <Check size={14} className="text-green-400" />
                              </button>
                              <button onClick={() => handleReject(entry)} className="p-2 bg-red-900/40 hover:bg-red-800/60 border border-red-700/40 rounded-lg transition-all">
                                <X size={14} className="text-red-400" />
                              </button>
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

      {editEntry && (
        <EditEntryModal
          entry={editEntry}
          approver={approverUser}
          onClose={() => setEditEntry(null)}
          onSaved={() => { setEditEntry(null); loadData(); }}
        />
      )}
    </div>
  );
}