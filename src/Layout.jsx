import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Clock, CheckSquare, BarChart2, Users, Settings, User, Delete, LogOut, Phone } from "lucide-react";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import CompanyPortalOverlay from "@/components/company/CompanyPortalOverlay";

const ADMIN_ROLES = ["Administrateur", "Surintendant", "Chargé de projet", "Gestionnaire Chauffeur", "Gestionnaire Cour", "Gestionnaire Mécanique", "Contremaitre", "Estimateur"];
const isAdminUser = (user) => user?.is_admin === true || ADMIN_ROLES.includes(user?.role);

const allNavItems = [
  { label: "Punch", page: "Punch", icon: Clock, alwaysVisible: true },
  { label: "Mes heures", page: "MyHours", icon: User, alwaysVisible: true },
  { label: "Approbation", page: "Approvals", icon: CheckSquare, key: "Approvals" },
  { label: "Heures", page: "TimeSheet", icon: BarChart2, key: "TimeSheet" },
  { label: "Actifs", page: "ActiveUsers", icon: Users, key: "ActiveUsers" },
  { label: "Réglages", page: "Settings", icon: Settings, key: "Settings" },
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
      const users = await base44.entities.AppUser.filter({ pin_code: code, is_active: true, company_id: company.id });
      if (!users || users.length === 0) { setError("Code invalide. Réessayez."); setPin(""); setLoading(false); return; }
      onSuccess(users[0]);
    } catch { setError("Erreur. Réessayez."); setPin(""); }
    setLoading(false);
  };

  const [smsMode, setSmsMode] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [smsSent, setSmsSent] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsError, setSmsError] = useState("");

  const handleSendSms = async () => {
    setSmsLoading(true);
    setSmsError("");
    // Normalize phone: add +1 if no country code
    let normalizedPhone = phoneInput.replace(/\D/g, "");
    if (normalizedPhone.length === 10) normalizedPhone = "+1" + normalizedPhone;
    else normalizedPhone = "+" + normalizedPhone;
    try {
      const res = await base44.functions.invoke("sendSmsCode", { action: "send", phone: normalizedPhone, company_id: company.id });
      if (res.data?.success) { setSmsSent(true); setPhoneInput(normalizedPhone); }
      else setSmsError(res.data?.error || "Erreur lors de l'envoi.");
    } catch (e) { setSmsError("Erreur lors de l'envoi."); }
    setSmsLoading(false);
  };

  const handleVerifySms = async () => {
    setSmsLoading(true);
    setSmsError("");
    try {
      const res = await base44.functions.invoke("sendSmsCode", { action: "verify", phone: phoneInput, code: smsCode, company_id: company.id });
      if (res.data?.success) { onSuccess(res.data.user); }
      else setSmsError(res.data?.error || "Code incorrect.");
    } catch (e) { setSmsError("Code incorrect."); }
    setSmsLoading(false);
  };

  const keys = ["1","2","3","4","5","6","7","8","9","","0","del"];
  const dateStr = now.toLocaleDateString("fr-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] z-50 flex flex-col px-4">
      <div className="flex items-start justify-between pt-6 px-6 pb-8">
        <div className="flex items-center gap-2">
        <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a1d6df5ed8bd83fe0fbd65/6b809ffd5_clock_5190346.png" alt="logo" className="w-12 h-12 object-contain" style={{filter: "brightness(0) invert(1)"}} />
        </div>
        <div>
          <span className="text-2xl font-black text-white tracking-tight">TapIN</span>
          {company?.name && <p className="text-zinc-500 text-xs leading-tight">{company.name}</p>}
        </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-green-400 tracking-tight tabular-nums">{timeStr}</p>
          <p className="text-zinc-600 text-xs mt-1 capitalize">{dateStr}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        {!smsMode ? (
          <>
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
            <button onClick={() => setSmsMode(true)} className="mt-8 flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
              <Phone size={14} /> Code oublié ? Recevoir un SMS
            </button>
          </>
        ) : (
          <div className="w-full max-w-xs">
            <button onClick={() => { setSmsMode(false); setSmsSent(false); setSmsError(""); setPhoneInput(""); setSmsCode(""); }} className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 text-sm mb-8 transition-colors">
              ← Retour
            </button>
            <div className="text-center mb-8">
              <p className="text-zinc-300 text-2xl font-bold mb-2">Connexion par SMS</p>
              <p className="text-zinc-500 text-sm">{smsSent ? "Entrez le code reçu par SMS" : "Entrez votre numéro de téléphone"}</p>
            </div>
            {smsError && <div className="mb-4 px-4 py-2.5 bg-red-900/30 border border-red-700/50 rounded-xl text-red-400 text-sm text-center">{smsError}</div>}
            {!smsSent ? (
              <>
                <input
                  type="tel"
                  placeholder="Ex: 5141234567"
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-lg text-center font-mono focus:outline-none focus:border-green-600 mb-4"
                />
                <button onClick={handleSendSms} disabled={smsLoading || phoneInput.length < 10} className="w-full h-12 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold text-sm transition-all disabled:opacity-40">
                  {smsLoading ? "Envoi..." : "Envoyer le code"}
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Code à 6 chiffres"
                  value={smsCode}
                  onChange={e => setSmsCode(e.target.value)}
                  maxLength={6}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-2xl text-center font-mono tracking-widest focus:outline-none focus:border-green-600 mb-4"
                />
                <button onClick={handleVerifySms} disabled={smsLoading || smsCode.length < 6} className="w-full h-12 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold text-sm transition-all disabled:opacity-40">
                  {smsLoading ? "Vérification..." : "Confirmer"}
                </button>
                <button onClick={() => setSmsSent(false)} className="w-full mt-2 text-zinc-600 text-xs hover:text-zinc-400 transition-colors">
                  Renvoyer le code
                </button>
              </>
            )}
          </div>
        )}
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
  const navigate = useNavigate();

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
    navigate(createPageUrl("Punch"));
  };

  const handleLogout = () => {
    sessionStorage.removeItem("logipunch_user");
    window.dispatchEvent(new Event("logipunch_user_change"));
    setCurrentUser(null);
  };

  const isAdmin = currentUser && isAdminUser(currentUser);
  const navItems = currentUser ? allNavItems.filter(item => {
    if (item.alwaysVisible) return true;
    if (isAdmin) return true;
    // Check allowed_pages on user
    const allowed = currentUser.allowed_pages || [];
    return allowed.includes(item.key);
  }) : [];

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
          <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a1d6df5ed8bd83fe0fbd65/6b809ffd5_clock_5190346.png" alt="logo" className="w-10 h-10 object-contain" style={{filter: "brightness(0) invert(1)"}} />
          </div>
          <div>
            <span className="text-white font-black text-lg tracking-tight">TapIN</span>
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