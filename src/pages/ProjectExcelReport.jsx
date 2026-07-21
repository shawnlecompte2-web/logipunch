import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, FileSpreadsheet, Download } from "lucide-react";
import { generateProjectExcel } from "@/utils/generateProjectExcel";

function getStoredCompany() {
  try { return JSON.parse(sessionStorage.getItem("logipunch_company") || "null"); } catch { return null; }
}

function getMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function getFriday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) + 4;
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function getDatesInRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate + "T12:00:00");
  const end = new Date(endDate + "T12:00:00");
  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export default function ProjectExcelReportPage() {
  const navigate = useNavigate();
  const currentCompany = getStoredCompany();
  const [selectedProject, setSelectedProject] = useState("");
  const [startDate, setStartDate] = useState(getMonday());
  const [endDate, setEndDate] = useState(getFriday());
  const [loading, setLoading] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", currentCompany?.id],
    queryFn: () => base44.entities.Project.filter({ company_id: currentCompany?.id }),
    enabled: !!currentCompany?.id,
  });

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => (a.project_number || "").localeCompare(b.project_number || "", undefined, { numeric: true })),
    [projects]
  );

  const dates = useMemo(() => getDatesInRange(startDate, endDate), [startDate, endDate]);

  const handleGenerate = async () => {
    if (!selectedProject) return;
    setLoading(true);
    try {
      const project = projects.find((p) => p.id === selectedProject);
      const [reports, punchEntries, company] = await Promise.all([
        base44.entities.DailyReport.filter({ project_id: selectedProject, company_id: currentCompany?.id }),
        base44.entities.PunchEntry.filter({ project_id: selectedProject, company_id: currentCompany?.id }),
        base44.entities.Company.get(currentCompany?.id),
      ]);

      const filteredReports = reports.filter((r) => dates.includes(r.report_date));
      const filteredPunches = punchEntries.filter((e) => {
        const entryDate = e.work_date || (e.punch_in ? e.punch_in.substring(0, 10) : null);
        return entryDate && dates.includes(entryDate);
      });

      generateProjectExcel({
        project,
        company,
        dates,
        reports: filteredReports,
        punchEntries: filteredPunches,
      });
    } catch (error) {
      alert("Erreur lors de la génération du fichier Excel: " + error.message);
    }
    setLoading(false);
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

        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight mb-2">Tableau Excel par projet</h1>
          <p className="text-zinc-500">Génère un tableau Excel automatique à partir des rapports journaliers</p>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-slate-50 text-xl font-semibold tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-400" />
              Configuration
            </CardTitle>
            <CardDescription>Sélectionnez un projet et une plage de dates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {/* Projet */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Projet</label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Sélectionnez un projet" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.project_number ? `(${p.project_number})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Date de début</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Date de fin</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* Info */}
              <div className="bg-zinc-800/50 rounded-lg px-4 py-3 text-sm text-zinc-400 border border-zinc-700/50">
                <p>
                  Le tableau contiendra <span className="text-white font-medium">{dates.length} jour(s)</span> de données,
                  regroupant la main d'œuvre, les équipements, le transport, les matériaux et les descriptions de travaux.
                </p>
              </div>

              {/* Generate */}
              <Button
                onClick={handleGenerate}
                disabled={loading || !selectedProject}
                className="w-full bg-green-700 hover:bg-green-600 h-12"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Générer le tableau Excel
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}