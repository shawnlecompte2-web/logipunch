import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Coffee } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";

const LUNCH_OPTIONS = [0, 15, 30, 45, 60];

export default function PunchOutForm({ user, activeEntry, onSuccess, onBack }) {
  const [lunch, setLunch] = useState(null);
  const [customLunch, setCustomLunch] = useState("");
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const punchInTime = new Date(activeEntry.punch_in);
  const totalMinutes = differenceInMinutes(now, punchInTime);
  const lunchMinutes = lunch === "custom" ? parseInt(customLunch) || 0 : (lunch ?? 0);
  const workedMinutes = totalMinutes - lunchMinutes;
  const workedHours = (workedMinutes / 60).toFixed(2);

  const canSubmit = lunch !== null;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    const finalLunch = lunch === "custom" ? parseInt(customLunch) || 0 : lunch;
    const totalHours = Math.max(0, (totalMinutes - finalLunch) / 60);

    await base44.entities.PunchEntry.update(activeEntry.id, {
      punch_out: now.toISOString(),
      lunch_break: finalLunch,
      total_hours: parseFloat(totalHours.toFixed(2)),
      status: "completed",
    });
    onSuccess();
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col max-w-md mx-auto px-4 py-6">
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft size={18} />
        <span className="text-sm">Retour</span>
      </button>

      <h2 className="text-white text-2xl font-bold mb-1">Punch Out</h2>
      <p className="text-zinc-500 text-sm mb-6">{user.full_name}</p>

      {/* Summary */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-zinc-500 text-xs mb-1">Projet</p>
            <p className="text-white text-sm font-semibold">{activeEntry.project_name}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-xs mb-1">Début</p>
            <p className="text-white text-sm font-semibold">{format(punchInTime, "HH:mm")}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-xs mb-1">Fin</p>
            <p className="text-white text-sm font-semibold">{format(now, "HH:mm")}</p>
          </div>
        </div>
      </div>

      {/* Lunch Break */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Coffee size={16} className="text-zinc-400" />
          <label className="text-zinc-400 text-xs uppercase tracking-widest">Temps de diner *</label>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {LUNCH_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => { setLunch(opt); setCustomLunch(""); }}
              className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
                lunch === opt
                  ? "bg-green-900/30 border-green-600 text-green-400"
                  : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"
              }`}
            >
              {opt === 0 ? "Aucun" : `${opt} min`}
            </button>
          ))}
          <button
            onClick={() => setLunch("custom")}
            className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
              lunch === "custom"
                ? "bg-green-900/30 border-green-600 text-green-400"
                : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"
            }`}
          >
            Autre
          </button>
        </div>
        {lunch === "custom" && (
          <input
            type="number"
            value={customLunch}
            onChange={e => setCustomLunch(e.target.value)}
            placeholder="Minutes..."
            min="0"
            max="120"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-600 text-sm"
          />
        )}
      </div>

      {/* Total Preview */}
      {canSubmit && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-zinc-500 text-xs mb-1">Brut</p>
              <p className="text-white text-sm font-bold">{Math.floor(totalMinutes/60)}h{(totalMinutes%60).toString().padStart(2,"0")}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-1">- Diner</p>
              <p className="text-red-400 text-sm font-bold">-{lunchMinutes}m</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-1">Total</p>
              <p className="text-green-400 text-base font-bold">{workedHours}h</p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || loading}
        className={`w-full h-14 rounded-2xl font-bold text-base transition-all ${
          canSubmit && !loading
            ? "bg-red-700 hover:bg-red-600 text-white glow-red"
            : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
        }`}
      >
        {loading ? "Enregistrement..." : "CONFIRMER PUNCH OUT"}
      </button>
    </div>
  );
}