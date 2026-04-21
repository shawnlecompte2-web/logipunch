import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronRight, Users, Clock, Calendar } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

function getStoredCompany() {
  try { return JSON.parse(sessionStorage.getItem("logipunch_company") || "null"); } catch { return null; }
}

function toHM(hours) {
  const h = Math.floor(parseFloat(hours) || 0);
  const m = Math.round(((parseFloat(hours) || 0) - h) * 60);
  return `${h}h${m.toString().padStart(2, "0")}`;
}

export default function ProjectSummaryPage() {
  const currentCompany = getStoredCompany();
  const [expandedProject, setExpandedProject] = useState(null);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", currentCompany?.id],
    queryFn: () => base44.entities.Project.filter({ company_id: currentCompany?.id }),
    enabled: !!currentCompany?.id,
  });

  const { data: punchEntries = [] } = useQuery({
    queryKey: ["punchEntries", currentCompany?.id],
    queryFn: () => base44.entities.PunchEntry.filter({ company_id: currentCompany?.id }),
    enabled: !!currentCompany?.id,
  });

  // Build summary per project
  const projectSummaries = useMemo(() => {
    return projects.map(project => {
      const entries = punchEntries.filter(e => e.project_id === project.id && e.status !== "active");

      // Workers summary
      const workersMap = {};
      entries.forEach(e => {
        if (!workersMap[e.user_id]) {
          workersMap[e.user_id] = {
            id: e.user_id,
            name: e.user_name || "-",
            role: e.role || "-",
            totalHours: 0,
            days: new Set(),
          };
        }
        workersMap[e.user_id].totalHours += e.total_hours || 0;
        const d = e.work_date || (e.punch_in ? e.punch_in.substring(0, 10) : null);
        if (d) workersMap[e.user_id].days.add(d);
      });

      const workers = Object.values(workersMap).sort((a, b) => b.totalHours - a.totalHours);
      const totalHours = workers.reduce((s, w) => s + w.totalHours, 0);

      // All unique dates worked
      const allDates = [...new Set(entries.map(e => e.work_date || (e.punch_in ? e.punch_in.substring(0, 10) : null)).filter(Boolean))].sort().reverse();

      return { project, workers, totalHours, allDates };
    }).filter(s => s.workers.length > 0);
  }, [projects, punchEntries]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight mb-1">Résumé par projet</h1>
          <p className="text-zinc-500 text-sm">Vue d'ensemble des heures et employés par chantier</p>
        </div>

        {projectSummaries.length === 0 ? (
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-10 text-center">
            <p className="text-zinc-500">Aucune donnée disponible pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {projectSummaries.map(({ project, workers, totalHours, allDates }) => (
              <div key={project.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                <Collapsible
                  open={expandedProject === project.id}
                  onOpenChange={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center gap-3 p-4 hover:bg-zinc-800/50 transition-colors cursor-pointer">
                      <ChevronRight className={`w-5 h-5 text-zinc-400 transition-transform shrink-0 ${expandedProject === project.id ? "rotate-90" : ""}`} />
                      <div className="flex-1 text-left min-w-0">
                        <h3 className="font-bold text-base md:text-lg leading-tight">{project.name}</h3>
                        {project.project_number && (
                          <p className="text-xs text-zinc-500 mt-0.5">#{project.project_number}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex items-center gap-1.5 text-zinc-400 text-sm">
                          <Users className="w-4 h-4" />
                          <span>{workers.length}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-green-400 font-bold text-sm">
                          <Clock className="w-4 h-4" />
                          <span>{toHM(totalHours)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-500 text-xs hidden md:flex">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{allDates.length} jour{allDates.length !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="border-t border-zinc-800">
                    <div className="p-4">
                      {/* Stats bar */}
                      <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                          <p className="text-2xl font-black text-green-400">{toHM(totalHours)}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">Total heures</p>
                        </div>
                        <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                          <p className="text-2xl font-black text-white">{workers.length}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">Employé{workers.length !== 1 ? "s" : ""}</p>
                        </div>
                        <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                          <p className="text-2xl font-black text-blue-400">{allDates.length}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">Jour{allDates.length !== 1 ? "s" : ""} travaillé{allDates.length !== 1 ? "s" : ""}</p>
                        </div>
                      </div>

                      {/* Workers table */}
                      <div className="rounded-lg overflow-hidden border border-zinc-700/60">
                        {/* Header */}
                        <div className="grid grid-cols-12 bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-400 uppercase tracking-wide">
                          <div className="col-span-5">Employé</div>
                          <div className="col-span-3">Rôle</div>
                          <div className="col-span-2 text-center">Jours</div>
                          <div className="col-span-2 text-right">Total</div>
                        </div>

                        {workers.map((w, i) => (
                          <div
                            key={w.id}
                            className={`grid grid-cols-12 px-4 py-3 items-center text-sm border-t border-zinc-800/60 ${i % 2 === 0 ? "bg-zinc-900/30" : "bg-zinc-900/10"}`}
                          >
                            <div className="col-span-5 font-semibold text-white truncate pr-2">{w.name}</div>
                            <div className="col-span-3 text-zinc-400 text-xs truncate">{w.role}</div>
                            <div className="col-span-2 text-center text-zinc-400 text-xs">{w.days.size}</div>
                            <div className="col-span-2 text-right font-bold text-green-400">{toHM(w.totalHours)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}