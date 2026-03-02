import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, ChevronLeft, Download } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

function getStoredCompany() {
  try { return JSON.parse(sessionStorage.getItem("logipunch_company") || "null"); } catch { return null; }
}

export default function ReportCompilationPage() {
  const navigate = useNavigate();
  const currentCompany = getStoredCompany();
  const [expandedProject, setExpandedProject] = useState(null);
  const [expandedWeek, setExpandedWeek] = useState(null);

  const { data: reports } = useQuery({
    queryKey: ['dailyReports', currentCompany?.id],
    queryFn: () => base44.entities.DailyReport.filter({ company_id: currentCompany?.id }),
    enabled: !!currentCompany?.id,
    initialData: []
  });

  const { data: projects } = useQuery({
    queryKey: ['projects', currentCompany?.id],
    queryFn: () => base44.entities.Project.filter({ company_id: currentCompany?.id }),
    enabled: !!currentCompany?.id,
    initialData: []
  });

  const { data: punchEntries } = useQuery({
    queryKey: ['punchEntries', currentCompany?.id],
    queryFn: () => base44.entities.PunchEntry.filter({ company_id: currentCompany?.id }),
    enabled: !!currentCompany?.id,
    initialData: []
  });

  const structure = useMemo(() => {
    const byProject = {};
    
    reports.forEach(report => {
      if (!byProject[report.project_id]) {
        byProject[report.project_id] = {};
      }
      if (!byProject[report.project_id][report.week_start]) {
        byProject[report.project_id][report.week_start] = {};
      }
      if (!byProject[report.project_id][report.week_start][report.report_date]) {
        byProject[report.project_id][report.week_start][report.report_date] = [];
      }
      byProject[report.project_id][report.week_start][report.report_date].push(report);
    });

    return byProject;
  }, [reports]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("fr-CA", { weekday: "short", month: "short", day: "numeric" });
  };

  const formatWeek = (startStr) => {
    const start = new Date(startStr + "T12:00:00");
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString("fr-CA", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("fr-CA", { month: "short", day: "numeric", year: "numeric" })}`;
  };

  const getTotalHours = (projectId, weekStart, date) => {
    return punchEntries
      .filter(e => 
        e.project_id === projectId && 
        e.week_start === weekStart && 
        e.work_date === date
      )
      .reduce((sum, e) => sum + (e.total_hours || 0), 0)
      .toFixed(1);
  };

  const getWorkersForDay = (projectId, date) => {
    const entries = punchEntries.filter(e => e.project_id === projectId && e.work_date === date);
    const workers = [];
    const seen = new Set();
    
    entries.forEach(e => {
      if (!seen.has(e.user_id)) {
        seen.add(e.user_id);
        const userEntries = entries.filter(entry => entry.user_id === e.user_id);
        const totalHours = userEntries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
        const punchIn = userEntries[0]?.punch_in;
        const punchOut = userEntries[userEntries.length - 1]?.punch_out;
        const lunchBreak = userEntries[0]?.lunch_break_custom || userEntries[0]?.lunch_break || 0;
        
        workers.push({
          id: e.user_id,
          name: e.user_name,
          punchIn,
          punchOut,
          totalHours: totalHours.toFixed(2),
          lunchBreak
        });
      }
    });
    return workers;
  };

  const projectIds = Object.keys(structure).sort();

  const downloadPDF = async (type, projectId, projectName, date, weekStart, dayReports, workers) => {
    try {
      const totalHours = getTotalHours(projectId, weekStart, date);
      const response = await base44.functions.invoke('generateReportPDF', {
        type,
        projectId,
        projectName,
        date,
        weekStart,
        reports: dayReports,
        workers,
        totalHours
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'day'
        ? `rapport_${new Date(date + 'T12:00:00').toLocaleDateString('fr-CA')}.pdf`
        : `rapport_semaine_${weekStart}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(createPageUrl("DailyReports"))}
          className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight mb-2">Compilations des rapports</h1>
          <p className="text-zinc-500">Rapports organisés par projet, semaine et jour</p>
        </div>

        {projectIds.length === 0 ? (
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-8 text-center">
            <p className="text-zinc-400">Aucun rapport créé pour le moment</p>
          </div>
        ) : (
          <div className="space-y-4">
            {projectIds.map(projectId => {
              const project = projects.find(p => p.id === projectId);
              const weeks = Object.keys(structure[projectId]).sort().reverse();

              return (
                <div key={projectId} className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden">
                  <Collapsible
                    open={expandedProject === projectId}
                    onOpenChange={() => setExpandedProject(expandedProject === projectId ? null : projectId)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center gap-3 p-4 hover:bg-zinc-800/50 transition-colors cursor-pointer">
                        <ChevronRight className={`w-5 h-5 text-zinc-400 transition-transform ${expandedProject === projectId ? 'rotate-90' : ''}`} />
                        <div className="flex-1 text-left">
                          <h3 className="font-bold text-lg">{project?.name || projectId}</h3>
                          <p className="text-sm text-zinc-500">{weeks.length} semaine(s)</p>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="border-t border-zinc-800">
                      <div className="space-y-2 p-4">
                        {weeks.map(weekStart => {
                          const dates = Object.keys(structure[projectId][weekStart]).sort().reverse();
                          const weekKey = `${projectId}-${weekStart}`;

                          return (
                            <div key={weekStart} className="bg-zinc-800/50 rounded-lg overflow-hidden">
                              <Collapsible
                                open={expandedWeek === weekKey}
                                onOpenChange={() => setExpandedWeek(expandedWeek === weekKey ? null : weekKey)}
                              >
                                <CollapsibleTrigger className="w-full">
                                  <div className="flex items-center gap-3 p-3 hover:bg-zinc-700/50 transition-colors cursor-pointer">
                                    <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${expandedWeek === weekKey ? '' : '-rotate-90'}`} />
                                    <div className="flex-1 text-left">
                                      <p className="font-semibold text-sm">Semaine du {formatWeek(weekStart)}</p>
                                    </div>
                                    <p className="text-xs text-zinc-400">{dates.length} jour(s)</p>
                                  </div>
                                </CollapsibleTrigger>

                                <CollapsibleContent className="border-t border-zinc-700">
                                  <div className="space-y-2 p-3 bg-zinc-900/30">
                                    {dates.map(date => {
                                      const dayReports = structure[projectId][weekStart][date];
                                      const totalHours = getTotalHours(projectId, weekStart, date);

                                      const workers = getWorkersForDay(projectId, date);

                                      return (
                                        <div key={date} className="bg-zinc-800/30 rounded p-3 border border-zinc-700">
                                          <div className="flex justify-between items-start mb-3">
                                            <p className="font-semibold text-sm">{formatDate(date)}</p>
                                            <p className="text-xs bg-green-900/40 text-green-400 px-2 py-1 rounded">{totalHours}h d'heures</p>
                                          </div>

                                          {workers.length > 0 && (
                                            <div className="mb-3 p-3 bg-zinc-900/40 rounded border border-zinc-700/50 space-y-2">
                                              <p className="text-xs text-zinc-400 font-semibold">Employés:</p>
                                              {workers.map(w => (
                                                <div key={w.id} className="text-xs bg-blue-900/20 text-blue-300 px-3 py-2 rounded border border-blue-700/30">
                                                  <p className="font-semibold mb-1">{w.name}</p>
                                                  <div className="grid grid-cols-2 gap-2 text-zinc-300">
                                                    {w.punchIn && <p>Arrivée: <span className="text-blue-300">{new Date(w.punchIn).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}</span></p>}
                                                    {w.punchOut && <p>Départ: <span className="text-blue-300">{new Date(w.punchOut).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}</span></p>}
                                                    {w.lunchBreak > 0 && <p>Dîner: <span className="text-blue-300">{w.lunchBreak} min</span></p>}
                                                    <p>Total: <span className="text-green-400 font-semibold">{w.totalHours}h</span></p>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}

                                          {dayReports.map(report => (
                                            <div key={report.id} className="text-xs text-zinc-300 space-y-1 bg-zinc-900/50 p-2 rounded border border-zinc-700/50">
                                              <p><span className="text-zinc-500">Employé:</span> {report.user_name}</p>
                                              {report.machine && <p><span className="text-zinc-500">Machine:</span> {report.machine}</p>}
                                              {report.truck_count && <p><span className="text-zinc-500">Camions:</span> {report.truck_count}</p>}
                                              {report.subcontractor && <p><span className="text-zinc-500">Sous-traitant:</span> {report.subcontractor}</p>}
                                              <p><span className="text-zinc-500">Travaux:</span> {report.work_description}</p>
                                              {report.other_notes && <p><span className="text-zinc-500">Notes:</span> {report.other_notes}</p>}
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}