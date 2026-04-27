import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, X, Edit2, ChevronDown, ChevronUp, Trash2, MapPin, ArrowRight, CheckCheck } from "lucide-react";
import PullToRefresh from "@/components/PullToRefresh";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

function getStoredCompany() {
  try { return JSON.parse(sessionStorage.getItem("logipunch_company") || "null"); } catch { return null; }
}
function getStoredUser() {
  try { return JSON.parse(sessionStorage.getItem("logipunch_user") || "null"); } catch { return null; }
}

function toHM(h) {
  const hours = Math.floor(h || 0);
  const mins = Math.round(((h || 0) - hours) * 60);
  return `${hours}h${mins.toString().padStart(2, "0")}`;
}

function LunchDrawer({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const opts = [0, 15, 30, 45, 60];
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm text-left flex items-center justify-between">
        <span>{value === 0 ? "Aucun" : `${value} min`}</span>
        <ChevronDown size={14} className="text-zinc-500" />
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="bg-zinc-900 border-t border-zinc-700">
          <DrawerHeader><DrawerTitle className="text-white text-left">Dîner</DrawerTitle></DrawerHeader>
          <div className="px-4 pb-8 space-y-2">
            {opts.map(v => (
              <button key={v} onClick={() => { onChange(v); setOpen(false); }}
                className={`w-full px-4 py-3 rounded-xl text-sm font-semibold text-left transition-all border ${value === v ? "bg-green-900/30 border-green-700/50 text-green-400" : "bg-zinc-800 border-zinc-800 text-zinc-300"}`}>
                {v === 0 ? "Aucun" : `${v} min`}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function EditEntryModal({ entry, approver, onClose, onSaved }) {
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
            <LunchDrawer value={lunch} onChange={setLunch} />
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

// A single entry row inside a day group
function EntryRow({ entry, onApprove, onReject, onEdit, onDelete, isSwitch }) {
  return (
    <div className={`p-4 border-b border-zinc-800/40 last:border-0 ${isSwitch ? "bg-blue-950/10" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {isSwitch && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-900/30 border border-blue-700/30 text-blue-400 text-xs rounded-full">
                <ArrowRight size={10} /> Changement
              </span>
            )}
            <span className="text-white text-sm font-semibold">{entry.project_name}</span>
            <span className={`px-2 py-0.5 text-xs rounded-full font-semibold border ${
              entry.status === "approved" ? "bg-green-900/40 text-green-400 border-green-700/40" :
              entry.status === "rejected" ? "bg-red-900/40 text-red-400 border-red-700/40" :
              entry.status === "active" ? "bg-blue-900/40 text-blue-400 border-blue-700/40" :
              "bg-yellow-900/40 text-yellow-400 border-yellow-700/40"
            }`}>
              {entry.status === "completed" ? "En attente" : entry.status}
            </span>
          </div>

          {/* Time info */}
          <div className="flex items-center gap-3 text-sm mb-2">
            <span className="text-zinc-300 font-mono font-semibold">
              {entry.punch_in ? format(parseISO(entry.punch_in), "HH:mm") : "-"}
            </span>
            <span className="text-zinc-600">→</span>
            <span className="text-zinc-300 font-mono font-semibold">
              {entry.punch_out ? format(parseISO(entry.punch_out), "HH:mm") : <span className="text-blue-400">En cours</span>}
            </span>
            {entry.lunch_break > 0 && (
              <span className="text-zinc-500 text-xs">· dîner {entry.lunch_break}m</span>
            )}
            {(2 - (entry.breaks_taken ?? 2)) > 0 && (
              <span className="text-green-500 text-xs">+{(2 - (entry.breaks_taken ?? 2)) * 15}m</span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap text-xs">
            <span className="text-green-400 font-bold text-sm">{toHM(entry.total_hours)}</span>
            {entry.machine && <span className="text-zinc-500">⚙ {entry.machine}</span>}
            {entry.plate_number && <span className="text-zinc-500">🚚 {entry.plate_number}</span>}
          </div>

          {/* GPS */}
          {(entry.on_site_in !== null && entry.on_site_in !== undefined) || (entry.on_site_out !== null && entry.on_site_out !== undefined) ? (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {entry.on_site_in !== null && entry.on_site_in !== undefined && (
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${entry.on_site_in ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                  <MapPin size={10} /> In: {entry.on_site_in ? "Site ✓" : "Hors site ✗"}
                </span>
              )}
              {entry.on_site_out !== null && entry.on_site_out !== undefined && (
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${entry.on_site_out ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                  <MapPin size={10} /> Out: {entry.on_site_out ? "Site ✓" : "Hors site ✗"}
                </span>
              )}
            </div>
          ) : null}

          {entry.approved_by && <p className="text-zinc-600 text-xs mt-1">Approuvé par {entry.approved_by}</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => onEdit(entry)} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all"><Edit2 size={13} className="text-zinc-400" /></button>
          {entry.status === "completed" && (
            <>
              <button onClick={() => onApprove(entry)} className="p-2 bg-green-900/40 hover:bg-green-800/60 border border-green-700/40 rounded-lg transition-all"><Check size={13} className="text-green-400" /></button>
              <button onClick={() => onReject(entry)} className="p-2 bg-red-900/40 hover:bg-red-800/60 border border-red-700/40 rounded-lg transition-all"><X size={13} className="text-red-400" /></button>
            </>
          )}
          <button onClick={() => onDelete(entry.id)} className="p-2 bg-zinc-800 hover:bg-red-900/40 border border-zinc-700 hover:border-red-700/40 rounded-lg transition-all"><Trash2 size={13} className="text-zinc-500 hover:text-red-400" /></button>
        </div>
      </div>
    </div>
  );
}

// Day group: shows all entries for a given date with a "approve all pending" button
function DayGroup({ date, entries, onApprove, onApproveAll, onReject, onEdit, onDelete }) {
  const pendingEntries = entries.filter(e => e.status === "completed");
  const totalHours = entries.reduce((s, e) => s + (e.total_hours || 0), 0);
  const dateLabel = (() => {
    try {
      const d = new Date(date + "T12:00:00");
      return format(d, "EEEE d MMMM yyyy", { locale: fr });
    } catch { return date; }
  })();

  return (
    <div className="mb-3 border border-zinc-800/60 rounded-xl overflow-hidden">
      {/* Day header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-800/50">
        <div className="flex items-center gap-2">
          <span className="text-zinc-300 text-sm font-semibold capitalize">{dateLabel}</span>
          <span className="text-green-400 text-sm font-bold">{toHM(totalHours)}</span>
          {entries.length > 1 && (
            <span className="text-zinc-500 text-xs">{entries.length} tranches</span>
          )}
        </div>
        {pendingEntries.length > 0 && (
          <button onClick={() => onApproveAll(pendingEntries)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-900/40 hover:bg-green-800/60 border border-green-700/40 text-green-400 text-xs font-bold rounded-lg transition-all">
            <CheckCheck size={13} />
            Tout approuver ({pendingEntries.length})
          </button>
        )}
      </div>

      {/* Entries timeline */}
      {entries.sort((a, b) => new Date(a.punch_in) - new Date(b.punch_in)).map((entry, i) => (
        <EntryRow
          key={entry.id}
          entry={entry}
          isSwitch={!!entry.is_project_switch && i > 0}
          onApprove={onApprove}
          onReject={onReject}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

const APPROVE_ROLES = ["Administrateur", "Surintendant", "Chargé de projet", "Gestionnaire Chauffeur", "Gestionnaire Cour", "Gestionnaire Mécanique", "Contremaitre"];

export default function Approvals() {
  const [entries, setEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [approverUser, setApproverUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editEntry, setEditEntry] = useState(null);
  const [filter, setFilter] = useState("pending");
  const [expandedUser, setExpandedUser] = useState(null);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser?.id) { setLoading(false); return; }
    base44.entities.AppUser.get(storedUser.id).then(freshUser => {
      const u = freshUser || storedUser;
      const hasAccess = u && (u.is_admin === true || APPROVE_ROLES.includes(u.role) || (u.allowed_pages || []).includes("Approvals"));
      setApproverUser(hasAccess ? u : null);
      if (!hasAccess) setLoading(false);
    }).catch(() => {
      const u = storedUser;
      const hasAccess = u && (u.is_admin === true || APPROVE_ROLES.includes(u.role) || (u.allowed_pages || []).includes("Approvals"));
      setApproverUser(hasAccess ? u : null);
      if (!hasAccess) setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!approverUser) return;
    loadData();
  }, [approverUser, filter]);

  const loadData = async () => {
    setLoading(true);
    const company = getStoredCompany();
    const companyId = company?.id;
    const allUsers = companyId
      ? await base44.entities.AppUser.filter({ company_id: companyId })
      : await base44.entities.AppUser.list();
    setUsers(allUsers);

    let allEntries = filter === "pending"
      ? await base44.entities.PunchEntry.filter({ status: "completed", ...(companyId ? { company_id: companyId } : {}) })
      : companyId
        ? await base44.entities.PunchEntry.filter({ company_id: companyId }, "-punch_in")
        : await base44.entities.PunchEntry.list("-punch_in");

    const isAdmin = approverUser.is_admin === true || ["Administrateur", "Surintendant", "Chargé de projet"].includes(approverUser.role);
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
      } else {
        const workerIds = allUsers.filter(u => {
          const approvedBy = Array.isArray(u.approved_by) ? u.approved_by : (u.approved_by ? [u.approved_by] : []);
          return approvedBy.includes(approverUser.id);
        }).map(u => u.id);
        const legacyIds = Array.isArray(approverUser.approves_users) ? approverUser.approves_users : [];
        const allIds = [...new Set([...workerIds, ...legacyIds])];
        // Only filter if explicit assignments exist; otherwise show all entries in the company
        if (allIds.length > 0) {
          allEntries = allEntries.filter(e => allIds.includes(e.user_id));
        }
        // If allIds is empty, the approver sees all company entries (no specific assignment configured)
      }
    }
    setEntries(allEntries);
    setLoading(false);
  };

  const handleApprove = async (entry) => {
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: "approved", approved_by: approverUser.full_name } : e));
    await base44.entities.PunchEntry.update(entry.id, { status: "approved", approved_by: approverUser.full_name, approved_at: new Date().toISOString() });
  };

  const handleApproveAll = async (pendingEntries) => {
    // Optimistic
    const ids = new Set(pendingEntries.map(e => e.id));
    setEntries(prev => prev.map(e => ids.has(e.id) ? { ...e, status: "approved", approved_by: approverUser.full_name } : e));
    await Promise.all(pendingEntries.map(e =>
      base44.entities.PunchEntry.update(e.id, { status: "approved", approved_by: approverUser.full_name, approved_at: new Date().toISOString() })
    ));
  };

  const handleReject = async (entry) => {
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: "rejected" } : e));
    await base44.entities.PunchEntry.update(entry.id, { status: "rejected" });
  };

  const handleDelete = async (entryId) => {
    if (!window.confirm("Supprimer cette entrée?")) return;
    setEntries(prev => prev.filter(e => e.id !== entryId));
    await base44.entities.PunchEntry.delete(entryId);
  };

  // Group by user, then by date
  const groupedByUser = {};
  entries.forEach(e => {
    if (!groupedByUser[e.user_id]) groupedByUser[e.user_id] = {};
    const date = e.work_date || (e.punch_in ? e.punch_in.substring(0, 10) : "unknown");
    if (!groupedByUser[e.user_id][date]) groupedByUser[e.user_id][date] = [];
    groupedByUser[e.user_id][date].push(e);
  });

  if (!approverUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <p className="text-zinc-500">Accès non autorisé pour votre rôle.</p>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className="min-h-screen p-4 max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold">Approbation des heures</h1>
            <p className="text-zinc-500 text-sm mt-0.5">{approverUser.full_name} · {approverUser.role}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilter("pending")} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${filter === "pending" ? "bg-green-700 text-white" : "bg-zinc-800 text-zinc-400"}`}>En attente</button>
            <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${filter === "all" ? "bg-green-700 text-white" : "bg-zinc-800 text-zinc-400"}`}>Tout</button>
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
          {Object.entries(groupedByUser).map(([userId, byDate]) => {
            const u = users.find(x => x.id === userId);
            const userEntries = Object.values(byDate).flat();
            const name = u?.full_name || userEntries[0]?.user_name || "Inconnu";
            const isExpanded = expandedUser === userId;
            const pending = userEntries.filter(e => e.status === "completed").length;
            const totalH = userEntries.reduce((s, e) => s + (e.total_hours || 0), 0);
            const sortedDates = Object.keys(byDate).sort().reverse();

            return (
              <div key={userId} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                {/* User header */}
                <button onClick={() => setExpandedUser(isExpanded ? null : userId)} className="w-full flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                      <span className="text-white text-sm font-bold">{name[0]}</span>
                    </div>
                    <div className="text-left">
                      <p className="text-white font-semibold">{name}</p>
                      <p className="text-zinc-500 text-xs">{u?.role} · {sortedDates.length} jour(s) · {toHM(totalH)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {pending > 0 && (
                      <span className="px-2 py-0.5 bg-yellow-900/50 border border-yellow-700/50 text-yellow-400 text-xs rounded-full font-semibold">{pending} en attente</span>
                    )}
                    {isExpanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
                  </div>
                </button>

                {/* Expanded: days grouped */}
                {isExpanded && (
                  <div className="border-t border-zinc-800 p-3">
                    {sortedDates.map(date => (
                      <DayGroup
                        key={date}
                        date={date}
                        entries={byDate[date]}
                        onApprove={handleApprove}
                        onApproveAll={handleApproveAll}
                        onReject={handleReject}
                        onEdit={setEditEntry}
                        onDelete={handleDelete}
                      />
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
    </PullToRefresh>
  );
}