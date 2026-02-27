import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Clock, CheckSquare, BarChart2, Users, Settings, User } from "lucide-react";
import { useState, useEffect } from "react";

const ADMIN_ROLES = ["Administrateur", "Surintendant", "Chargé de projet", "Gestionnaire Chauffeur", "Gestionnaire Cour", "Gestionnaire Mécanique", "Contremaitre", "Estimateur"];

const allNavItems = [
  { label: "Punch", page: "Punch", icon: Clock, public: true },
  { label: "Mes heures", page: "MyHours", icon: User, public: true },
  { label: "Approbation", page: "Approvals", icon: CheckSquare, adminOnly: true },
  { label: "Heures", page: "TimeSheet", icon: BarChart2, adminOnly: true },
  { label: "Actifs", page: "ActiveUsers", icon: Users, adminOnly: true },
  { label: "Réglages", page: "Settings", icon: Settings, adminOnly: true },
];

export default function Layout({ children, currentPageName }) {
  const [currentRole, setCurrentRole] = useState(() => sessionStorage.getItem("logipunch_role") || null);

  useEffect(() => {
    const handler = () => setCurrentRole(sessionStorage.getItem("logipunch_role") || null);
    window.addEventListener("logipunch_role_change", handler);
    return () => window.removeEventListener("logipunch_role_change", handler);
  }, []);

  const isAdmin = currentRole && ADMIN_ROLES.includes(currentRole);
  const navItems = allNavItems.filter(item => item.public || isAdmin);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <style>{`
        body { background: #0a0a0a; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #22c55e55; }
      `}</style>

      {/* Top logo bar for desktop */}
      <div className="hidden md:flex items-center justify-between px-6 py-3 bg-[#0d0d0d] border-b border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center">
            <span className="text-white font-black text-sm">L</span>
          </div>
          <span className="text-white font-black text-lg tracking-tight">LOGIPUNCH</span>
        </div>
        <nav className="flex items-center gap-1">
          {navItems.map(({ label, page, icon: Icon }) => {
            const isActive = currentPageName === page;
            return (
              <Link
                key={page}
                to={createPageUrl(page)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive ? "bg-green-700 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>

      {/* Bottom nav for mobile/tablet */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0d0d0d] border-t border-zinc-800/60 flex z-50">
        {navItems.map(({ label, page, icon: Icon }) => {
          const isActive = currentPageName === page;
          return (
            <Link
              key={page}
              to={createPageUrl(page)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all ${
                isActive ? "text-green-400" : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[9px] font-semibold">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}