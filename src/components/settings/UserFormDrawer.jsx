import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X } from "lucide-react";

const EXTRA_PAGES = [
  { key: "DailyReports", label: "Rapports" },
  { key: "Approvals", label: "Approbation" },
  { key: "ForceCheckout", label: "Gestion pointages" },
  { key: "TimeSheet", label: "Heures" },
  { key: "ActiveUsers", label: "Actifs" },
  { key: "Settings", label: "Réglages" },
];

export default function UserFormDrawer({ open, user, projects, users, companyId, onClose, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      full_name: user?.full_name || "",
      pin_code: user?.pin_code || "",
      phone: user?.phone || "",
      role: user?.role || "",
      group: user?.group || "",
      is_active: user?.is_active !== false,
      is_admin: user?.is_admin || false,
      allowed_pages: user?.allowed_pages || [],
      assigned_projects: user?.assigned_projects || [],
    });
  }, [user, open]);

  if (!open) return null;

  const existingRoles = [...new Set(users.filter(u => u.role).map(u => u.role))];
  const existingGroups = [...new Set(users.filter(u => u.group).map(u => u.group))];

  const togglePage = (key) => setForm(f => ({
    ...f,
    allowed_pages: f.allowed_pages?.includes(key)
      ? f.allowed_pages.filter(p => p !== key)
      : [...(f.allowed_pages || []), key],
  }));

  const toggleProject = (pid) => setForm(f => ({
    ...f,
    assigned_projects: f.assigned_projects?.includes(pid)
      ? f.assigned_projects.filter(id => id !== pid)
      : [...(f.assigned_projects || []), pid],
  }));

  const handleSave = async () => {
    if (!form.full_name || !form.pin_code) return;
    setSaving(true);
    if (user) {
      await base44.entities.AppUser.update(user.id, form);
    } else {
      await base44.entities.AppUser.create({ ...form, ...(companyId ? { company_id: companyId } : {}) });
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
          <h2 className="text-white font-bold text-lg">{user ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Basic info */}
          <section>
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold mb-3">Informations</p>
            <div className="space-y-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1.5 block">Nom complet *</label>
                <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs mb-1.5 block">Code PIN (4 chiffres) *</label>
                  <input value={form.pin_code} onChange={e => setForm(f => ({ ...f, pin_code: e.target.value }))} maxLength={4}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-green-600" />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs mb-1.5 block">Téléphone SMS</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="5141234567"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-green-600 placeholder:text-zinc-600" />
                </div>
              </div>
            </div>
          </section>

          {/* Role */}
          <section>
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold mb-3">Rôle *</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {existingRoles.map(r => (
                <button key={r} type="button" onClick={() => setForm(f => ({ ...f, role: r }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${form.role === r ? "bg-green-900/40 border-green-700/60 text-green-400" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>
                  {r}
                </button>
              ))}
            </div>
            <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              placeholder="Ou saisir un nouveau rôle..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600 placeholder:text-zinc-600" />
          </section>

          {/* Group */}
          <section>
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold mb-3">Groupe *</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {existingGroups.map(g => (
                <button key={g} type="button" onClick={() => setForm(f => ({ ...f, group: g }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${form.group === g ? "bg-green-900/40 border-green-700/60 text-green-400" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>
                  {g}
                </button>
              ))}
            </div>
            <input value={form.group} onChange={e => setForm(f => ({ ...f, group: e.target.value }))}
              placeholder="Ou saisir un nouveau groupe..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600 placeholder:text-zinc-600" />
          </section>

          {/* Admin toggle */}
          <section>
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold mb-3">Permissions</p>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, is_admin: !f.is_admin }))}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${form.is_admin ? "bg-green-900/20 border-green-700/50" : "bg-zinc-900 border-zinc-700"}`}
            >
              <div>
                <p className={`font-semibold text-sm ${form.is_admin ? "text-green-400" : "text-zinc-300"}`}>Administrateur</p>
                <p className="text-zinc-600 text-xs">Accès complet à toutes les fonctionnalités</p>
              </div>
              <div className={`w-10 h-5 rounded-full transition-all relative ${form.is_admin ? "bg-green-600" : "bg-zinc-700"}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.is_admin ? "left-5" : "left-0.5"}`} />
              </div>
            </button>

            {!form.is_admin && (
              <div className="mt-3">
                <p className="text-zinc-600 text-xs mb-2">Pages accessibles (Punch + Mes heures toujours inclus) :</p>
                <div className="flex flex-wrap gap-2">
                  {EXTRA_PAGES.map(p => (
                    <button key={p.key} type="button" onClick={() => togglePage(p.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${(form.allowed_pages || []).includes(p.key) ? "bg-green-900/40 border-green-700/60 text-green-400" : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Projects */}
          {projects.length > 0 && (
            <section>
              <p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold mb-3">Projets assignés</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {projects.filter(p => p.is_active !== false).map(p => (
                  <button key={p.id} onClick={() => toggleProject(p.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all border ${
                      (form.assigned_projects || []).includes(p.id)
                        ? "bg-green-900/30 border-green-700/50 text-green-400"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    <span>{p.name}</span>
                    <span className="text-xs opacity-50 font-mono">{p.project_number}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex gap-3">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-semibold hover:bg-zinc-700 transition-all">
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving || !form.full_name || !form.pin_code}
            className="flex-1 h-11 rounded-xl bg-green-700 hover:bg-green-600 text-white text-sm font-bold transition-all disabled:opacity-40">
            {saving ? "..." : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );
}