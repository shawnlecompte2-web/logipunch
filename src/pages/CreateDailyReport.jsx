import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Plus, X } from "lucide-react";
import TruckPicker from "@/components/TruckPicker";

const DEFAULT_EQUIPMENT = {
  "Pelle Mécanique": [
    "Excavatrice Cat 320",
    "Excavatrice Cat 345",
    "Pelle Mécanique 336"
  ],
  "Chargeur sur roue": [
    "Chargeuse frontale",
    "Chargeuse Caterpillar"
  ],
  "Bouteurs": [
    "Bouteur (Dozer)",
    "Bouteur D6"
  ],
  "Compactage": [
    "Compacteur Dynapac",
    "Vibrateur de sol"
  ],
  "Autres": [
    "Niveleuse",
    "Camion benne",
    "Tractopelle",
    "Grue mobile"
  ]
};


const STORAGE_KEY = "logipunch_equipment_list";

function getEquipmentList() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // If old array format, migrate to new object format
      if (Array.isArray(parsed)) {
        const migrated = { ...DEFAULT_EQUIPMENT, "Autres": parsed };
        saveEquipmentList(migrated);
        return migrated;
      }
      return parsed;
    }
  } catch {}
  return DEFAULT_EQUIPMENT;
}

function saveEquipmentList(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function getAllEquipment(equipList) {
  const all = [];
  Object.values(equipList).forEach(items => {
    if (Array.isArray(items)) all.push(...items);
  });
  return all;
}

// value = comma-separated names (for backward compat)
// hoursValue = JSON string: { "Excavatrice Cat 320": 4.5, ... }
function EquipmentPicker({ value, onChange, hoursValue, onHoursChange }) {
  const selected = value ? value.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const hours = (() => { try { return JSON.parse(hoursValue || "{}"); } catch { return {}; } })();

  const [custom, setCustom] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [equipList, setEquipList] = useState(getEquipmentList);

  const setHours = (item, h) => {
    const next = { ...hours, [item]: h };
    onHoursChange(JSON.stringify(next));
  };

  const toggle = (item) => {
    const exists = selected.includes(item);
    let next;
    if (exists) {
      next = selected.filter((s) => s !== item);
      const nextHours = { ...hours };
      delete nextHours[item];
      onHoursChange(JSON.stringify(nextHours));
    } else {
      next = [...selected, item];
    }
    onChange(next.join(", "));
  };

  const addCustom = () => {
    const trimmed = custom.trim();
    if (!trimmed) return;
    const allEq = getAllEquipment(equipList);
    if (!allEq.includes(trimmed)) {
      const next = { ...equipList, "Autres": [...(equipList["Autres"] || []), trimmed] };
      setEquipList(next);
      saveEquipmentList(next);
    }
    if (!selected.includes(trimmed)) {
      onChange([...selected, trimmed].join(", "));
    }
    setCustom("");
  };

  const removeFromList = (item) => {
    const next = { ...equipList };
    Object.keys(next).forEach(cat => {
      next[cat] = next[cat].filter(e => e !== item);
    });
    setEquipList(next);
    saveEquipmentList(next);
    onChange(selected.filter((s) => s !== item).join(", "));
    const nextHours = { ...hours };
    delete nextHours[item];
    onHoursChange(JSON.stringify(nextHours));
  };

  const removeSelected = (item) => {
    onChange(selected.filter((s) => s !== item).join(", "));
    const nextHours = { ...hours };
    delete nextHours[item];
    onHoursChange(JSON.stringify(nextHours));
  };

  return (
    <div className="space-y-3">
      {/* Header with edit toggle */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setEditMode((e) => !e)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-all ${editMode ? "bg-red-900/40 border-red-700 text-red-400" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"}`}>
          {editMode ? "Terminer" : "Modifier la liste"}
        </button>
      </div>

      {/* Chips by Category */}
      <div className="space-y-3">
        {Object.entries(equipList).map(([category, items]) => (
          <div key={category}>
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-2">{category}</p>
            <div className="flex flex-wrap gap-2">
              {items.map((eq) => {
                const isSelected = selected.includes(eq);
                if (editMode) {
                  return (
                    <button
                      key={eq}
                      type="button"
                      onClick={() => removeFromList(eq)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-red-900/30 border-red-800 text-red-400 hover:bg-red-900/60">
                      {eq}
                      <X size={11} />
                    </button>
                  );
                }
                return (
                  <button
                    key={eq}
                    type="button"
                    onClick={() => toggle(eq)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      isSelected ?
                      "bg-green-700 border-green-600 text-white hover:bg-green-600" :
                      "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"}`}>
                    {eq}
                    {isSelected && <X size={11} className="opacity-80" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Custom tags (not in predefined list) */}
      {selected.filter((s) => !getAllEquipment(equipList).includes(s)).length > 0 &&
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Personnalisé</p>
          <div className="flex flex-wrap gap-2">
            {selected.filter((s) => !getAllEquipment(equipList).includes(s)).map((s) =>
              <span key={s} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-900/50 border border-blue-700 text-blue-300">
                {s}
                <button type="button" onClick={() => removeSelected(s)} className="ml-0.5 hover:text-white">
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        </div>
      }

      {/* Hours per selected equipment */}
      {selected.length > 0 && (
        <div className="space-y-2 mt-1">
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Heures par équipement</p>
          {selected.map((item) => (
            <div key={item} className="flex items-center gap-3 bg-zinc-800/60 border border-zinc-700/60 rounded-xl px-3 py-2">
              <span className="text-white text-sm flex-1 truncate">{item}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={hours[item] ?? ""}
                  onChange={(e) => setHours(item, e.target.value)}
                  placeholder="0"
                  className="w-16 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-green-600"
                />
                <span className="text-zinc-500 text-xs">h</span>
                <button
                  type="button"
                  onClick={() => toggle(item)}
                  className="ml-1 text-zinc-500 hover:text-red-400 transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom input */}
      {!editMode &&
        <div className="flex gap-2">
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
            placeholder="Ajouter un equipement..."
            className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 text-sm h-9" />
          <Button type="button" onClick={addCustom} size="sm" variant="outline" className="h-9 px-3 border-zinc-700">
            <Plus size={15} />
          </Button>
        </div>
      }
      {editMode &&
        <p className="text-xs text-red-400/70 text-center">Cliquez sur un equipement pour le supprimer de la liste</p>
      }
    </div>
  );
}

function getStoredUser() {
  try {return JSON.parse(sessionStorage.getItem("logipunch_user") || "null");} catch {return null;}
}

function getStoredCompany() {
  try {return JSON.parse(sessionStorage.getItem("logipunch_company") || "null");} catch {return null;}
}

function Field({ label, required, children, hint }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5 text-white">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-zinc-500 mt-1">{hint}</p>}
    </div>);

}

function SectionTitle({ label }) {
  return (
    <div className="pt-2 pb-1">
      <p className="text-xs font-bold uppercase tracking-widest text-green-500">{label}</p>
      <div className="h-px bg-zinc-800 mt-1" />
    </div>);

}

export default function CreateDailyReportPage() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const currentCompany = getStoredCompany();

  const [selectedProject, setSelectedProject] = useState("");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [formData, setFormData] = useState({
    subcontractor: "",
    machine: "",
    machine_hours: "",
    trucks: "[]",
    work_description: "",
    other_notes: ""
  });
  const [loading, setLoading] = useState(false);

  const { data: projects } = useQuery({
    queryKey: ['projects', currentCompany?.id],
    queryFn: () => base44.entities.Project.filter({ company_id: currentCompany?.id }),
    enabled: !!currentCompany?.id,
    initialData: []
  });

  const selectedProjectObj = projects.find((p) => p.id === selectedProject);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProject || !formData.work_description.trim()) {
      alert("Veuillez selectionner un projet et decrire les travaux");
      return;
    }
    setLoading(true);
    try {
      const project = projects.find((p) => p.id === selectedProject);
      const weekStart = new Date(reportDate + "T12:00:00");
      const day = weekStart.getDay(); // 0=Dim, 6=Sam
      weekStart.setDate(weekStart.getDate() - day); // Recule au dimanche
      const weekStartStr = weekStart.toISOString().split("T")[0];

      await base44.entities.DailyReport.create({
        user_id: currentUser.id,
        user_name: currentUser.full_name,
        project_id: selectedProject,
        project_name: project?.name,
        project_address: project?.address || "",
        report_date: reportDate,
        week_start: weekStartStr,
        subcontractor: formData.subcontractor,
        machine: formData.machine,
        machine_hours: formData.machine_hours || null,
        trucks: formData.trucks || "[]",
        work_description: formData.work_description,
        other_notes: formData.other_notes,
        company_id: currentCompany?.id
      });

      alert("Rapport cree avec succes!");
      navigate(createPageUrl("DailyReports"));
    } catch (error) {
      alert("Erreur: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(createPageUrl("DailyReports"))}
          className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors">

          <ChevronLeft className="w-4 h-4" />
          Retour
        </button>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-slate-50 text-xl font-semibold tracking-tight">Rapport journalier de chantier</CardTitle>
            <CardDescription>Remplissez les informations du chantier</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* INFORMATIONS GÉNÉRALES */}
              <SectionTitle label="Informations générales" />

              <Field label="Projet">
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Sélectionnez un projet" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) =>
                    <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.project_number})
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </Field>

              {selectedProjectObj?.address &&
              <div className="bg-zinc-800/50 rounded-lg px-3 py-2 text-sm text-zinc-400 border border-zinc-700/50">
                  <span className="text-zinc-500">Adresse : </span>{selectedProjectObj.address}
                </div>
              }

              <Field label="Date du rapport" hint="Vous pouvez remplir des rapports des jours precedents">
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-white" />

              </Field>

              <div className="bg-zinc-800/30 rounded-lg px-3 py-2 text-sm text-zinc-400 border border-zinc-700/50">
                <span className="text-zinc-500">Contremaitre : </span><span className="text-white font-medium">{currentUser?.full_name}</span>
              </div>

              {/* SOUS-TRAITANTS */}
              <SectionTitle label="Sous-traitants" />

              <Field label="Sous-traitants sur le chantier">
                <Textarea
                  value={formData.subcontractor}
                  onChange={(e) => setFormData({ ...formData, subcontractor: e.target.value })}
                  placeholder="Noms des sous-traitants presents (optionnel)"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 resize-none"
                  rows={2} />

              </Field>

              {/* ÉQUIPEMENTS */}
              <SectionTitle label="Équipements & machinerie" />

              <Field label="Equipements et machinerie utilises">
                <EquipmentPicker
                  value={formData.machine}
                  onChange={(val) => setFormData({ ...formData, machine: val })}
                  hoursValue={formData.machine_hours}
                  onHoursChange={(val) => setFormData({ ...formData, machine_hours: val })} />

              </Field>

              <Field label="Camions sur le chantier">
                <TruckPicker
                  value={formData.trucks}
                  onChange={(val) => setFormData({ ...formData, trucks: val })} />
              </Field>

              {/* TRAVAUX */}
              <SectionTitle label="Description des travaux" />

              <Field label="Description des travaux effectues" required>
                <Textarea
                  required
                  value={formData.work_description}
                  onChange={(e) => setFormData({ ...formData, work_description: e.target.value })}
                  placeholder="Decrivez les travaux effectues durant la journee..."
                  className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 resize-none"
                  rows={4} />

              </Field>

              {/* RETARDS / OBSERVATIONS */}
              <SectionTitle label="Retards, problèmes ou observations" />

              <Field label="Retards, problemes ou observations">
                <Textarea
                  value={formData.other_notes}
                  onChange={(e) => setFormData({ ...formData, other_notes: e.target.value })}
                  placeholder="Notez tout retard, probleme rencontre ou observation importante..."
                  className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 resize-none"
                  rows={3} />

              </Field>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(createPageUrl("DailyReports"))}
                  className="flex-1">

                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-700 hover:bg-green-600">

                  {loading ? "Creation..." : "Creer le rapport"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>);

}