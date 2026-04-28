import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Edit2, Trash2, FolderOpen, MapPin } from "lucide-react";
import ProjectFormDrawer from "./ProjectFormDrawer";

export default function ProjectsTab({ projects, users, companyId, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editProject, setEditProject] = useState(null);

  const activeProjects = projects.filter(p => p.is_active !== false);

  const handleDelete = async (pid) => {
    if (!window.confirm("Désactiver ce projet?")) return;
    await base44.entities.Project.update(pid, { is_active: false });
    onRefresh();
  };

  return (
    <div>
      {/* Stats bar */}
      <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 mb-5">
        <FolderOpen size={16} className="text-green-400" />
        <span className="text-white font-bold text-lg">{activeProjects.length}</span>
        <span className="text-zinc-500 text-sm">projets actifs</span>
        <button
          onClick={() => { setEditProject(null); setShowForm(true); }}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-all"
        >
          <Plus size={15} /> Ajouter
        </button>
      </div>

      <div className="space-y-2">
        {activeProjects.map(project => (
          <div key={project.id} className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition-all">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white font-semibold">{project.name}</p>
                  <span className="text-zinc-500 text-xs font-mono bg-zinc-800 px-2 py-0.5 rounded-full">{project.project_number}</span>
                </div>
                {project.address && (
                  <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                    <MapPin size={11} />
                    <span>{project.address}</span>
                  </div>
                )}
                <p className="text-zinc-600 text-xs mt-1.5">
                  {(project.assigned_users || []).length} employé(s) assigné(s)
                </p>
              </div>
              <div className="flex gap-2 shrink-0 ml-3">
                <button onClick={() => { setEditProject(project); setShowForm(true); }} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all">
                  <Edit2 size={14} className="text-zinc-400" />
                </button>
                <button onClick={() => handleDelete(project.id)} className="p-2 bg-red-900/20 hover:bg-red-900/40 rounded-lg transition-all">
                  <Trash2 size={14} className="text-red-500" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {activeProjects.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-10">Aucun projet actif.</p>
        )}
      </div>

      <ProjectFormDrawer
        open={showForm}
        project={editProject}
        users={users}
        companyId={companyId}
        onClose={() => { setShowForm(false); setEditProject(null); }}
        onSaved={() => { setShowForm(false); setEditProject(null); onRefresh(); }}
      />
    </div>
  );
}