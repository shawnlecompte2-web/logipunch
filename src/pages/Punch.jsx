import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Delete, LogOut, Clock, ChevronRight, ArrowLeft, Coffee, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfWeek, differenceInMinutes } from "date-fns";
import { fr } from "date-fns/locale";

const AUTO_APPROVE_ROLES = ["Administrateur", "Surintendant", "Chargé de projet"];

function getStoredUser() {
  try { return JSON.parse(sessionStorage.getItem("logipunch_user") || "null"); } catch { return null; }
}
function getStoredCompany() {
  try { return JSON.parse(sessionStorage.getItem("logipunch_company") || "null"); } catch { return null; }
}
function getStoredEntry() {
  try { return JSON.parse(sessionStorage.getItem("logipunch_active_entry") || "null"); } catch { return null; }
}
function setStoredEntry(entry) {
  if (entry) sessionStorage.setItem("logipunch_active_entry", JSON.stringify(entry));
  else sessionStorage.removeItem("logipunch_active_entry");
}

function calculateOnSite(userLat, userLng, project) {
  if (!project?.latitude || !project?.longitude) return null;
  const R = 6371000;
  const φ1 = (userLat * Math.PI) / 180;
  const φ2 = (project.latitude * Math.PI) / 180;
  const Δφ = ((project.latitude - userLat) * Math.PI) / 180;
  const Δλ = ((project.longitude - userLng) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= 500;
}

function getLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 10000, enableHighAccuracy: true }
    );
  });
}

// ─── GPS STATUS ───────────────────────────────────────────────────────────────
function GpsStatus({ status }) {
  if (status === "loading") return (
    <div className="mb-4 px-4 py-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700 flex items-center gap-2">
      <MapPin size={14} className="text-zinc-400 shrink-0 animate-pulse" />
      <p className="text-zinc-400 text-xs">Localisation GPS en cours...</p>
    </div>
  );
  if (status === "granted") return (
    <div className="mb-4 px-4 py-2.5 rounded-xl bg-green-900/20 border border-green-800/40 flex items-center gap-2">
      <MapPin size={14} className="text-green-400 shrink-0" />
      <p className="text-green-400 text-xs">Position GPS capturée ✓</p>
    </div>
  );
  if (status === "denied") return (
    <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-900/20 border border-red-800/40 flex items-center gap-2">
      <MapPin size={14} className="text-red-400 shrink-0" />
      <p className="text-red-400 text-xs">Position GPS NON capturée ✗</p>
    </div>
  );
  return null;
}

// ─── PROJECT PICKER ───────────────────────────────────────────────────────────
function ProjectPicker({ projects, selected, onSelect }) {
  return (
    <div className="flex flex-col gap-2">
      {projects.map(p => (
        <button key={p.id} onClick={() => onSelect(p.id)}
          className={`w-full p-4 rounded-2xl border text-left transition-all ${selected === p.id ? "bg-green-900/30 border-green-600 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{p.name}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{p.project_number}{p.address ? ` · ${p.address}` : ""}</p>
            </div>
            {selected === p.id && <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full" /></div>}
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── LUNCH PICKER ─────────────────────────────────────────────────────────────
function LunchPicker({ lunch, setLunch, customLunch, setCustomLunch }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-3"><Coffee size={16} className="text-zinc-400" /><label className="text-zinc-400 text-xs uppercase tracking-widest">Temps de dîner *</label></div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[0, 15, 30, 45, 60].map(opt => (
          <button key={opt} onClick={() => { setLunch(opt); setCustomLunch(""); }}
            className={`py-4 rounded-xl border text-sm font-semibold transition-all ${lunch === opt ? "bg-green-900/30 border-green-600 text-green-400" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>
            {opt === 0 ? "Aucun" : `${opt} min`}
          </button>
        ))}
        <button onClick={() => setLunch("custom")}
          className={`py-4 rounded-xl border text-sm font-semibold transition-all ${lunch === "custom" ? "bg-green-900/30 border-green-600 text-green-400" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>
          Autre
        </button>
      </div>
      {lunch === "custom" && (
        <input type="number" value={customLunch} onChange={e => setCustomLunch(e.target.value)}
          placeholder="Minutes..." min="0" max="120"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-600 text-sm mb-3" />
      )}
    </>
  );
}

// ─── PUNCH IN FORM ────────────────────────────────────────────────────────────
function PunchInForm({ user, projects, onSuccess, onBack }) {
  const [selectedProject, setSelectedProject] = useState("");
  const [machine, setMachine] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [locationData, setLocationData] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle");

  const needsMachine = user.role === "Opérateur";
  const needsPlate = user.role === "Chauffeur";
  const canSubmit = selectedProject && (!needsPlate || plateNumber) && locationStatus !== "loading";

  useEffect(() => {
    setLocationStatus("loading");
    navigator.geolocation?.getCurrentPosition(
      pos => { setLocationData({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocationStatus("granted"); },
      () => setLocationStatus("denied"),
      { timeout: 8000, enableHighAccuracy: false }
    );
  }, []);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    const project = projects.find(p => p.id === selectedProject);
    const now = new Date();
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const company = getStoredCompany();
    const location = locationData || await getLocation();
    const entry = {
      user_id: user.id, user_name: user.full_name, project_id: selectedProject,
      project_name: project?.name || "", punch_in: now.toISOString(),
      status: AUTO_APPROVE_ROLES.includes(user.role) ? "approved" : "active",
      week_start: weekStart, work_date: format(now, "yyyy-MM-dd"),
      group: user.group, role: user.role, lunch_break: 0,
      ...(company?.id ? { company_id: company.id } : {}),
    };
    if (needsMachine) entry.machine = machine;
    if (needsPlate) entry.plate_number = plateNumber;
    if (location) {
      entry.punch_in_lat = location.lat;
      entry.punch_in_lng = location.lng;
      const isOnSite = calculateOnSite(location.lat, location.lng, project);
      if (isOnSite !== null) entry.on_site_in = isOnSite;
    }
    const created = await base44.entities.PunchEntry.create(entry);
    sessionStorage.setItem("logipunch_active_entry", JSON.stringify(created));
    onSuccess(created);
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col max-w-md mx-auto px-4 py-6">
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"><ArrowLeft size={18} /><span className="text-sm">Retour</span></button>
      <h2 className="text-white text-2xl font-bold mb-1">Punch In</h2>
      <p className="text-zinc-500 text-sm mb-6">{user.full_name} · {user.role}</p>
      <GpsStatus status={locationStatus} />
      <div className="mb-4">
        <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Sélectionner un projet *</label>
        <ProjectPicker projects={projects} selected={selectedProject} onSelect={setSelectedProject} />
      </div>
      <div className="mb-4">
        <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Machine utilisée</label>
        <input value={machine} onChange={e => setMachine(e.target.value)} placeholder="Ex: Excavatrice 320, Compacteur..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-600 text-sm" />
      </div>
      {needsPlate && (
        <div className="mb-4">
          <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Numéro de plaque *</label>
          <input value={plateNumber} onChange={e => setPlateNumber(e.target.value.toUpperCase())} placeholder="Ex: ABC-1234"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-600 text-sm font-mono" />
        </div>
      )}
      <button onClick={handleSubmit} disabled={!canSubmit || loading}
        className={`mt-4 w-full h-14 rounded-2xl font-bold text-base transition-all flex items-center justify-between px-6 ${canSubmit && !loading ? "bg-green-600 hover:bg-green-500 text-white glow-green" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}>
        <span>{loading ? "Enregistrement..." : "CONFIRMER PUNCH IN"}</span>
        {!loading && <ChevronRight size={20} />}
      </button>
    </div>
  );
}

// ─── PUNCH OUT FORM ───────────────────────────────────────────────────────────
function PunchOutForm({ user, activeEntry, onSuccess, onBack }) {
  const [lunch, setLunch] = useState(null);
  const [customLunch, setCustomLunch] = useState("");
  const [breaksTaken, setBreaksTaken] = useState(2);
  const [loading, setLoading] = useState(false);
  const [punchOutTime] = useState(new Date());
  const [locationData, setLocationData] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle");

  useEffect(() => {
    setLocationStatus("loading");
    navigator.geolocation?.getCurrentPosition(
      pos => { setLocationData({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocationStatus("granted"); },
      () => setLocationStatus("denied"),
      { timeout: 8000, enableHighAccuracy: false }
    );
  }, []);

  const punchInTime = new Date(activeEntry.punch_in);
  const totalMinutes = differenceInMinutes(punchOutTime, punchInTime);
  const lunchMinutes = lunch === "custom" ? parseInt(customLunch) || 0 : (lunch ?? 0);
  const unusedBreakBonus = user.has_paid_breaks ? (2 - breaksTaken) * 15 : 0;
  const workedHours = (Math.max(0, totalMinutes - lunchMinutes + unusedBreakBonus) / 60).toFixed(2);
  const canSubmit = lunch !== null && locationStatus !== "loading";

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    const finalLunch = lunch === "custom" ? parseInt(customLunch) || 0 : lunch;
    const autoApprove = Array.isArray(user.approved_by) && user.approved_by.includes("auto");
    const location = locationData || await getLocation();
    const bonus = (2 - breaksTaken) * 15;
    const updateData = {
      punch_out: punchOutTime.toISOString(), lunch_break: finalLunch,
      breaks_taken: breaksTaken,
      total_hours: parseFloat(Math.max(0, (totalMinutes - finalLunch + bonus) / 60).toFixed(2)),
      status: autoApprove ? "approved" : "completed",
      ...(autoApprove ? { approved_by: "Automatique", approved_at: new Date().toISOString() } : {}),
    };
    if (location) {
      updateData.punch_out_lat = location.lat;
      updateData.punch_out_lng = location.lng;
      const project = await base44.entities.Project.get(activeEntry.project_id);
      const isOnSite = calculateOnSite(location.lat, location.lng, project);
      if (isOnSite !== null) updateData.on_site_out = isOnSite;
    }
    await base44.entities.PunchEntry.update(activeEntry.id, updateData);
    sessionStorage.removeItem("logipunch_active_entry");
    onSuccess();
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col max-w-md mx-auto px-4 py-6">
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"><ArrowLeft size={18} /><span className="text-sm">Retour</span></button>
      <h2 className="text-white text-2xl font-bold mb-1">Punch Out</h2>
      <p className="text-zinc-500 text-sm mb-6">{user.full_name}</p>
      <GpsStatus status={locationStatus} />
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div><p className="text-zinc-500 text-xs mb-1">Projet</p><p className="text-white text-sm font-semibold">{activeEntry.project_name}</p></div>
          <div><p className="text-zinc-500 text-xs mb-1">Début</p><p className="text-white text-sm font-semibold">{format(punchInTime, "HH:mm")}</p></div>
          <div><p className="text-zinc-500 text-xs mb-1">Fin</p><p className="text-white text-sm font-semibold">{format(punchOutTime, "HH:mm")}</p></div>
        </div>
      </div>
      <div className="mb-6">
        <LunchPicker lunch={lunch} setLunch={setLunch} customLunch={customLunch} setCustomLunch={setCustomLunch} />
      </div>
      {user.has_paid_breaks && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3"><span className="text-base">☕</span><label className="text-zinc-400 text-xs uppercase tracking-widest">Pauses prises (15 min chacune)</label></div>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map(n => (
              <button key={n} onClick={() => setBreaksTaken(n)}
                className={`py-4 rounded-xl border text-sm font-semibold transition-all ${breaksTaken === n ? "bg-green-900/30 border-green-600 text-green-400" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>
                {n === 0 ? "Aucune" : n === 1 ? "1 pause" : "2 pauses"}
              </button>
            ))}
          </div>
          {unusedBreakBonus > 0 && <p className="text-green-500 text-xs mt-2 text-center">+{unusedBreakBonus} min ajoutées (pauses non prises)</p>}
        </div>
      )}
      {canSubmit && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div><p className="text-zinc-500 text-xs mb-1">Brut</p><p className="text-white text-sm font-bold">{Math.floor(totalMinutes / 60)}h{(totalMinutes % 60).toString().padStart(2, "0")}</p></div>
            <div><p className="text-zinc-500 text-xs mb-1">- Dîner</p><p className="text-red-400 text-sm font-bold">-{lunchMinutes}m</p></div>
            <div><p className="text-zinc-500 text-xs mb-1">+ Pauses</p><p className={`text-sm font-bold ${unusedBreakBonus > 0 ? "text-green-400" : "text-zinc-600"}`}>+{unusedBreakBonus}m</p></div>
            <div><p className="text-zinc-500 text-xs mb-1">Total</p><p className="text-green-400 text-base font-bold">{workedHours}h</p></div>
          </div>
        </div>
      )}
      <button onClick={handleSubmit} disabled={!canSubmit || loading}
        className={`w-full h-14 rounded-2xl font-bold text-base transition-all ${canSubmit && !loading ? "bg-red-700 hover:bg-red-600 text-white glow-red" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}>
        {loading ? "Enregistrement..." : "CONFIRMER PUNCH OUT"}
      </button>
    </div>
  );
}

// ─── CHANGE PROJECT FORM ──────────────────────────────────────────────────────
function ChangeProjectForm({ user, activeEntry, projects, onSuccess, onBack }) {
  const [step, setStep] = useState("lunch"); // "lunch" | "project"
  const [lunch, setLunch] = useState(null);
  const [customLunch, setCustomLunch] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [machine, setMachine] = useState(activeEntry?.machine || "");
  const [plateNumber, setPlateNumber] = useState(activeEntry?.plate_number || "");
  const [loading, setLoading] = useState(false);

  const needsMachine = user.role === "Opérateur";
  const needsPlate = user.role === "Chauffeur";
  const availableProjects = projects.filter(p => p.id !== activeEntry?.project_id);
  const lunchMinutes = lunch === "custom" ? parseInt(customLunch) || 0 : (lunch ?? 0);
  const canGoNext = lunch !== null;
  const canSubmit = selectedProject && (!needsMachine || machine) && (!needsPlate || plateNumber);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    const now = new Date();
    const project = projects.find(p => p.id === selectedProject);
    const punchInTime = new Date(activeEntry.punch_in);
    const totalMinutes = (now - punchInTime) / 1000 / 60;
    const finalLunch = lunch === "custom" ? parseInt(customLunch) || 0 : (lunch ?? 0);

    // Close current entry with lunch
    await base44.entities.PunchEntry.update(activeEntry.id, {
      punch_out: now.toISOString(),
      lunch_break: finalLunch,
      total_hours: parseFloat(Math.max(0, (totalMinutes - finalLunch) / 60).toFixed(2)),
      status: "completed",
    });

    const company = getStoredCompany();
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const newEntry = {
      user_id: user.id, user_name: user.full_name,
      project_id: selectedProject, project_name: project?.name || "",
      punch_in: now.toISOString(), status: "active",
      week_start: weekStart, work_date: format(now, "yyyy-MM-dd"),
      group: user.group, role: user.role, lunch_break: 0,
      is_project_switch: true,
      ...(plateNumber ? { plate_number: plateNumber } : activeEntry?.plate_number ? { plate_number: activeEntry.plate_number } : {}),
      ...(company?.id ? { company_id: company.id } : {}),
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
      <p className="text-zinc-500 text-sm mb-1">{user.full_name}</p>
      <div className="flex items-center gap-2 text-zinc-500 text-xs mb-4">
        <span>Projet actuel :</span>
        <span className="text-zinc-300 font-semibold">{activeEntry?.project_name}</span>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex items-center gap-1.5">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === "lunch" ? "bg-green-600 text-white" : "bg-green-800 text-green-300"}`}>1</div>
          <span className={`text-xs ${step === "lunch" ? "text-white" : "text-green-400"}`}>Dîner</span>
        </div>
        <div className="flex-1 h-0.5 bg-zinc-700 rounded" />
        <div className="flex items-center gap-1.5">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === "project" ? "bg-green-600 text-white" : "bg-zinc-700 text-zinc-500"}`}>2</div>
          <span className={`text-xs ${step === "project" ? "text-white" : "text-zinc-500"}`}>Projet</span>
        </div>
      </div>

      {step === "lunch" && (
        <>
          <LunchPicker lunch={lunch} setLunch={setLunch} customLunch={customLunch} setCustomLunch={setCustomLunch} />
          {lunch !== null && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 mb-4 text-center text-xs text-zinc-400">
              <span className="text-white font-bold">{lunchMinutes === 0 ? "Aucun dîner" : `${lunchMinutes} min de dîner`}</span> appliqué à <span className="text-zinc-300 font-semibold">{activeEntry?.project_name}</span>
            </div>
          )}
          <button onClick={() => setStep("project")} disabled={!canGoNext}
            className={`mt-2 w-full h-14 rounded-2xl font-bold text-base transition-all flex items-center justify-between px-6 ${canGoNext ? "bg-green-700 hover:bg-green-600 text-white" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}>
            <span>Suivant : choisir le projet</span>
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {step === "project" && (
        <>
          <div className="mb-4">
            <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Nouveau projet *</label>
            <ProjectPicker projects={availableProjects} selected={selectedProject} onSelect={setSelectedProject} />
          </div>
          {needsMachine && (
            <div className="mb-4">
              <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Machine *</label>
              <input value={machine} onChange={e => setMachine(e.target.value)} placeholder="Ex: Excavatrice 320..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-600 text-sm" />
            </div>
          )}
          {needsPlate && (
            <div className="mb-4">
              <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Numéro de plaque *</label>
              <input value={plateNumber} onChange={e => setPlateNumber(e.target.value.toUpperCase())} placeholder="Ex: ABC-1234"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-600 text-sm font-mono" />
            </div>
          )}
          <div className="flex gap-3 mt-2">
            <button onClick={() => setStep("lunch")} className="h-14 px-5 rounded-2xl bg-zinc-800 text-zinc-300 font-semibold hover:bg-zinc-700 transition-all">
              <ArrowLeft size={18} />
            </button>
            <button onClick={handleSubmit} disabled={!canSubmit || loading}
              className={`flex-1 h-14 rounded-2xl font-bold text-base transition-all flex items-center justify-between px-6 ${canSubmit && !loading ? "bg-zinc-700 hover:bg-zinc-600 text-white" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}>
              <span>{loading ? "Changement..." : "CONFIRMER LE CHANGEMENT"}</span>
              {!loading && <ChevronRight size={20} />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── PUNCH DASHBOARD ──────────────────────────────────────────────────────────
function PunchDashboard({ user, activeEntry, setActiveEntry, onLogout }) {
  const company = getStoredCompany();
  const [view, setView] = useState("main");
  const [direction, setDirection] = useState(1);
  const [projects, setProjects] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const company = getStoredCompany();
    const filter = { is_active: true, ...(company?.id ? { company_id: company.id } : {}) };
    base44.entities.Project.filter(filter).then(all => {
      const assignedProjectIds = user.assigned_projects || [];
      const assignedToUser = all.filter(p =>
        assignedProjectIds.includes(p.id) || (p.assigned_users || []).includes(user.id)
      );
      setProjects(assignedToUser.length > 0 ? assignedToUser : all);
    });
  }, [user?.id]);

  useEffect(() => {
    const handlePopState = () => { setDirection(-1); setView("main"); };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateTo = (v) => {
    setDirection(1);
    window.history.pushState({ view: v }, "", window.location.href);
    setView(v);
  };

  const goBack = () => {
    setDirection(-1);
    if (window.history.state?.view) window.history.back();
    else setView("main");
  };

  const getElapsed = () => {
    if (!activeEntry?.punch_in) return null;
    const diff = (currentTime - new Date(activeEntry.punch_in)) / 1000 / 60;
    return `${Math.floor(diff / 60)}h ${Math.floor(diff % 60).toString().padStart(2, "0")}m`;
  };

  const slideVariants = {
    enter: (d) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 350, damping: 35 } },
    exit: (d) => ({ x: d > 0 ? "-30%" : "30%", opacity: 0, transition: { duration: 0.18 } }),
  };

  return (
    <div style={{ overflow: "hidden" }}>
      <AnimatePresence mode="wait" custom={direction}>
        {view === "punchin" && (
          <motion.div key="punchin" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit">
            <PunchInForm user={user} projects={projects}
              onSuccess={e => { setActiveEntry(e); setDirection(-1); setView("main"); }}
              onBack={goBack} />
          </motion.div>
        )}
        {view === "punchout" && (
          <motion.div key="punchout" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit">
            <PunchOutForm user={user} activeEntry={activeEntry}
              onSuccess={() => { setActiveEntry(null); setStoredEntry(null); setDirection(-1); setView("main"); }}
              onBack={goBack} />
          </motion.div>
        )}
        {view === "changeproject" && (
          <motion.div key="changeproject" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit">
            <ChangeProjectForm user={user} activeEntry={activeEntry} projects={projects}
              onSuccess={e => { setActiveEntry(e); setDirection(-1); setView("main"); }}
              onBack={goBack} />
          </motion.div>
        )}
        {view === "main" && (
          <motion.div key="main" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit">
            <div className="min-h-screen w-full flex flex-col max-w-md mx-auto px-5 pt-6 pb-24 md:pb-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="text-white font-black text-lg tracking-tight">{company?.name || "TapIN"}</span>
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
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-green-400 text-sm font-semibold">EN COURS</span>
                    {activeEntry.is_project_switch && (
                      <span className="px-2 py-0.5 bg-blue-900/40 border border-blue-700/40 text-blue-400 text-xs rounded-full">Changement de projet</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-zinc-500 text-xs mb-0.5">Projet</p><p className="text-white text-sm font-semibold">{activeEntry.project_name}</p></div>
                    <div><p className="text-zinc-500 text-xs mb-0.5">Début</p><p className="text-white text-sm font-semibold">{format(new Date(activeEntry.punch_in), "HH:mm")}</p></div>
                    <div><p className="text-zinc-500 text-xs mb-0.5">Durée</p><p className="text-green-400 text-sm font-bold">{getElapsed()}</p></div>
                    {activeEntry.machine && <div><p className="text-zinc-500 text-xs mb-0.5">Machine</p><p className="text-white text-sm font-semibold">{activeEntry.machine}</p></div>}
                    {activeEntry.plate_number && <div><p className="text-zinc-500 text-xs mb-0.5">Plaque</p><p className="text-white text-sm font-semibold">{activeEntry.plate_number}</p></div>}
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-3 mt-2">
                {!activeEntry ? (
                  <button onClick={() => navigateTo("punchin")} className="punch-btn w-full h-20 bg-green-600 hover:bg-green-500 text-white text-xl font-bold rounded-2xl flex items-center justify-between px-7 glow-green">
                    <div className="flex items-center gap-3"><Clock size={24} /><span>PUNCH IN</span></div>
                    <ChevronRight size={22} />
                  </button>
                ) : (
                  <>
                    <button onClick={() => navigateTo("changeproject")} className="punch-btn w-full h-16 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-base font-bold rounded-2xl flex items-center justify-between px-6">
                      <div className="flex items-center gap-3"><ChevronRight size={20} className="text-zinc-400" /><span>CHANGER DE PROJET</span></div>
                      <ChevronRight size={20} className="text-zinc-500" />
                    </button>
                    <button onClick={() => navigateTo("punchout")} className="punch-btn w-full h-20 bg-red-700 hover:bg-red-600 text-white text-xl font-bold rounded-2xl flex items-center justify-between px-7 glow-red">
                      <div className="flex items-center gap-3"><Clock size={24} /><span>PUNCH OUT</span></div>
                      <ChevronRight size={22} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Punch() {
  const [currentUser] = useState(getStoredUser);
  const [activeEntry, setActiveEntry] = useState(getStoredEntry);

  useEffect(() => {
    if (!currentUser) return;
    const refresh = () => {
      base44.entities.PunchEntry.filter({ user_id: currentUser.id }).then(entries => {
        const entry = entries ? entries.find(e => !e.punch_out) : null;
        setActiveEntry(entry || null);
        setStoredEntry(entry || null);
      });
    };
    refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [currentUser?.id]);

  const handleSetActiveEntry = (entry) => {
    setActiveEntry(entry);
    setStoredEntry(entry);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("logipunch_user");
    sessionStorage.removeItem("logipunch_active_entry");
    window.dispatchEvent(new Event("logipunch_user_change"));
    window.location.reload();
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-start">
      <PunchDashboard user={currentUser} activeEntry={activeEntry} setActiveEntry={handleSetActiveEntry} onLogout={handleLogout} />
    </div>
  );
}