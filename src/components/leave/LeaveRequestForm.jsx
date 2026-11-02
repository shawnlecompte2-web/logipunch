import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Send } from "lucide-react";
import { toDateKey, dayCount } from "@/utils/leaveDates";

const TYPES = ["Vacances", "Maladie", "Congé personnel", "Sans solde", "Autre"];

export default function LeaveRequestForm({ open, defaultDate, user, companyId, editRequest, onClose, onSaved }) {
  const initial = defaultDate || toDateKey(new Date());
  const [leaveType, setLeaveType] = useState("Vacances");
  const [start, setStart] = useState(initial);
  const [end, setEnd] = useState(initial);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      if (editRequest) {
        setStart(editRequest.start_date);
        setEnd(editRequest.end_date);
        setLeaveType(editRequest.leave_type || "Vacances");
        setReason(editRequest.reason || "");
      } else {
        const d = defaultDate || toDateKey(new Date());
        setStart(d);
        setEnd(d);
        setLeaveType("Vacances");
        setReason("");
      }
      setError("");
    }
  }, [open, defaultDate, editRequest]);

  if (!open) return null;

  const total = dayCount(start, end);

  const handleSubmit = async () => {
    if (!start || !end) { setError("Choisissez les dates."); return; }
    if (end < start) { setError("La date de fin doit suivre la date de début."); return; }
    setSaving(true);
    setError("");
    try {
      if (editRequest) {
        await base44.entities.LeaveRequest.update(editRequest.id, {
          start_date: start,
          end_date: end,
          leave_type: leaveType,
          reason: reason.trim(),
        });
      } else {
        await base44.entities.LeaveRequest.create({
          user_id: user.id,
          user_name: user.full_name,
          start_date: start,
          end_date: end,
          leave_type: leaveType,
          reason: reason.trim(),
          status: "pending",
          company_id: companyId,
        });
      }
      onSaved();
    } catch (e) {
      setError("Erreur lors de l'envoi. Réessayez.");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full md:max-w-md bg-zinc-900 border border-zinc-800 rounded-t-2xl md:rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg">{editRequest ? "Modifier la demande" : "Demande de congé"}</h2>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold mb-2">Type</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setLeaveType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                leaveType === t
                  ? "bg-green-900/40 border-green-700/60 text-green-300"
                  : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold mb-1.5">Du</p>
            <input
              type="date"
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                if (!end || e.target.value > end) setEnd(e.target.value);
              }}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-700"
            />
          </div>
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold mb-1.5">Au</p>
            <input
              type="date"
              value={end}
              min={start}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-700"
            />
          </div>
        </div>

        <div className="mb-4">
          <p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold mb-1.5">Raison (optionnel)</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Précisions..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-700 resize-none placeholder:text-zinc-600"
          />
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="px-2.5 py-1 bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold rounded-full">
            {total} jour{total > 1 ? "s" : ""}
          </span>
        </div>

        {error && (
          <div className="mb-3 px-3 py-2 bg-red-900/30 border border-red-700/50 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 bg-green-700 hover:bg-green-600 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50"
        >
          <Send size={15} />{" "}
          {saving ? "Enregistrement..." : editRequest ? "Enregistrer" : "Envoyer la demande"}
        </button>
      </div>
    </div>
  );
}