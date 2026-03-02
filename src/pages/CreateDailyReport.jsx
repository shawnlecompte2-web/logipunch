import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Calendar } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function getStoredUser() {
  try { return JSON.parse(sessionStorage.getItem("logipunch_user") || "null"); } catch { return null; }
}

function getStoredCompany() {
  try { return JSON.parse(sessionStorage.getItem("logipunch_company") || "null"); } catch { return null; }
}

export default function CreateDailyReportPage() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const currentCompany = getStoredCompany();
  
  const [selectedProject, setSelectedProject] = useState("");
  const [formData, setFormData] = useState({
    machine: "",
    truck_count: "",
    subcontractor: "",
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProject || !formData.work_description.trim()) {
      alert("Veuillez sélectionner un projet et décrire les travaux");
      return;
    }

    setLoading(true);
    try {
      const project = projects.find(p => p.id === selectedProject);
      const today = new Date().toISOString().split("T")[0];
      const weekStart = new Date();
      const day = weekStart.getDay();
      weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
      const weekStartStr = weekStart.toISOString().split("T")[0];

      await base44.entities.DailyReport.create({
        user_id: currentUser.id,
        user_name: currentUser.full_name,
        project_id: selectedProject,
        project_name: project?.name,
        report_date: today,
        week_start: weekStartStr,
        machine: formData.machine,
        truck_count: formData.truck_count ? parseInt(formData.truck_count) : null,
        subcontractor: formData.subcontractor,
        work_description: formData.work_description,
        other_notes: formData.other_notes,
        company_id: currentCompany?.id
      });

      alert("Rapport créé avec succès!");
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
          className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour
        </button>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle>Créer un rapport journalier</CardTitle>
            <CardDescription>Remplissez les informations du projet</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Selection */}
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Projet</label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Sélectionnez un projet" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.project_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Machine */}
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Machine utilisée</label>
                <Input
                  value={formData.machine}
                  onChange={(e) => setFormData({...formData, machine: e.target.value})}
                  placeholder="Ex: Excavatrice, Pelleteuse, etc."
                  className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500"
                />
              </div>

              {/* Truck Count */}
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Nombre de camions au projet</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.truck_count}
                  onChange={(e) => setFormData({...formData, truck_count: e.target.value})}
                  placeholder="Ex: 2"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500"
                />
              </div>

              {/* Subcontractor */}
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Sous-traitant sur le projet</label>
                <Textarea
                  value={formData.subcontractor}
                  onChange={(e) => setFormData({...formData, subcontractor: e.target.value})}
                  placeholder="Nom du sous-traitant (optionnel)"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 resize-none"
                  rows="2"
                />
              </div>

              {/* Work Description */}
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Description des travaux *</label>
                <Textarea
                  required
                  value={formData.work_description}
                  onChange={(e) => setFormData({...formData, work_description: e.target.value})}
                  placeholder="Décrivez les travaux effectués..."
                  className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 resize-none"
                  rows="4"
                />
              </div>

              {/* Other Notes */}
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Autres</label>
                <Textarea
                  value={formData.other_notes}
                  onChange={(e) => setFormData({...formData, other_notes: e.target.value})}
                  placeholder="Autres notes (optionnel)"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 resize-none"
                  rows="3"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(createPageUrl("DailyReports"))}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-700 hover:bg-green-600"
                >
                  {loading ? "Création..." : "Créer le rapport"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}