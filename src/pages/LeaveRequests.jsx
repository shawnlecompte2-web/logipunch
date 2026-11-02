import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CalendarDays, Plus, ChevronLeft, ChevronRight, Trash2, CheckCircle2, XCircle, Clock } from "lucide-react";
import LeaveCalendar from "@/components/leave/LeaveCalendar";
import LeaveRequestForm from "@/components/leave/LeaveRequestForm";
import LeaveApprovals from "@/components/leave/LeaveApprovals";
import { MONTHS, formatRange, dayCount } from "@/utils/leaveDates";

function getStoredUser() {
  try { return JSON.parse(sessionStorage.getItem("logipunch_user") || "null"); } catch { return null; }
}
function getStoredCompany() {
  try {
    return JSON.parse(sessionStorage.getItem("logipunch_company") || localStorage.getItem("logipunch_company") || "null");
  } catch { return null; }
}

const STATUS_STYLE = {
  pending: { label: "En attente", cls: "bg-amber-900/30 text-amber-300 border-amber-800/40", icon: Clock },
  approved: { label: "Approuvé", cls: "bg-green-900/30 text-green-300 border-green-800/40", icon: CheckCircle2 },
  rejected: { label: "Refusé", cls: "bg-red-900/30 text-red-300 border-red-800/40", icon: XCircle },
};

export default function LeaveRequests() {
  const [user] = useState(getStoredUser);
  const [company, setCompany] = useState(getStoredCompany);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [prefill, setPrefill] = useState(null);

  const companyId = company?.id;

  const load = async () => {
    if (!companyId) { setLoading(false); return; }
    const [res, freshCompany] = await Promise.all([
      base44.entities.LeaveRequest.filter({ company_id: companyId }, { sort: "-start_date", limit: 500 }),
      base44.entities.Company.get(companyId).catch(() => null),
    ]);
    setRequests(res.items || []);
    if (freshCompany) setCompany(freshCompany);
    setLoading(false);
  };

  useEffect(() => { load(); }, [companyId]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-zinc-500 text-sm">Connectez-vous pour accéder aux congés.</p>
      </div>
    );
  }

  const isApprover =
    user.is_admin === true ||
    (Array.isArray(company?.leave_approvers) && company.leave_approvers.includes(user.id));

  const myRequests = requests
    .filter((r) => r.user_id === user.id)
    .sort((a, b) => b.start_date.localeCompare(a.start_date));

  const visibleRequests = requests.filter((r) => r.status !== "rejected");

  const moveMonth = (delta) => {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
  };

  const openForm = (dateKey) => {
    setPrefill(dateKey || null);
    setShowForm(true);
  };

  const cancelRequest = async (request) => {
    if (!window.confirm("Annuler cette demande?")) return;
    await base44.entities.LeaveRequest.delete(request.id);
    load();
  };

  return (
    <div className="min-h-screen px-4 py-5 md:px-8 md:py-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-white text-xl md:text-2xl font-bold flex items-center gap-2">
            <CalendarDays size={20} className="text-green-400" /> Congés
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Calendrier des congés de l'équipe</p>
        </div>
        <button
          onClick={() => openForm(null)}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-all shrink-0"
        >
          <Plus size={16} /> Demande
        </button>
      </div>

      <div className="flex items-center justify-between mb-3">
        <button onClick={() => moveMonth(-1)} className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all">
          <ChevronLeft size={16} className="text-zinc-400" />
        </button>
        <p className="text-white font-bold text-sm md:text-base capitalize">
          {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
        </p>
        <button onClick={() => moveMonth(1)} className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all">
          <ChevronRight size={16} className="text-zinc-400" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-500 text-sm py-10 justify-center">
          <div className="w-4 h-4 border-2 border-zinc-700 border-t-green-500 rounded-full animate-spin" />
          Chargement...
        </div>
      ) : (
        <>
          <LeaveCalendar
            year={cursor.getFullYear()}
            month={cursor.getMonth()}
            requests={visibleRequests}
            currentUserId={user.id}
            onDayClick={openForm}
          />
          <p className="text-zinc-600 text-[11px] mt-2 mb-6">
            Touchez une journée pour faire une demande à cette date.
          </p>

          {isApprover && (
            <section className="mb-7">
              <h2 className="text-zinc-400 text-xs uppercase tracking-widest font-bold mb-2">
                Demandes à approuver
              </h2>
              <LeaveApprovals requests={requests} user={user} onChanged={load} />
            </section>
          )}

          <section>
            <h2 className="text-zinc-400 text-xs uppercase tracking-widest font-bold mb-2">Mes demandes</h2>
            {myRequests.length === 0 ? (
              <p className="text-zinc-600 text-sm text-center py-6">Aucune demande pour le moment.</p>
            ) : (
              <div className="space-y-2">
                {myRequests.map((r) => {
                  const st = STATUS_STYLE[r.status] || STATUS_STYLE.pending;
                  const Icon = st.icon;
                  return (
                    <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm">{formatRange(r.start_date, r.end_date)}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[11px] rounded-full">{r.leave_type}</span>
                          <span className="text-zinc-500 text-[11px]">{dayCount(r.start_date, r.end_date)} j</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`flex items-center gap-1 px-2 py-1 border text-[11px] font-semibold rounded-full ${st.cls}`}>
                          <Icon size={11} /> {st.label}
                        </span>
                        {r.status === "pending" && (
                          <button
                            onClick={() => cancelRequest(r)}
                            className="p-2 bg-red-900/20 hover:bg-red-900/40 rounded-lg transition-all"
                          >
                            <Trash2 size={13} className="text-red-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      <LeaveRequestForm
        open={showForm}
        defaultDate={prefill}
        user={user}
        companyId={companyId}
        onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); load(); }}
      />
    </div>
  );
}