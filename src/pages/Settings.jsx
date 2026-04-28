import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, FolderOpen, Building2, ShieldCheck, Tag, AlertTriangle, ChevronRight } from "lucide-react";
import CompanySettingsTab from "@/components/company/CompanySettingsTab";
import UsersTab from "@/components/settings/UsersTab";
import ProjectsTab from "@/components/settings/ProjectsTab";
import ApprovalsTab from "@/components/settings/ApprovalsTab";
import CategoriesTab from "@/components/settings/CategoriesTab";

function getStoredCompany() {
  try { return JSON.parse(sessionStorage.getItem("logipunch_company") || "null"); } catch { return null; }
}
function getStoredUser() {
  try { return JSON.parse(sessionStorage.getItem("logipunch_user") || "null"); } catch { return null; }
}

const ADMIN_ROLES = ["Administrateur", "Surintendant", "Chargé de projet"];
const isAdminUser = (user) => user?.is_admin === true || ADMIN_ROLES.includes(user?.role);

const NAV_ITEMS = [
  { key: "users",     label: "Utilisateurs",  icon: Users,       desc: "Gérer les employés et accès" },
  { key: "projects",  label: "Projets",        icon: FolderOpen,  desc: "Chantiers et assignations" },
  { key: "approvals", label: "Approbations",   icon: ShieldCheck, desc: "Qui approuve qui" },
  { key: "categories",label: "Rôles & Groupes",icon: Tag,         desc: "Catégories d'employés" },
  { key: "company",   label: "Entreprise",     icon: Building2,   desc: "Infos et logo" },
];

export default function Settings() {
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState(getStoredCompany);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const currentUser = getStoredUser();
  const adminAccess = currentUser && isAdminUser(currentUser);

  useEffect(() => { if (adminAccess) loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const companyId = company?.id;
    const [u, p] = await Promise.all([
      companyId ? base44.entities.AppUser.filter({ company_id: companyId }) : base44.entities.AppUser.list(),
      companyId ? base44.entities.Project.filter({ company_id: companyId }) : base44.entities.Project.list(),
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

  const activeItem = NAV_ITEMS.find(n => n.key === tab);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-zinc-800 bg-zinc-950 min-h-screen pt-6 px-3 pb-8">
        <p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold px-2 mb-3">Réglages</p>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${
                tab === key
                  ? "bg-green-900/30 text-green-400 border border-green-800/40"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              }`}
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Danger Zone */}
        <div className="mt-auto pt-6 border-t border-zinc-800/60">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle size={12} className="text-red-500" />
            <p className="text-red-500 text-xs font-bold">Zone de danger</p>
          </div>
          <button
            onClick={async () => {
              if (!window.confirm("Désactiver votre compte? Vous ne pourrez plus vous connecter.")) return;
              await base44.entities.AppUser.update(currentUser.id, { is_active: false });
              sessionStorage.removeItem("logipunch_user");
              window.dispatchEvent(new Event("logipunch_user_change"));
              window.location.reload();
            }}
            className="w-full px-3 py-2 bg-red-900/20 border border-red-700/30 text-red-400 text-xs font-semibold rounded-xl hover:bg-red-900/40 transition-all"
          >
            Désactiver mon compte
          </button>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="md:hidden border-b border-zinc-800 bg-zinc-950 px-4 py-3">
        <button
          onClick={() => setMobileNavOpen(v => !v)}
          className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3"
        >
          <div className="flex items-center gap-3">
            {activeItem && <activeItem.icon size={16} className="text-green-400" />}
            <span className="text-white font-semibold text-sm">{activeItem?.label}</span>
          </div>
          <ChevronRight size={16} className={`text-zinc-500 transition-transform ${mobileNavOpen ? "rotate-90" : ""}`} />
        </button>
        {mobileNavOpen && (
          <div className="mt-2 flex flex-col gap-1">
            {NAV_ITEMS.map(({ key, label, icon: Icon, desc }) => (
              <button
                key={key}
                onClick={() => { setTab(key); setMobileNavOpen(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${
                  tab === key
                    ? "bg-green-900/30 text-green-400 border border-green-800/40"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                <Icon size={16} className="shrink-0" />
                <div>
                  <p>{label}</p>
                  <p className="text-xs font-normal text-zinc-600">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8 max-w-3xl">
        {/* Section header */}
        <div className="mb-6">
          <h1 className="text-white text-xl font-bold">{activeItem?.label}</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{activeItem?.desc}</p>
        </div>

        {loading && tab !== "company" && (
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <div className="w-4 h-4 border-2 border-zinc-700 border-t-green-500 rounded-full animate-spin" />
            Chargement...
          </div>
        )}

        {!loading && (
          <>
            {tab === "users" && <UsersTab users={users} projects={projects} companyId={company?.id} onRefresh={loadAll} />}
            {tab === "projects" && <ProjectsTab projects={projects} users={users} companyId={company?.id} onRefresh={loadAll} />}
            {tab === "approvals" && <ApprovalsTab users={users} onRefresh={loadAll} />}
            {tab === "categories" && <CategoriesTab users={users} companyId={company?.id} onRefresh={loadAll} />}
            {tab === "company" && company && <CompanySettingsTab company={company} onUpdated={(c) => setCompany(c)} />}
          </>
        )}
      </main>
    </div>
  );
}