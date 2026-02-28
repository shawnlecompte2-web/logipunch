import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronRight, Phone } from "lucide-react";
import CreateCompanyForm from "./CreateCompanyForm";

export default function CompanyPortalOverlay({ onSuccess }) {
  const [mode, setMode] = useState("select");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());

  // SMS recovery for forgotten portal code
  const [smsMode, setSmsMode] = useState(false);
  const [smsPhone, setSmsPhone] = useState("");
  const [smsSent, setSmsSent] = useState(false);
  const [smsCodeInput, setSmsCodeInput] = useState("");
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsError, setSmsError] = useState("");
  const [foundCompany, setFoundCompany] = useState(null);

  const handleSmsSend = async () => {
    setSmsLoading(true);
    setSmsError("");
    let normalizedPhone = smsPhone.replace(/\D/g, "");
    if (normalizedPhone.length === 10) normalizedPhone = "+1" + normalizedPhone;
    else normalizedPhone = "+" + normalizedPhone;
    try {
      // Find a company that has a user with this phone number
      const users = await base44.entities.AppUser.filter({ phone: normalizedPhone, is_active: true });
      if (!users || users.length === 0) { setSmsError("Aucun compte trouvé avec ce numéro."); setSmsLoading(false); return; }
      const company = await base44.entities.Company.filter({ id: users[0].company_id });
      if (!company || company.length === 0) { setSmsError("Aucune entreprise trouvée."); setSmsLoading(false); return; }
      setFoundCompany(company[0]);
      const res = await base44.functions.invoke("sendSmsCode", { action: "send", phone: normalizedPhone, company_id: company[0].id });
      if (res.data?.success) { setSmsSent(true); setSmsPhone(normalizedPhone); }
      else setSmsError(res.data?.error || "Erreur lors de l'envoi.");
    } catch { setSmsError("Erreur lors de l'envoi."); }
    setSmsLoading(false);
  };

  const handleSmsVerify = async () => {
    setSmsLoading(true);
    setSmsError("");
    try {
      const res = await base44.functions.invoke("sendSmsCode", { action: "verify", phone: smsPhone, code: smsCodeInput, company_id: foundCompany.id });
      if (res.data?.success) { onSuccess(foundCompany); }
      else setSmsError(res.data?.error || "Code incorrect.");
    } catch { setSmsError("Code incorrect."); }
    setSmsLoading(false);
  };

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleJoin = async () => {
    setLoading(true);
    setError("");
    const companies = await base44.entities.Company.filter({ join_code: joinCode.toUpperCase() });
    if (!companies || companies.length === 0) {
      setError("Code invalide. Vérifiez et réessayez.");
      setLoading(false);
      return;
    }
    onSuccess(companies[0]);
    setLoading(false);
  };

  const timeStr = now.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("fr-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  if (mode === "create") {
    return <CreateCompanyForm onSuccess={onSuccess} onBack={() => setMode("select")} />;
  }

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] z-50 flex flex-col px-4">
      {/* Header */}
      <div className="flex items-start justify-between pt-6 px-2 pb-8">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a1d6df5ed8bd83fe0fbd65/6b809ffd5_clock_5190346.png"
              alt="logo"
              className="w-10 h-10 object-contain"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          </div>
          <span className="text-2xl font-black text-white tracking-tight">TapIN</span>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-green-400 tabular-nums">{timeStr}</p>
          <p className="text-zinc-600 text-xs mt-1 capitalize">{dateStr}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
        {mode === "select" && (
          <>
            <div className="text-center mb-10">
              <p className="text-3xl font-bold text-zinc-300 mb-2">Bienvenue !</p>
              <p className="text-zinc-500 text-sm">Rejoignez ou créez un portail entreprise</p>
            </div>
            <div className="w-full space-y-3">
              <button
                onClick={() => setMode("join")}
                className="w-full h-16 bg-green-600 hover:bg-green-500 text-white font-bold rounded-2xl flex items-center justify-between px-6 transition-all"
              >
                <span>REJOINDRE UN PORTAIL</span>
                <ChevronRight size={20} />
              </button>
              <button
                onClick={() => setMode("create")}
                className="w-full h-16 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-bold rounded-2xl flex items-center justify-between px-6 transition-all"
              >
                <span>CRÉER MON PORTAIL</span>
                <ChevronRight size={20} />
              </button>
            </div>
          </>
        )}

        {mode === "join" && !smsMode && (
          <div className="w-full">
            <button
              onClick={() => { setMode("select"); setError(""); setJoinCode(""); }}
              className="text-zinc-500 text-sm mb-8 flex items-center gap-1 hover:text-zinc-300 transition-colors"
            >
              ← Retour
            </button>
            <div className="text-center mb-8">
              <p className="text-xl font-bold text-white mb-1">Rejoindre un portail</p>
              <p className="text-zinc-500 text-sm">Entrez le code fourni par votre administrateur</p>
            </div>
            <input
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError(""); }}
              placeholder="XXXXXX"
              maxLength={8}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-4 text-white text-center text-2xl font-bold font-mono placeholder:text-zinc-700 focus:outline-none focus:border-green-600 tracking-widest mb-4"
            />
            {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
            <button
              onClick={handleJoin}
              disabled={!joinCode || loading}
              className={`w-full h-14 rounded-2xl font-bold text-base transition-all ${
                joinCode && !loading ? "bg-green-600 hover:bg-green-500 text-white" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
              }`}
            >
              {loading ? "Vérification..." : "REJOINDRE"}
            </button>
            <button onClick={() => setSmsMode(true)} className="w-full mt-4 flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
              <Phone size={14} /> Code oublié ? Recevoir un SMS
            </button>
          </div>
        )}

        {mode === "join" && smsMode && (
          <div className="w-full">
            <button onClick={() => { setSmsMode(false); setSmsSent(false); setSmsError(""); setSmsPhone(""); setSmsCodeInput(""); }} className="text-zinc-500 text-sm mb-8 flex items-center gap-1 hover:text-zinc-300 transition-colors">
              ← Retour
            </button>
            <div className="text-center mb-8">
              <p className="text-xl font-bold text-white mb-1">Connexion par SMS</p>
              <p className="text-zinc-500 text-sm">{smsSent ? "Entrez le code reçu par SMS" : "Entrez votre numéro de téléphone"}</p>
            </div>
            {smsError && <p className="text-red-400 text-sm mb-4 text-center">{smsError}</p>}
            {!smsSent ? (
              <>
                <input
                  type="tel"
                  placeholder="Ex: 5141234567"
                  value={smsPhone}
                  onChange={e => setSmsPhone(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-4 text-white text-center text-2xl font-mono placeholder:text-zinc-700 focus:outline-none focus:border-green-600 tracking-widest mb-4"
                />
                <button onClick={handleSmsSend} disabled={smsLoading || smsPhone.length < 10} className={`w-full h-14 rounded-2xl font-bold text-base transition-all ${!smsLoading && smsPhone.length >= 10 ? "bg-green-600 hover:bg-green-500 text-white" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}>
                  {smsLoading ? "Envoi..." : "Envoyer le code"}
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="000000"
                  value={smsCodeInput}
                  onChange={e => setSmsCodeInput(e.target.value)}
                  maxLength={6}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-4 text-white text-center text-2xl font-bold font-mono placeholder:text-zinc-700 focus:outline-none focus:border-green-600 tracking-widest mb-4"
                />
                <button onClick={handleSmsVerify} disabled={smsLoading || smsCodeInput.length < 6} className={`w-full h-14 rounded-2xl font-bold text-base transition-all ${!smsLoading && smsCodeInput.length >= 6 ? "bg-green-600 hover:bg-green-500 text-white" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}>
                  {smsLoading ? "Vérification..." : "CONFIRMER"}
                </button>
                <button onClick={() => setSmsSent(false)} className="w-full mt-3 text-zinc-600 text-xs hover:text-zinc-400 transition-colors">Renvoyer le code</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}