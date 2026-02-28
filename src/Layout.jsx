import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Clock, CheckSquare, BarChart2, Users, Settings, User, Delete, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import CompanyPortalOverlay from "@/components/company/CompanyPortalOverlay";

const ADMIN_ROLES = ["Administrateur", "Surintendant", "Chargé de projet", "Gestionnaire Chauffeur", "Gestionnaire Cour", "Gestionnaire Mécanique", "Contremaitre", "Estimateur"];

const allNavItems = [
  { label: "Punch", page: "Punch", icon: Clock, public: true },
  { label: "Mes heures", page: "MyHours", icon: User, public: true },
  { label: "Approbation", page: "Approvals", icon: CheckSquare, adminOnly: true },
  { label: "Heures", page: "TimeSheet", icon: BarChart2, adminOnly: true },
  { label: "Actifs", page: "ActiveUsers", icon: Users, adminOnly: true },
  { label: "Réglages", page: "Settings", icon: Settings, adminOnly: true },
];

function getStoredUser() {
  try { return JSON.parse(sessionStorage.getItem("logipunch_user") || "null"); } catch { return null; }
}

function getStoredCompany() {
  try { return JSON.parse(sessionStorage.getItem("logipunch_company") || "null"); } catch { return null; }
}

function PinModal({ onSuccess, company }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
      let users = [];
      if (company?.id) {
        users = await base44.entities.AppUser.filter({ pin_code: code, is_active: true, company_id: company.id });
        // Fallback: legacy users not yet linked to a company
        if (users.length === 0) {
          const all = await base44.entities.AppUser.filter({ pin_code: code, is_active: true });
          users = all.filter(u => !u.company_id);
        }
      } else {
        users = await base44.entities.AppUser.filter({ pin_code: code, is_active: true });
      }
      if (!users || users.length === 0) { setError("Code invalide. Réessayez."); setPin(""); setLoading(false); return; }
      onSuccess(users[0]);
    } catch { setError("Erreur. Réessayez."); setPin(""); }
    setLoading(false);
  };

  const keys = ["1","2","3","4","5","6","7","8","9","","0","del"];
  const dateStr = now.toLocaleDateString("fr-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] z-50 flex flex-col px-4">
      <div className="flex items-start justify-between pt-6 px-6 pb-8">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center overflow-hidden">
            {company?.logo_url ? (
              <img src={company.logo_url} alt="logo" className="w-full h-full object-contain p-1" />
            ) : (
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a1d6df5ed8bd83fe0fbd65/5493e8e6d_ChatGPTImageFeb27202605_01_06PM.png" alt="logo" className="w-full h-full object-contain p-1" style={{filter: "brightness(0) invert(1)"}} />
            )}
          </div>
          <div>
            <span className="text-2xl font-black text-white tracking-tight">LOGIPUNCH</span>
            {company?.name && <p className="text-zinc-500 text-xs leading-tight">{company.name}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-green-400 tracking-tight tabular-nums">{timeStr}</p>
          <p className="text-zinc-600 text-xs mt-1 capitalize">{dateStr}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center mb-8">
          <p className="text-zinc-300 text-3xl font-bold mb-2">Bienvenue !</p>
          <p className="text-zinc-500 text-sm">Entrez votre code à 4 chiffres</p>
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

      <div className="flex justify-center pb-6">
        <button
          onClick={() => {
            sessionStorage.removeItem("logipunch_company");
            window.dispatchEvent(new Event("logipunch_company_change"));
          }}
          className="text-zinc-700 text-xs hover:text-zinc-500 transition-colors"
        >
          Changer de portail
        </button>
      </div>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const [currentUser, setCurrentUser] = useState(getStoredUser);
  const [currentCompany, setCurrentCompany] = useState(getStoredCompany);

  useEffect(() => {
    const handleUserChange = () => setCurrentUser(getStoredUser());
    const handleCompanyChange = () => setCurrentCompany(getStoredCompany());
    window.addEventListener("logipunch_user_change", handleUserChange);
    window.addEventListener("logipunch_company_change", handleCompanyChange);
    return () => {
      window.removeEventListener("logipunch_user_change", handleUserChange);
      window.removeEventListener("logipunch_company_change", handleCompanyChange);
    };
  }, []);

  const handleCompanySelect = (company) => {
    sessionStorage.setItem("logipunch_company", JSON.stringify(company));
    window.dispatchEvent(new Event("logipunch_company_change"));
    setCurrentCompany(company);
  };

  const handleLogin = (user) => {
    sessionStorage.setItem("logipunch_user", JSON.stringify(user));
    window.dispatchEvent(new Event("logipunch_user_change"));
    setCurrentUser(user);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("logipunch_user");
    window.dispatchEvent(new Event("logipunch_user_change"));
    setCurrentUser(null);
  };

  const isAdmin = currentUser && ADMIN_ROLES.includes(currentUser.role);
  const navItems = currentUser ? allNavItems.filter(item => item.public || isAdmin) : [];

  // Step 1: No company selected → show company portal
  if (!currentCompany) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <style>{`body { background: #0a0a0a; }`}</style>
        <CompanyPortalOverlay onSuccess={handleCompanySelect} />
      </div>
    );
  }

  // Step 2: Company selected but no user → show PIN
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <style>{`body { background: #0a0a0a; }`}</style>
        <PinModal onSuccess={handleLogin} company={currentCompany} />
      </div>
    );
  }

  // Step 3: Fully authenticated → show app
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <style>{`
        body { background: #0a0a0a; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #22c55e55; }
      `}</style>

      {/* Top bar - desktop */}
      <div className="hidden md:flex items-center justify-between px-6 py-3 bg-[#0d0d0d] border-b border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center overflow-hidden">
            {currentCompany?.logo_url ? (
              <img src={currentCompany.logo_url} alt="logo" className="w-full h-full object-contain p-0.5" />
            ) : (
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a1d6df5ed8bd83fe0fbd65/5493e8e6d_ChatGPTImageFeb27202605_01_06PM.png" alt="logo" className="w-full h-full object-contain p-0.5" />
            )}
          </div>
          <div>
            <span className="text-white font-black text-lg tracking-tight">LOGIPUNCH</span>
            {currentCompany?.name && <p className="text-zinc-500 text-xs leading-none mt-0.5">{currentCompany.name}</p>}
          </div>
        </div>
        <nav className="flex items-center gap-1">
          {navItems.map(({ label, page, icon: Icon }) => {
            const isActive = currentPageName === page;
            return (
              <Link key={page} to={createPageUrl(page)} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${isActive ? "bg-green-700 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800"}`}>
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-white text-sm font-semibold">{currentUser.full_name}</p>
            <p className="text-zinc-500 text-xs">{currentUser.role}</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 text-sm transition-all">
            <LogOut size={15} />
            <span>Quitter</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>

      {/* Bottom nav - mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0d0d0d] border-t border-zinc-800/60 flex z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {navItems.map(({ label, page, icon: Icon }) => {
          const isActive = currentPageName === page;
          return (
            <Link key={page} to={createPageUrl(page)} className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all ${isActive ? "text-green-400" : "text-zinc-600 hover:text-zinc-400"}`}>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[9px] font-semibold">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}