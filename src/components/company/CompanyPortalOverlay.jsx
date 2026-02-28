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

        {mode === "join" && (
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
          </div>
        )}
      </div>
    </div>
  );
}