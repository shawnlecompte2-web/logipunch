import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

function calcHours(punchIn, punchOut, lunch) {
  if (!punchIn || !punchOut) return 0;
  const diff = (new Date(punchOut) - new Date(punchIn)) / 3600000;
  return Math.max(0, diff - (lunch || 0) / 60);
}

function toLocalDatetimeStr(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditPunchModal({ entry, onClose, companyId }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entry) {
      setForm({
        punch_in: toLocalDatetimeStr(entry.punch_in),
        punch_out: toLocalDatetimeStr(entry.punch_out) || "",
        lunch_break: entry.lunch_break || 0,
      });
    }
  }, [entry]);

  if (!entry || !form) return null;

  const total = calcHours(form.punch_in, form.punch_out, form.lunch_break);

  const handleSave = async () => {
    setSaving(true);
    const updated = {
      punch_in: form.punch_in ? new Date(form.punch_in).toISOString() : entry.punch_in,
      punch_out: form.punch_out ? new Date(form.punch_out).toISOString() : null,
      lunch_break: form.lunch_break,
      total_hours: parseFloat(total.toFixed(2)),
    };
    await base44.entities.PunchEntry.update(entry.id, updated);
    qc.invalidateQueries({ queryKey: ['punchEntries', companyId] });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">Modifier l'entrée — {entry.user_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Arrivée</label>
            <Input
              type="datetime-local"
              value={form.punch_in}
              onChange={e => setForm(f => ({ ...f, punch_in: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Départ</label>
            <Input
              type="datetime-local"
              value={form.punch_out}
              onChange={e => setForm(f => ({ ...f, punch_out: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Dîner (min)</label>
            <Select
              value={String(form.lunch_break)}
              onValueChange={v => setForm(f => ({ ...f, lunch_break: parseInt(v) }))}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                {[0, 15, 30, 45, 60].map(v => (
                  <SelectItem key={v} value={String(v)}>{v} min</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-green-400 font-semibold">
            Total: {total.toFixed(2)}h
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={onClose} variant="outline" className="flex-1 border-zinc-700 text-zinc-300">Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-green-700 hover:bg-green-600 text-white">
              {saving ? "..." : "Sauvegarder"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}