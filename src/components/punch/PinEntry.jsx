import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Delete } from "lucide-react";

export default function PinEntry({ onSuccess }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleKey = (val) => {
    if (pin.length < 4) {
      const newPin = pin + val;
      setPin(newPin);
      setError("");
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(p => p.slice(0, -1));
    setError("");
  };

  const verifyPin = async (code) => {
    setLoading(true);
    try {
      const users = await base44.entities.AppUser.filter({ pin_code: code, is_active: true });
      if (!users || users.length === 0) {
        setError("Code invalide. Réessayez.");
        setPin("");
        setLoading(false);
        return;
      }
      const user = users[0];
      // Check for active punch entry
      const entries = await base44.entities.PunchEntry.filter({ user_id: user.id, status: "active" });
      const activeEntry = entries && entries.length > 0 ? entries[0] : null;
      onSuccess(user, activeEntry);
    } catch (e) {
      setError("Erreur. Réessayez.");
      setPin("");
    }
    setLoading(false);
  };

  const keys = ["1","2","3","4","5","6","7","8","9","","0","del"];

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-4">
      {/* Logo / Header */}
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
            <span className="text-white font-black text-lg">L</span>
          </div>
          <span className="text-3xl font-black text-white tracking-tight">LOGIPUNCH</span>
        </div>
        <p className="text-zinc-500 text-sm mt-1">Entrez votre code à 4 chiffres</p>
      </div>

      {/* PIN dots */}
      <div className="flex gap-4 mb-8">
        {[0,1,2,3].map(i => (
          <div key={i} className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${
            i < pin.length
              ? "bg-green-500 border-green-500 scale-110"
              : "bg-transparent border-zinc-600"
          }`} />
        ))}
      </div>

      {error && (
        <div className="mb-5 px-5 py-2.5 bg-red-900/30 border border-red-700/50 rounded-xl text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {keys.map((k, i) => {
          if (k === "") return <div key={i} />;
          if (k === "del") return (
            <button
              key={i}
              onClick={handleDelete}
              disabled={loading}
              className="h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center active:scale-95 transition-all text-zinc-400 hover:bg-zinc-700"
            >
              <Delete size={22} />
            </button>
          );
          return (
            <button
              key={i}
              onClick={() => handleKey(k)}
              disabled={loading || pin.length >= 4}
              className="h-16 rounded-2xl bg-zinc-800 border border-zinc-700 text-white text-2xl font-semibold active:scale-95 transition-all hover:bg-zinc-700 hover:border-green-600"
            >
              {k}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="mt-8 text-green-400 text-sm animate-pulse">Vérification...</div>
      )}
    </div>
  );
}