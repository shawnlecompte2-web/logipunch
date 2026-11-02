import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Check, X, Pencil } from "lucide-react";
import { formatRange, dayCount } from "@/utils/leaveDates";
import LeaveRequestForm from "@/components/leave/LeaveRequestForm";

export default function LeaveApprovals({ requests, user, companyId, onChanged }) {
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(null);

  const pending = requests
    .filter((r) => r.status === "pending")
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  const decide = async (request, status) => {
    setBusyId(request.id);
    await base44.entities.LeaveRequest.update(request.id, {
      status,
      approved_by: user.full_name,
      approved_at: new Date().toISOString(),
    });
    setBusyId(null);
    onChanged();
  };

  const form = (
    <LeaveRequestForm
      open={!!editing}
      editRequest={editing}
      user={user}
      companyId={companyId}
      onClose={() => setEditing(null)}
      onSaved={() => { setEditing(null); onChanged(); }}
    />
  );

  if (pending.length === 0) {
    return (
      <>
        <p className="text-zinc-600 text-sm text-center py-6">Aucune demande en attente.</p>
        {form}
      </>
    );
  }

  return (
    <div className="space-y-2">
      {pending.map((r) => (
        <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{r.user_name}</p>
              <p className="text-zinc-400 text-xs mt-0.5">
                {formatRange(r.start_date, r.end_date)} · {dayCount(r.start_date, r.end_date)} j
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[11px] rounded-full">{r.leave_type}</span>
                {r.user_id === user.id && (
                  <span className="px-2 py-0.5 bg-blue-900/40 border border-blue-800/40 text-blue-300 text-[11px] rounded-full">vous</span>
                )}
                {r.reason && <span className="text-zinc-500 text-[11px] truncate">{r.reason}</span>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setEditing(r)}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-all"
              >
                <Pencil size={15} className="text-zinc-300" />
              </button>
              <button
                onClick={() => decide(r, "approved")}
                disabled={busyId === r.id}
                className="p-2 bg-green-900/30 hover:bg-green-900/50 border border-green-800/40 rounded-lg transition-all disabled:opacity-40"
              >
                <Check size={16} className="text-green-400" />
              </button>
              <button
                onClick={() => decide(r, "rejected")}
                disabled={busyId === r.id}
                className="p-2 bg-red-900/20 hover:bg-red-900/40 border border-red-800/30 rounded-lg transition-all disabled:opacity-40"
              >
                <X size={16} className="text-red-400" />
              </button>
            </div>
          </div>
        </div>
      ))}
      {form}
    </div>
  );
}