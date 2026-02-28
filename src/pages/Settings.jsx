import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Edit2, Trash2, X, Users, FolderOpen, ChevronDown, AlertTriangle, Building2, ShieldCheck, Tag, Check } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import CompanySettingsTab from "@/components/company/CompanySettingsTab";

function getStoredCompany() {
  try { return JSON.parse(sessionStorage.getItem("logipunch_company") || "null"); } catch { return null; }
}

function getStoredUser() {
  try { return JSON.parse(sessionStorage.getItem("logipunch_user") || "null"); } catch { return null; }
}

const ADMIN_ROLES = ["Administrateur", "Surintendant", "Chargé de projet"];
const isAdminUser = (user) => user?.is_admin === true || ADMIN_ROLES.includes(user?.role);

export default function Settings() {
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState(getStoredCompany);

  const currentUser = getStoredUser();
  const adminAccess = currentUser && isAdminUser(currentUser);

  useEffect(() => {
    if (adminAccess) loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const companyId = company?.id;
    const [u, p] = await Promise.all([
      companyId
        ? base44.entities.AppUser.filter({ company_id: companyId })
        : base44.entities.AppUser.list(),
      companyId
        ? base44.entities.Project.filter({ company_id: companyId })
        : base44.entities.Project.list(),
    ]);
    setUsers(u);
    setProjects(p);
    setLoading(false);
  };

  if (!adminAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <p className="text-zinc-500">Accès administrateur requis.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white text-2xl font-bold">Réglages</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab("users")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "users" ? "bg-green-700 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
          <Users size={15} /> Utilisateurs
        </button>
        <button onClick={() => setTab("projects")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "projects" ? "bg-green-700 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
          <FolderOpen size={15} /> Projets
        </button>
        <button onClick={() => setTab("company")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "company" ? "bg-green-700 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
          <Building2 size={15} /> Entreprise
        </button>
        <button onClick={() => setTab("approvals")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "approvals" ? "bg-green-700 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
          <ShieldCheck size={15} /> Approbations
        </button>
        <button onClick={() => setTab("roles")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "roles" ? "bg-green-700 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
          <Tag size={15} /> Rôles
        </button>
        <button onClick={() => setTab("groups")} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "groups" ? "bg-green-700 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
          <Users size={15} /> Groupes
        </button>
      </div>

      {tab === "users" && (
        <UsersTab users={users} projects={projects} companyId={company?.id} onRefresh={loadAll} />
      )}
      {tab === "projects" && (
        <ProjectsTab projects={projects} users={users} companyId={company?.id} onRefresh={loadAll} />
      )}
      {tab === "company" && company && (
        <CompanySettingsTab company={company} onUpdated={(c) => { setCompany(c); }} />
      )}
      {tab === "approvals" && (
        <ApprovalsTab users={users} onRefresh={loadAll} />
      )}
      {tab === "roles" && (
        <RolesTab users={users} companyId={company?.id} onRefresh={loadAll} />
      )}
      {tab === "groups" && (
        <GroupsTab users={users} companyId={company?.id} onRefresh={loadAll} />
      )}

      {/* Danger Zone */}
      <div className="mt-10 border-t border-zinc-800/60 pt-6">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={14} className="text-red-500" />
          <h2 className="text-red-500 font-bold text-sm">Zone de danger</h2>
        </div>
        <p className="text-zinc-600 text-xs mb-4">Désactiver votre compte vous empêchera de vous connecter.</p>
        <button
          onClick={async () => {
            if (!window.confirm("Désactiver votre compte? Vous ne pourrez plus vous connecter.")) return;
            await base44.entities.AppUser.update(currentUser.id, { is_active: false });
            sessionStorage.removeItem("logipunch_user");
            window.dispatchEvent(new Event("logipunch_user_change"));
            window.location.reload();
          }}
          className="px-4 py-2 bg-red-900/20 border border-red-700/40 text-red-400 text-sm font-semibold rounded-xl hover:bg-red-900/40 transition-all"
        >
          Désactiver mon compte
        </button>
      </div>
    </div>
  );
}

function BottomSelect({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm text-left flex items-center justify-between"
      >
        <span>{value || label}</span>
        <ChevronDown size={14} className="text-zinc-500" />
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="bg-zinc-900 border-t border-zinc-700">
          <DrawerHeader>
            <DrawerTitle className="text-white text-left">{label}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8 space-y-2 max-h-[65vh] overflow-y-auto">
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full px-4 py-3 rounded-xl text-sm font-semibold text-left transition-all border ${
                  value === opt
                    ? "bg-green-900/30 border-green-700/50 text-green-400"
                    : "bg-zinc-800 border-zinc-800 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function UsersTab({ users, projects, companyId, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const handleDelete = async (userId) => {
    if (!window.confirm("Supprimer cet utilisateur?")) return;
    await base44.entities.AppUser.update(userId, { is_active: false });
    onRefresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-zinc-400 text-sm">{users.filter(u => u.is_active !== false).length} utilisateurs actifs</p>
        <button onClick={() => { setEditUser(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-all">
          <Plus size={15} /> Ajouter
        </button>
      </div>

      {showForm && (
        <UserForm user={editUser} projects={projects} users={users} companyId={companyId} onClose={() => { setShowForm(false); setEditUser(null); }} onSaved={() => { setShowForm(false); setEditUser(null); onRefresh(); }} />
      )}

      <div className="space-y-2">
        {users.filter(u => u.is_active !== false).map(user => (
          <div key={user.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <span className="text-white font-bold text-sm">{user.full_name[0]}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white font-semibold text-sm">{user.full_name}</p>
                  <span className="text-zinc-600 text-xs font-mono">#{user.pin_code}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="px-2 py-0.5 bg-green-900/30 border border-green-700/30 text-green-400 text-xs rounded-full">{user.role}</span>
                  <span className="px-2 py-0.5 bg-zinc-800 text-zinc-500 text-xs rounded-full">{user.group}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditUser(user); setShowForm(true); }} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all">
                <Edit2 size={14} className="text-zinc-400" />
              </button>
              <button onClick={() => handleDelete(user.id)} className="p-2 bg-red-900/30 hover:bg-red-900/50 rounded-lg transition-all">
                <Trash2 size={14} className="text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const EXTRA_PAGES = [
  { key: "Approvals", label: "Approbation" },
  { key: "TimeSheet", label: "Heures" },
  { key: "ActiveUsers", label: "Actifs" },
  { key: "Settings", label: "Réglages" },
];

function UserForm({ user, projects, users, companyId, onClose, onSaved }) {
  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    pin_code: user?.pin_code || "",
    phone: user?.phone || "",
    role: user?.role || "",
    group: user?.group || "",
    is_active: user?.is_active !== false,
    is_admin: user?.is_admin || false,
    allowed_pages: user?.allowed_pages || [],
    assigned_projects: user?.assigned_projects || [],
    approves_users: user?.approves_users || [],
    approved_by: Array.isArray(user?.approved_by) ? user.approved_by : (user?.approved_by ? [user.approved_by] : []),
  });

  const togglePage = (key) => {
    setForm(f => ({
      ...f,
      allowed_pages: f.allowed_pages.includes(key)
        ? f.allowed_pages.filter(p => p !== key)
        : [...f.allowed_pages, key],
    }));
  };
  const [saving, setSaving] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [newGroup, setNewGroup] = useState("");

  const existingRoles = [...new Set(users.filter(u => u.role).map(u => u.role))];
  const existingGroups = [...new Set(users.filter(u => u.group).map(u => u.group))];

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

  const toggleProject = (pid) => {
    setForm(f => ({
      ...f,
      assigned_projects: f.assigned_projects.includes(pid)
        ? f.assigned_projects.filter(id => id !== pid)
        : [...f.assigned_projects, pid],
    }));
  };

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold">{user ? "Modifier" : "Nouvel"} utilisateur</h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={18} /></button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Nom complet *</label>
          <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600" />
        </div>
        <div>
          <label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Code PIN (4 chiffres) *</label>
          <input value={form.pin_code} onChange={e => setForm(f => ({ ...f, pin_code: e.target.value }))} maxLength={4} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-green-600" />
        </div>
        <div>
          <label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Téléphone (pour SMS)</label>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Ex: 5141234567" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-green-600 placeholder:text-zinc-600" />
        </div>
        <div>
          <label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Rôle *</label>
          {existingRoles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {existingRoles.map(r => (
                <button key={r} type="button" onClick={() => setForm(f => ({ ...f, role: r }))}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${form.role === r ? "bg-green-900/40 border-green-700/60 text-green-400" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>
                  {r}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input value={form.role === existingRoles.find(r => r === form.role) ? form.role : form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              placeholder="Nouveau rôle ou sélectionner ci-dessus"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600 placeholder:text-zinc-600" />
          </div>
        </div>
        <div>
          <label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Groupe *</label>
          {existingGroups.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {existingGroups.map(g => (
                <button key={g} type="button" onClick={() => setForm(f => ({ ...f, group: g }))}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${form.group === g ? "bg-green-900/40 border-green-700/60 text-green-400" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>
                  {g}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input value={form.group} onChange={e => setForm(f => ({ ...f, group: e.target.value }))}
              placeholder="Nouveau groupe ou sélectionner ci-dessus"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600 placeholder:text-zinc-600" />
          </div>
        </div>
      </div>
      <div className="mb-4">
        <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Accès aux pages</label>
        <p className="text-zinc-600 text-xs mb-2">Punch et Mes heures sont toujours accessibles. Les admins ont accès à tout.</p>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800/50 border border-zinc-700/50 text-zinc-600">Punch ✓</span>
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800/50 border border-zinc-700/50 text-zinc-600">Mes heures ✓</span>
          {EXTRA_PAGES.map(p => (
            <button key={p.key} type="button" onClick={() => togglePage(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${form.allowed_pages.includes(p.key) ? "bg-green-900/40 border-green-700/60 text-green-400" : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Projets assignés</label>
        <div className="flex flex-wrap gap-2">
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => toggleProject(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                form.assigned_projects.includes(p.id)
                  ? "bg-green-900/40 border-green-700/60 text-green-400"
                  : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 h-10 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-semibold hover:bg-zinc-700 transition-all">Annuler</button>
        <button onClick={handleSave} disabled={saving || !form.full_name || !form.pin_code} className="flex-1 h-10 rounded-xl bg-green-700 hover:bg-green-600 text-white text-sm font-bold transition-all disabled:opacity-40">
          {saving ? "..." : "Sauvegarder"}
        </button>
      </div>
    </div>
  );
}

function ProjectsTab({ projects, users, companyId, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editProject, setEditProject] = useState(null);

  const handleDelete = async (pid) => {
    if (!window.confirm("Supprimer ce projet?")) return;
    await base44.entities.Project.update(pid, { is_active: false });
    onRefresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-zinc-400 text-sm">{projects.filter(p => p.is_active !== false).length} projets actifs</p>
        <button onClick={() => { setEditProject(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-all">
          <Plus size={15} /> Ajouter
        </button>
      </div>

      {showForm && (
        <ProjectForm project={editProject} users={users} companyId={companyId} onClose={() => { setShowForm(false); setEditProject(null); }} onSaved={() => { setShowForm(false); setEditProject(null); onRefresh(); }} />
      )}

      <div className="space-y-2">
        {projects.filter(p => p.is_active !== false).map(project => (
          <div key={project.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white font-semibold">{project.name}</p>
                  <span className="text-zinc-500 text-xs font-mono">{project.project_number}</span>
                </div>
                {project.address && <p className="text-zinc-500 text-xs">{project.address}</p>}
                <p className="text-zinc-600 text-xs mt-1">{(project.assigned_users || []).length} utilisateur(s) assigné(s)</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditProject(project); setShowForm(true); }} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all">
                  <Edit2 size={14} className="text-zinc-400" />
                </button>
                <button onClick={() => handleDelete(project.id)} className="p-2 bg-red-900/30 hover:bg-red-900/50 rounded-lg transition-all">
                  <Trash2 size={14} className="text-red-500" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApprovalsTab({ users, onRefresh }) {
  const activeUsers = users.filter(u => u.is_active !== false);
  const [saving, setSaving] = useState(false);
  // Local state: map of workerId -> approverId
  const [assignments, setAssignments] = useState(() => {
    const map = {};
    activeUsers.forEach(u => {
      // Support both old string and new array format
      if (Array.isArray(u.approved_by)) map[u.id] = u.approved_by;
      else if (u.approved_by) map[u.id] = [u.approved_by];
      else map[u.id] = [];
    });
    return map;
  });

  const handleSave = async () => {
    setSaving(true);
    await Promise.all(
      activeUsers.map(u => {
        const approverIds = assignments[u.id] || [];
        const validArray = Array.isArray(approverIds) ? approverIds : [];
        return base44.entities.AppUser.update(u.id, { approved_by: validArray });
      })
    );
    setSaving(false);
    onRefresh();
  };

  const toggleApprover = (workerId, approverId) => {
    setAssignments(a => {
      const current = a[workerId] || [];
      return {
        ...a,
        [workerId]: current.includes(approverId)
          ? current.filter(id => id !== approverId)
          : [...current, approverId],
      };
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-white font-semibold">Associations approbateur → employé</p>
          <p className="text-zinc-500 text-xs mt-0.5">Définissez qui approuve les heures de chaque employé (plusieurs possibles)</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50">
          {saving ? "..." : "Sauvegarder"}
        </button>
      </div>

      <div className="space-y-3">
        {activeUsers.map(worker => {
          const selected = assignments[worker.id] || [];
          return (
            <div key={worker.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold text-sm">{worker.full_name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="px-2 py-0.5 bg-green-900/30 border border-green-700/30 text-green-400 text-xs rounded-full">{worker.role}</span>
                    <span className="px-2 py-0.5 bg-zinc-800 text-zinc-500 text-xs rounded-full">{worker.group}</span>
                  </div>
                </div>
                <span className="text-zinc-600 text-xs flex-shrink-0">approuvé par</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeUsers.filter(u => u.id !== worker.id).map(approver => (
                  <button
                    key={approver.id}
                    onClick={() => toggleApprover(worker.id, approver.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      selected.includes(approver.id)
                        ? "bg-green-900/40 border-green-700/60 text-green-400"
                        : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500"
                    }`}
                  >
                    {approver.full_name}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RolesTab({ users, companyId, onRefresh }) {
  const existingRoles = [...new Set(users.filter(u => u.role).map(u => u.role))].sort();
  const [newRole, setNewRole] = useState("");
  const [editingRole, setEditingRole] = useState(null); // { original, value }
  const [saving, setSaving] = useState(false);

  const usersWithRole = (role) => users.filter(u => u.role === role);

  const handleAddRole = () => {
    const trimmed = newRole.trim();
    if (!trimmed || existingRoles.includes(trimmed)) return;
    setNewRole("");
    // Roles exist via users - just show confirmation; user can assign when editing a user
    alert(`Rôle "${trimmed}" ajouté. Assignez-le à un utilisateur pour le voir dans la liste.`);
  };

  const handleRename = async (original, newName) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === original) { setEditingRole(null); return; }
    setSaving(true);
    const affected = usersWithRole(original);
    await Promise.all(affected.map(u => base44.entities.AppUser.update(u.id, { role: trimmed })));
    setSaving(false);
    setEditingRole(null);
    onRefresh();
  };

  const handleDelete = async (role) => {
    const affected = usersWithRole(role);
    const msg = affected.length > 0
      ? `Supprimer le rôle "${role}"? Les ${affected.length} utilisateur(s) avec ce rôle auront leur rôle vidé.`
      : `Supprimer le rôle "${role}"?`;
    if (!window.confirm(msg)) return;
    setSaving(true);
    await Promise.all(affected.map(u => base44.entities.AppUser.update(u.id, { role: "" })));
    setSaving(false);
    onRefresh();
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-white font-semibold mb-1">Gestion des rôles</p>
        <p className="text-zinc-500 text-xs">Les rôles sont partagés entre tous les utilisateurs du portail.</p>
      </div>

      {/* Add new role */}
      <div className="flex gap-2 mb-6">
        <input
          value={newRole}
          onChange={e => setNewRole(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAddRole()}
          placeholder="Nouveau rôle..."
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600 placeholder:text-zinc-600"
        />
        <button
          onClick={handleAddRole}
          disabled={!newRole.trim()}
          className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-40 flex items-center gap-2"
        >
          <Plus size={15} /> Ajouter
        </button>
      </div>

      {saving && <p className="text-zinc-500 text-sm text-center py-4 animate-pulse">Mise à jour...</p>}

      <div className="space-y-2">
        {existingRoles.map(role => {
          const count = usersWithRole(role).length;
          const isEditing = editingRole?.original === role;
          return (
            <div key={role} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
              <div className="flex-1">
                {isEditing ? (
                  <input
                    autoFocus
                    value={editingRole.value}
                    onChange={e => setEditingRole(r => ({ ...r, value: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === "Enter") handleRename(role, editingRole.value);
                      if (e.key === "Escape") setEditingRole(null);
                    }}
                    className="w-full bg-zinc-800 border border-green-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none"
                  />
                ) : (
                  <div>
                    <span className="text-white font-semibold text-sm">{role}</span>
                    <span className="text-zinc-600 text-xs ml-2">{count} utilisateur{count !== 1 ? "s" : ""}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button onClick={() => handleRename(role, editingRole.value)} className="p-2 bg-green-900/40 hover:bg-green-800/60 border border-green-700/40 rounded-lg transition-all">
                      <Check size={14} className="text-green-400" />
                    </button>
                    <button onClick={() => setEditingRole(null)} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all">
                      <X size={14} className="text-zinc-400" />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setEditingRole({ original: role, value: role })} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all">
                      <Edit2 size={14} className="text-zinc-400" />
                    </button>
                    <button onClick={() => handleDelete(role)} className="p-2 bg-red-900/30 hover:bg-red-900/50 rounded-lg transition-all">
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {existingRoles.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-8">Aucun rôle défini.</p>
        )}
      </div>
    </div>
  );
}

function ProjectForm({ project, users, companyId, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: project?.name || "",
    project_number: project?.project_number || "",
    address: project?.address || "",
    is_active: project?.is_active !== false,
    assigned_users: project?.assigned_users || [],
  });
  const [saving, setSaving] = useState(false);

  const toggleUser = (uid) => {
    setForm(f => ({
      ...f,
      assigned_users: f.assigned_users.includes(uid)
        ? f.assigned_users.filter(id => id !== uid)
        : [...f.assigned_users, uid],
    }));
  };

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
    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold">{project ? "Modifier" : "Nouveau"} projet</h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={18} /></button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Nom du projet *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600" />
        </div>
        <div>
          <label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Numéro de projet *</label>
          <input value={form.project_number} onChange={e => setForm(f => ({ ...f, project_number: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-green-600" />
        </div>
        <div className="md:col-span-2">
          <label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Adresse</label>
          <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600" />
        </div>
      </div>
      <div className="mb-4">
        <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Utilisateurs assignés</label>
        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
          {users.filter(u => u.is_active !== false).map(u => (
            <button
              key={u.id}
              onClick={() => toggleUser(u.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all border ${
                form.assigned_users.includes(u.id)
                  ? "bg-green-900/30 border-green-700/50 text-green-400"
                  : "bg-zinc-800 border-zinc-800 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              <span>{u.full_name}</span>
              <span className="text-xs opacity-60">{u.role}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 h-10 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-semibold hover:bg-zinc-700 transition-all">Annuler</button>
        <button onClick={handleSave} disabled={saving || !form.name || !form.project_number} className="flex-1 h-10 rounded-xl bg-green-700 hover:bg-green-600 text-white text-sm font-bold transition-all disabled:opacity-40">
          {saving ? "..." : "Sauvegarder"}
        </button>
      </div>
    </div>
  );
}