import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X } from "lucide-react";

export default function ProjectFormDrawer({ open, project, users, companyId, onClose, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      name: project?.name || "",
      project_number: project?.project_number || "",
      address: project?.address || "",
      latitude: project?.latitude || "",
      longitude: project?.longitude || "",
      is_active: project?.is_active !== false,
      assigned_users: project?.assigned_users || [],
    });
  }, [project, open]);

  if (!open) return null;

  const toggleUser = (uid) => setForm(f => ({
    ...f,
    assigned_users: f.assigned_users?.includes(uid)
      ? f.assigned_users.filter(id => id !== uid)
      : [...(f.assigned_users || []), uid],
  }));

  const handleSave = async () => {
    if (!form.name || !form.project_number) return;
    setSaving(true);
    if (project) {
      await base44.entities.Project.update(project.id, form);
    } else {
      await base44.entities.Project.create({ ...form, ...(companyId ? { company_id: companyId } : {}) });
    }
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-950 border-l border-zinc-800 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          <h2 className="text-white font-bold text-lg">{project ? "Modifier le projet" : "Nouveau projet"}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <section>
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold mb-3">Informations</p>
            <div className="space-y-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1.5 block">Nom du projet *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1.5 block">Numéro de projet *</label>
                <input value={form.project_number} onChange={e => setForm(f => ({ ...f, project_number: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-green-600" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1.5 block">Adresse</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600" />
              </div>
            </div>
          </section>

          <section>
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold mb-3">Coordonnées GPS (optionnel)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1.5 block">Latitude</label>
                <input type="number" step="0.000001" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
                  placeholder="45.5017"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600 placeholder:text-zinc-600" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1.5 block">Longitude</label>
                <input type="number" step="0.000001" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
                  placeholder="-73.5673"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600 placeholder:text-zinc-600" />
              </div>
            </div>
          </section>

          <section>
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold mb-3">Employés assignés</p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {users.filter(u => u.is_active !== false).map(u => (
                <button key={u.id} onClick={() => toggleUser(u.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all border ${
                    (form.assigned_users || []).includes(u.id)
                      ? "bg-green-900/30 border-green-700/50 text-green-400"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  <span>{u.full_name}</span>
                  <span className="text-xs opacity-50">{u.role}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex gap-3">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-semibold hover:bg-zinc-700 transition-all">
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving || !form.name || !form.project_number}
            className="flex-1 h-11 rounded-xl bg-green-700 hover:bg-green-600 text-white text-sm font-bold transition-all disabled:opacity-40">
            {saving ? "..." : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );
}