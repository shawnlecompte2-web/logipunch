import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X } from "lucide-react";
import { format, parseISO, differenceInMinutes } from "date-fns";

export default function EditEntryModal({ entry, approver, onClose, onSaved }) {
  const [punchIn, setPunchIn] = useState(
    entry.punch_in ? format(parseISO(entry.punch_in), "yyyy-MM-dd'T'HH:mm") : ""
  );
  const [punchOut, setPunchOut] = useState(
    entry.punch_out ? format(parseISO(entry.punch_out), "yyyy-MM-dd'T'HH:mm") : ""
  );
  const [lunch, setLunch] = useState(entry.lunch_break ?? 0);
  const [saving, setSaving] = useState(false);

  const calcTotal = () => {
    if (!punchIn || !punchOut) return null;
    const mins = differenceInMinutes(new Date(punchOut), new Date(punchIn)) - lunch;
    return Math.max(0, mins / 60).toFixed(2);
  };

  const handleSave = async () => {
    setSaving(true);
    const total = calcTotal();
    await base44.entities.PunchEntry.update(entry.id, {
      punch_in: new Date(punchIn).toISOString(),
      punch_out: punchOut ? new Date(punchOut).toISOString() : undefined,
      lunch_break: lunch,
      total_hours: total ? parseFloat(total) : entry.total_hours,
      modified_by: approver.full_name,
      modified_at: new Date().toISOString(),
    });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h3 className="text-white font-bold">Modifier l'entrée</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Projet</label>
            <p className="text-white text-sm font-semibold">{entry.project_name}</p>
          </div>
          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Punch In</label>
            <input
              type="datetime-local"
              value={punchIn}
              onChange={e => setPunchIn(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600"
            />
          </div>
          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Punch Out</label>
            <input
              type="datetime-local"
              value={punchOut}
              onChange={e => setPunchOut(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600"
            />
          </div>
          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Dîner (minutes)</label>
            <select
              value={lunch}
              onChange={e => setLunch(parseInt(e.target.value))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600"
            >
              {[0,15,30,45,60].map(v => (
                <option key={v} value={v}>{v === 0 ? "Aucun" : `${v} min`}</option>
              ))}
            </select>
          </div>
          {calcTotal() && (
            <div className="bg-zinc-800 rounded-xl p-3 text-center">
              <span className="text-zinc-500 text-xs">Total calculé : </span>
              <span className="text-green-400 font-bold">{calcTotal()}h</span>
            </div>
          )}
        </div>
        <div className="flex gap-3 p-5 border-t border-zinc-800">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-semibold hover:bg-zinc-700 transition-all">
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 h-10 rounded-xl bg-green-700 hover:bg-green-600 text-white text-sm font-bold transition-all">
            {saving ? "Saving..." : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );
}