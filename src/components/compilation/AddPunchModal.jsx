import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";

function calcHours(punchIn, punchOut, lunch) {
  if (!punchIn || !punchOut) return 0;
  const diff = (new Date(punchOut) - new Date(punchIn)) / 3600000;
  return Math.max(0, diff - (lunch || 0) / 60);
}

export default function AddPunchModal({ projectId, projectName, date, weekStart, appUsers, companyId, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    user_id: "",
    punch_in: `${date}T07:00`,
    punch_out: `${date}T15:30`,
    lunch_break: 30,
  });
  const [saving, setSaving] = useState(false);

  const selectedUser = appUsers.find(u => u.id === form.user_id);
  const total = calcHours(form.punch_in, form.punch_out, form.lunch_break);

  const handleSave = async () => {
    if (!form.user_id) return;
    setSaving(true);
    const entry = {
      user_id: form.user_id,
      user_name: selectedUser?.full_name || "",
      project_id: projectId,
      project_name: projectName,
      punch_in: new Date(form.punch_in).toISOString(),
      punch_out: form.punch_out ? new Date(form.punch_out).toISOString() : null,
      lunch_break: form.lunch_break,
      total_hours: parseFloat(total.toFixed(2)),
      work_date: date,
      week_start: weekStart,
      status: "completed",
      company_id: companyId,
      role: selectedUser?.role || "",
      group: selectedUser?.group || "",
    };
    await base44.entities.PunchEntry.create(entry);
    qc.invalidateQueries({ queryKey: ['punchEntries', companyId] });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">Ajouter une entrée — {date}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Employé</label>
            <Select value={form.user_id} onValueChange={v => setForm(f => ({ ...f, user_id: v }))}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Sélectionner un employé" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                {appUsers.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
            <Button onClick={handleSave} disabled={saving || !form.user_id} className="flex-1 bg-green-700 hover:bg-green-600 text-white">
              {saving ? "..." : "Ajouter"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}