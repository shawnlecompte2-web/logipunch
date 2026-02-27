import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Delete, LogOut, Clock, ChevronRight, ArrowLeft, Coffee } from "lucide-react";
import { format, startOfWeek, differenceInMinutes } from "date-fns";
import { fr } from "date-fns/locale";

const AUTO_APPROVE_ROLES = ["Administrateur", "Surintendant", "Chargé de projet"];

// ─── PIN ENTRY ───────────────────────────────────────────────────────────────
function PinEntry({ onSuccess }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleKey = (val) => {
    if (pin.length < 4) {
      const newPin = pin + val;
      setPin(newPin);
      setError("");
      if (newPin.length === 4) verifyPin(newPin);
    }
  };

  const handleDelete = () => { setPin(p => p.slice(0, -1)); setError(""); };

  const verifyPin = async (code) => {
    setLoading(true);
    try {
      const users = await base44.entities.AppUser.filter({ pin_code: code, is_active: true });
      if (!users || users.length === 0) { setError("Code invalide. Réessayez."); setPin(""); setLoading(false); return; }
      const user = users[0];
      const entries = await base44.entities.PunchEntry.filter({ user_id: user.id, status: "active" });
      onSuccess(user, entries && entries.length > 0 ? entries[0] : null);
    } catch (e) { setError("Erreur. Réessayez."); setPin(""); }
    setLoading(false);
  };

  const keys = ["1","2","3","4","5","6","7","8","9","","0","del"];

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-4">
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
            <span className="text-white font-black text-lg">L</span>
          </div>
          <span className="text-3xl font-black text-white tracking-tight">LOGIPUNCH</span>
        </div>
        <p className="text-zinc-500 text-sm mt-1">Entrez votre code à 4 chiffres</p>
      </div>
      <div className="flex gap-4 mb-8">
        {[0,1,2,3].map(i => (
          <div key={i} className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${i < pin.length ? "bg-green-500 border-green-500 scale-110" : "bg-transparent border-zinc-600"}`} />
        ))}
      </div>
      {error && <div className="mb-5 px-5 py-2.5 bg-red-900/30 border border-red-700/50 rounded-xl text-red-400 text-sm text-center">{error}</div>}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {keys.map((k, i) => {
          if (k === "") return <div key={i} />;
          if (k === "del") return (
            <button key={i} onClick={handleDelete} disabled={loading} className="h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center active:scale-95 transition-all text-zinc-400 hover:bg-zinc-700">
              <Delete size={22} />
            </button>
          );
          return (
            <button key={i} onClick={() => handleKey(k)} disabled={loading || pin.length >= 4} className="h-16 rounded-2xl bg-zinc-800 border border-zinc-700 text-white text-2xl font-semibold active:scale-95 transition-all hover:bg-zinc-700 hover:border-green-600">
              {k}
            </button>
          );
        })}
      </div>
      {loading && <div className="mt-8 text-green-400 text-sm animate-pulse">Vérification...</div>}
    </div>
  );
}

// ─── PUNCH IN FORM ───────────────────────────────────────────────────────────
function PunchInForm({ user, projects, onSuccess, onBack }) {
  const [selectedProject, setSelectedProject] = useState("");
  const [machine, setMachine] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const needsMachine = user.role === "Opérateur";
  const needsPlate = user.role === "Chauffeur";
  const availableProjects = user.role === "Mécano"
    ? projects.filter(p => p.name === "Mécanique" || p.project_number === "26-MEC")
    : projects;

  const canSubmit = selectedProject && (!needsMachine || machine) && (!needsPlate || plateNumber);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    const project = projects.find(p => p.id === selectedProject);
    const now = new Date();
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const entry = {
      user_id: user.id, user_name: user.full_name, project_id: selectedProject,
      project_name: project?.name || "", punch_in: now.toISOString(),
      status: AUTO_APPROVE_ROLES.includes(user.role) ? "approved" : "active",
      week_start: weekStart, work_date: format(now, "yyyy-MM-dd"),
      group: user.group, role: user.role, lunch_break: 0,
    };
    if (needsMachine) entry.machine = machine;
    if (needsPlate) entry.plate_number = plateNumber;
    const created = await base44.entities.PunchEntry.create(entry);
    onSuccess(created);
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col max-w-md mx-auto px-4 py-6">
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"><ArrowLeft size={18} /><span className="text-sm">Retour</span></button>
      <h2 className="text-white text-2xl font-bold mb-1">Punch In</h2>
      <p className="text-zinc-500 text-sm mb-6">{user.full_name} · {user.role}</p>
      <div className="mb-4">
        <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Sélectionner un projet *</label>
        <div className="flex flex-col gap-2">
          {availableProjects.map(p => (
            <button key={p.id} onClick={() => setSelectedProject(p.id)} className={`w-full p-4 rounded-2xl border text-left transition-all ${selectedProject === p.id ? "bg-green-900/30 border-green-600 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{p.project_number}{p.address ? ` · ${p.address}` : ""}</p>
                </div>
                {selectedProject === p.id && <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full" /></div>}
              </div>
            </button>
          ))}
        </div>
      </div>
      {needsMachine && (
        <div className="mb-4">
          <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Machine utilisée *</label>
          <input value={machine} onChange={e => setMachine(e.target.value)} placeholder="Ex: Excavatrice 320, Compacteur..." className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-600 text-sm" />
        </div>
      )}
      {needsPlate && (
        <div className="mb-4">
          <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Numéro de plaque *</label>
          <input value={plateNumber} onChange={e => setPlateNumber(e.target.value.toUpperCase())} placeholder="Ex: ABC-1234" className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-600 text-sm font-mono" />
        </div>
      )}
      <button onClick={handleSubmit} disabled={!canSubmit || loading} className={`mt-4 w-full h-14 rounded-2xl font-bold text-base transition-all flex items-center justify-between px-6 ${canSubmit && !loading ? "bg-green-600 hover:bg-green-500 text-white glow-green" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}>
        <span>{loading ? "Enregistrement..." : "CONFIRMER PUNCH IN"}</span>
        {!loading && <ChevronRight size={20} />}
      </button>
    </div>
  );
}

// ─── PUNCH OUT FORM ──────────────────────────────────────────────────────────
function PunchOutForm({ user, activeEntry, onSuccess, onBack }) {
  const [lunch, setLunch] = useState(null);
  const [customLunch, setCustomLunch] = useState("");
  const [loading, setLoading] = useState(false);
  const now = new Date();
  const punchInTime = new Date(activeEntry.punch_in);
  const totalMinutes = differenceInMinutes(now, punchInTime);
  const lunchMinutes = lunch === "custom" ? parseInt(customLunch) || 0 : (lunch ?? 0);
  const workedHours = (Math.max(0, totalMinutes - lunchMinutes) / 60).toFixed(2);
  const canSubmit = lunch !== null;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    const finalLunch = lunch === "custom" ? parseInt(customLunch) || 0 : lunch;
    await base44.entities.PunchEntry.update(activeEntry.id, {
      punch_out: now.toISOString(), lunch_break: finalLunch,
      total_hours: parseFloat(Math.max(0, (totalMinutes - finalLunch) / 60).toFixed(2)),
      status: "completed",
    });
    onSuccess();
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col max-w-md mx-auto px-4 py-6">
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"><ArrowLeft size={18} /><span className="text-sm">Retour</span></button>
      <h2 className="text-white text-2xl font-bold mb-1">Punch Out</h2>
      <p className="text-zinc-500 text-sm mb-6">{user.full_name}</p>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div><p className="text-zinc-500 text-xs mb-1">Projet</p><p className="text-white text-sm font-semibold">{activeEntry.project_name}</p></div>
          <div><p className="text-zinc-500 text-xs mb-1">Début</p><p className="text-white text-sm font-semibold">{format(punchInTime, "HH:mm")}</p></div>
          <div><p className="text-zinc-500 text-xs mb-1">Fin</p><p className="text-white text-sm font-semibold">{format(now, "HH:mm")}</p></div>
        </div>
      </div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3"><Coffee size={16} className="text-zinc-400" /><label className="text-zinc-400 text-xs uppercase tracking-widest">Temps de diner *</label></div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[0,15,30,45,60].map(opt => (
            <button key={opt} onClick={() => { setLunch(opt); setCustomLunch(""); }} className={`py-3 rounded-xl border text-sm font-semibold transition-all ${lunch === opt ? "bg-green-900/30 border-green-600 text-green-400" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>
              {opt === 0 ? "Aucun" : `${opt} min`}
            </button>
          ))}
          <button onClick={() => setLunch("custom")} className={`py-3 rounded-xl border text-sm font-semibold transition-all ${lunch === "custom" ? "bg-green-900/30 border-green-600 text-green-400" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>Autre</button>
        </div>
        {lunch === "custom" && <input type="number" value={customLunch} onChange={e => setCustomLunch(e.target.value)} placeholder="Minutes..." min="0" max="120" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-600 text-sm" />}
      </div>
      {canSubmit && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><p className="text-zinc-500 text-xs mb-1">Brut</p><p className="text-white text-sm font-bold">{Math.floor(totalMinutes/60)}h{(totalMinutes%60).toString().padStart(2,"0")}</p></div>
            <div><p className="text-zinc-500 text-xs mb-1">- Diner</p><p className="text-red-400 text-sm font-bold">-{lunchMinutes}m</p></div>
            <div><p className="text-zinc-500 text-xs mb-1">Total</p><p className="text-green-400 text-base font-bold">{workedHours}h</p></div>
          </div>
        </div>
      )}
      <button onClick={handleSubmit} disabled={!canSubmit || loading} className={`w-full h-14 rounded-2xl font-bold text-base transition-all ${canSubmit && !loading ? "bg-red-700 hover:bg-red-600 text-white glow-red" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}>
        {loading ? "Enregistrement..." : "CONFIRMER PUNCH OUT"}
      </button>
    </div>
  );
}

// ─── CHANGE PROJECT FORM ─────────────────────────────────────────────────────
function ChangeProjectForm({ user, activeEntry, projects, onSuccess, onBack }) {
  const [selectedProject, setSelectedProject] = useState("");
  const [machine, setMachine] = useState(activeEntry?.machine || "");
  const [loading, setLoading] = useState(false);
  const needsMachine = user.role === "Opérateur";
  const availableProjects = user.role === "Mécano"
    ? projects.filter(p => p.name === "Mécanique" || p.project_number === "26-MEC")
    : projects.filter(p => p.id !== activeEntry?.project_id);
  const canSubmit = selectedProject && (!needsMachine || machine);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    const now = new Date();
    const project = projects.find(p => p.id === selectedProject);
    const punchInTime = new Date(activeEntry.punch_in);
    const totalMinutes = (now - punchInTime) / 1000 / 60;
    await base44.entities.PunchEntry.update(activeEntry.id, {
      punch_out: now.toISOString(), lunch_break: 0,
      total_hours: parseFloat((totalMinutes / 60).toFixed(2)), status: "completed",
    });
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const newEntry = {
      user_id: user.id, user_name: user.full_name, project_id: selectedProject,
      project_name: project?.name || "", punch_in: now.toISOString(), status: "active",
      week_start: weekStart, work_date: format(now, "yyyy-MM-dd"),
      group: user.group, role: user.role, lunch_break: 0, plate_number: activeEntry?.plate_number,
    };
    if (needsMachine) newEntry.machine = machine;
    const created = await base44.entities.PunchEntry.create(newEntry);
    onSuccess(created);
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col max-w-md mx-auto px-4 py-6">
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"><ArrowLeft size={18} /><span className="text-sm">Retour</span></button>
      <h2 className="text-white text-2xl font-bold mb-1">Changer de projet</h2>
      <p className="text-zinc-500 text-sm mb-2">{user.full_name}</p>
      <div className="flex items-center gap-2 text-zinc-500 text-xs mb-6"><span>Projet actuel :</span><span className="text-zinc-300 font-semibold">{activeEntry?.project_name}</span></div>
      <div className="mb-4">
        <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Nouveau projet *</label>
        <div className="flex flex-col gap-2">
          {availableProjects.map(p => (
            <button key={p.id} onClick={() => setSelectedProject(p.id)} className={`w-full p-4 rounded-2xl border text-left transition-all ${selectedProject === p.id ? "bg-green-900/30 border-green-600 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>
              <div className="flex items-center justify-between">
                <div><p className="font-semibold">{p.name}</p><p className="text-xs text-zinc-500 mt-0.5">{p.project_number}</p></div>
                {selectedProject === p.id && <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full" /></div>}
              </div>
            </button>
          ))}
        </div>
      </div>
      {needsMachine && (
        <div className="mb-4">
          <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Machine *</label>
          <input value={machine} onChange={e => setMachine(e.target.value)} placeholder="Machine..." className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-600 text-sm" />
        </div>
      )}
      <button onClick={handleSubmit} disabled={!canSubmit || loading} className={`mt-4 w-full h-14 rounded-2xl font-bold text-base transition-all flex items-center justify-between px-6 ${canSubmit && !loading ? "bg-zinc-700 hover:bg-zinc-600 text-white" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}>
        <span>{loading ? "Changement..." : "CONFIRMER LE CHANGEMENT"}</span>
        {!loading && <ChevronRight size={20} />}
      </button>
    </div>
  );
}

// ─── PUNCH DASHBOARD ─────────────────────────────────────────────────────────
function PunchDashboard({ user, activeEntry, setActiveEntry, onLogout }) {
  const [view, setView] = useState("main");
  const [projects, setProjects] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    base44.entities.Project.filter({ is_active: true }).then(all => {
      if (user.assigned_projects && user.assigned_projects.length > 0) {
        setProjects(all.filter(p => user.assigned_projects.includes(p.id)));
      } else setProjects(all);
    });
  }, [user]);

  const getElapsed = () => {
    if (!activeEntry?.punch_in) return null;
    const diff = (currentTime - new Date(activeEntry.punch_in)) / 1000 / 60;
    return `${Math.floor(diff / 60)}h ${Math.floor(diff % 60).toString().padStart(2, "0")}m`;
  };

  if (view === "punchin") return <PunchInForm user={user} projects={projects} onSuccess={e => { setActiveEntry(e); setView("main"); }} onBack={() => setView("main")} />;
  if (view === "punchout") return <PunchOutForm user={user} activeEntry={activeEntry} onSuccess={() => { setActiveEntry(null); setView("main"); }} onBack={() => setView("main")} />;
  if (view === "changeproject") return <ChangeProjectForm user={user} activeEntry={activeEntry} projects={projects} onSuccess={e => { setActiveEntry(e); setView("main"); }} onBack={() => setView("main")} />;

  return (
    <div className="min-h-screen w-full flex flex-col max-w-md mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center"><span className="text-white font-black text-xs">L</span></div>
          <span className="text-white font-black text-lg tracking-tight">LOGIPUNCH</span>
        </div>
        <button onClick={onLogout} className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"><LogOut size={16} /><span>Quitter</span></button>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Bienvenue</p>
            <h2 className="text-white text-xl font-bold">{user.full_name}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-green-900/40 border border-green-700/40 text-green-400 text-xs rounded-full">{user.role}</span>
              <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs rounded-full">{user.group}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white font-mono text-2xl font-bold">{format(currentTime, "HH:mm")}</p>
            <p className="text-zinc-500 text-xs mt-0.5 capitalize">{format(currentTime, "EEEE d MMM", { locale: fr })}</p>
          </div>
        </div>
      </div>
      {activeEntry && (
        <div className="bg-green-950/40 border border-green-700/40 rounded-2xl p-4 mb-5 glow-green">
          <div className="flex items-center gap-2 mb-3"><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /><span className="text-green-400 text-sm font-semibold">EN COURS</span></div>
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-zinc-500 text-xs mb-0.5">Projet</p><p className="text-white text-sm font-semibold">{activeEntry.project_name}</p></div>
            <div><p className="text-zinc-500 text-xs mb-0.5">Début</p><p className="text-white text-sm font-semibold">{format(new Date(activeEntry.punch_in), "HH:mm")}</p></div>
            <div><p className="text-zinc-500 text-xs mb-0.5">Durée</p><p className="text-green-400 text-sm font-bold">{getElapsed()}</p></div>
            {activeEntry.machine && <div><p className="text-zinc-500 text-xs mb-0.5">Machine</p><p className="text-white text-sm font-semibold">{activeEntry.machine}</p></div>}
            {activeEntry.plate_number && <div><p className="text-zinc-500 text-xs mb-0.5">Plaque</p><p className="text-white text-sm font-semibold">{activeEntry.plate_number}</p></div>}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {!activeEntry ? (
          <button onClick={() => setView("punchin")} className="punch-btn w-full h-16 bg-green-600 hover:bg-green-500 text-white text-lg font-bold rounded-2xl flex items-center justify-between px-6 glow-green">
            <div className="flex items-center gap-3"><Clock size={22} /><span>PUNCH IN</span></div>
            <ChevronRight size={20} />
          </button>
        ) : (
          <>
            <button onClick={() => setView("changeproject")} className="punch-btn w-full h-16 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-lg font-bold rounded-2xl flex items-center justify-between px-6">
              <div className="flex items-center gap-3"><ChevronRight size={22} className="text-zinc-400" /><span>CHANGER DE PROJET</span></div>
              <ChevronRight size={20} className="text-zinc-500" />
            </button>
            <button onClick={() => setView("punchout")} className="punch-btn w-full h-16 bg-red-700 hover:bg-red-600 text-white text-lg font-bold rounded-2xl flex items-center justify-between px-6 glow-red">
              <div className="flex items-center gap-3"><Clock size={22} /><span>PUNCH OUT</span></div>
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function Punch() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeEntry, setActiveEntry] = useState(null);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-start">
      {!currentUser ? (
        <PinEntry onSuccess={(user, entry) => { setCurrentUser(user); setActiveEntry(entry || null); }} />
      ) : (
        <PunchDashboard user={currentUser} activeEntry={activeEntry} setActiveEntry={setActiveEntry} onLogout={() => { setCurrentUser(null); setActiveEntry(null); }} />
      )}
    </div>
  );
}