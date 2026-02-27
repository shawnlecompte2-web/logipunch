import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { LogOut, Clock, ChevronRight, Car, Wrench } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import PunchInForm from "./PunchInForm";
import PunchOutForm from "./PunchOutForm";
import ChangeProjectForm from "./ChangeProjectForm";

const AUTO_APPROVE_ROLES = ["Administrateur", "Surintendant", "Chargé de projet"];

export default function PunchDashboard({ user, activeEntry, setActiveEntry, onLogout }) {
  const [view, setView] = useState("main"); // main | punchin | punchout | changeproject
  const [projects, setProjects] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [user]);

  const loadProjects = async () => {
    const allProjects = await base44.entities.Project.filter({ is_active: true });
    // Filter by assigned projects if user has restrictions
    if (user.assigned_projects && user.assigned_projects.length > 0) {
      setProjects(allProjects.filter(p => user.assigned_projects.includes(p.id)));
    } else {
      setProjects(allProjects);
    }
  };

  const getElapsed = () => {
    if (!activeEntry?.punch_in) return null;
    const diff = (currentTime - new Date(activeEntry.punch_in)) / 1000 / 60;
    const h = Math.floor(diff / 60);
    const m = Math.floor(diff % 60);
    return `${h}h ${m.toString().padStart(2, "0")}m`;
  };

  if (view === "punchin") return (
    <PunchInForm user={user} projects={projects} onSuccess={(entry) => { setActiveEntry(entry); setView("main"); }} onBack={() => setView("main")} />
  );
  if (view === "punchout") return (
    <PunchOutForm user={user} activeEntry={activeEntry} onSuccess={() => { setActiveEntry(null); setView("main"); }} onBack={() => setView("main")} />
  );
  if (view === "changeproject") return (
    <ChangeProjectForm user={user} activeEntry={activeEntry} projects={projects} onSuccess={(entry) => { setActiveEntry(entry); setView("main"); }} onBack={() => setView("main")} />
  );

  return (
    <div className="min-h-screen w-full flex flex-col max-w-md mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center">
              <span className="text-white font-black text-xs">L</span>
            </div>
            <span className="text-white font-black text-lg tracking-tight">LOGIPUNCH</span>
          </div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
          <LogOut size={16} />
          <span>Quitter</span>
        </button>
      </div>

      {/* User Card */}
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

      {/* Active Punch Status */}
      {activeEntry && (
        <div className="bg-green-950/40 border border-green-700/40 rounded-2xl p-4 mb-5 glow-green">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-400 text-sm font-semibold">EN COURS</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-zinc-500 text-xs mb-0.5">Projet</p>
              <p className="text-white text-sm font-semibold">{activeEntry.project_name}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-0.5">Début</p>
              <p className="text-white text-sm font-semibold">{format(new Date(activeEntry.punch_in), "HH:mm")}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-0.5">Durée</p>
              <p className="text-green-400 text-sm font-bold">{getElapsed()}</p>
            </div>
            {activeEntry.machine && (
              <div>
                <p className="text-zinc-500 text-xs mb-0.5">Machine</p>
                <p className="text-white text-sm font-semibold">{activeEntry.machine}</p>
              </div>
            )}
            {activeEntry.plate_number && (
              <div>
                <p className="text-zinc-500 text-xs mb-0.5">Plaque</p>
                <p className="text-white text-sm font-semibold">{activeEntry.plate_number}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        {!activeEntry ? (
          <button
            onClick={() => setView("punchin")}
            className="punch-btn w-full h-16 bg-green-600 hover:bg-green-500 text-white text-lg font-bold rounded-2xl flex items-center justify-between px-6 glow-green"
          >
            <div className="flex items-center gap-3">
              <Clock size={22} />
              <span>PUNCH IN</span>
            </div>
            <ChevronRight size={20} />
          </button>
        ) : (
          <>
            <button
              onClick={() => setView("changeproject")}
              className="punch-btn w-full h-16 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-lg font-bold rounded-2xl flex items-center justify-between px-6"
            >
              <div className="flex items-center gap-3">
                <ChevronRight size={22} className="text-zinc-400" />
                <span>CHANGER DE PROJET</span>
              </div>
              <ChevronRight size={20} className="text-zinc-500" />
            </button>
            <button
              onClick={() => setView("punchout")}
              className="punch-btn w-full h-16 bg-red-700 hover:bg-red-600 text-white text-lg font-bold rounded-2xl flex items-center justify-between px-6 glow-red"
            >
              <div className="flex items-center gap-3">
                <Clock size={22} />
                <span>PUNCH OUT</span>
              </div>
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}