import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek } from "date-fns";

const AUTO_APPROVE_ROLES = ["Administrateur", "Surintendant", "Chargé de projet"];

export default function PunchInForm({ user, projects, onSuccess, onBack }) {
  const [selectedProject, setSelectedProject] = useState("");
  const [machine, setMachine] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const needsMachine = user.role === "Opérateur";
  const needsPlate = user.role === "Chauffeur";
  const needsProject = ["Manœuvre", "Opérateur", "Estimateur", "Chauffeur"].includes(user.role);

  // Mécano only gets Mécanique project
  const availableProjects = user.role === "Mécano"
    ? projects.filter(p => p.name === "Mécanique" || p.project_number === "26-MEC")
    : projects;

  const canSubmit = selectedProject &&
    (!needsMachine || machine) &&
    (!needsPlate || plateNumber);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    const project = projects.find(p => p.id === selectedProject);
    const now = new Date();
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");

    const entry = {
      user_id: user.id,
      user_name: user.full_name,
      project_id: selectedProject,
      project_name: project?.name || "",
      punch_in: now.toISOString(),
      status: AUTO_APPROVE_ROLES.includes(user.role) ? "approved" : "active",
      week_start: weekStart,
      work_date: format(now, "yyyy-MM-dd"),
      group: user.group,
      role: user.role,
      lunch_break: 0,
    };
    if (needsMachine) entry.machine = machine;
    if (needsPlate) entry.plate_number = plateNumber;

    const created = await base44.entities.PunchEntry.create(entry);
    onSuccess(created);
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col max-w-md mx-auto px-4 py-6">
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft size={18} />
        <span className="text-sm">Retour</span>
      </button>

      <h2 className="text-white text-2xl font-bold mb-1">Punch In</h2>
      <p className="text-zinc-500 text-sm mb-6">{user.full_name} · {user.role}</p>

      {/* Project Selection */}
      <div className="mb-4">
        <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Sélectionner un projet *</label>
        <div className="flex flex-col gap-2">
          {availableProjects.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedProject(p.id)}
              className={`w-full p-4 rounded-2xl border text-left transition-all ${
                selectedProject === p.id
                  ? "bg-green-900/30 border-green-600 text-white"
                  : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{p.project_number} {p.address ? `· ${p.address}` : ""}</p>
                </div>
                {selectedProject === p.id && (
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Machine (Opérateur) */}
      {needsMachine && (
        <div className="mb-4">
          <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Machine utilisée *</label>
          <input
            value={machine}
            onChange={e => setMachine(e.target.value)}
            placeholder="Ex: Excavatrice 320, Compacteur..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-600 text-sm"
          />
        </div>
      )}

      {/* Plate Number (Chauffeur) */}
      {needsPlate && (
        <div className="mb-4">
          <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Numéro de plaque *</label>
          <input
            value={plateNumber}
            onChange={e => setPlateNumber(e.target.value.toUpperCase())}
            placeholder="Ex: ABC-1234"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-600 text-sm font-mono"
          />
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || loading}
        className={`mt-4 w-full h-14 rounded-2xl font-bold text-base transition-all flex items-center justify-between px-6 ${
          canSubmit && !loading
            ? "bg-green-600 hover:bg-green-500 text-white glow-green"
            : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
        }`}
      >
        <span>{loading ? "Enregistrement..." : "CONFIRMER PUNCH IN"}</span>
        {!loading && <ChevronRight size={20} />}
      </button>
    </div>
  );
}