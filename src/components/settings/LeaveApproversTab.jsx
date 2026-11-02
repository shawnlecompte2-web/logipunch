import { useState } from "react";
import { base44 } from "@/api/base44Client";

export default function LeaveApproversTab({ users, company, onRefresh }) {
  const activeUsers = users.filter((u) => u.is_active !== false);
  const [saving, setSaving] = useState(null);
  const approvers = Array.isArray(company?.leave_approvers) ? company.leave_approvers : [];

  const toggle = async (userToToggle) => {
    if (!company?.id) return;
    setSaving(userToToggle.id);
    const next = approvers.includes(userToToggle.id)
      ? approvers.filter((id) => id !== userToToggle.id)
      : [...approvers, userToToggle.id];
    await base44.entities.Company.update(company.id, { leave_approvers: next });
    await onRefresh();
    setSaving(null);
  };

  return (
    <div>
      <p className="text-zinc-400 text-sm mb-5">
        Choisissez les employés qui peuvent approuver les demandes de congé.
        <span className="ml-2 px-2 py-0.5 bg-green-900/30 border border-green-700/40 text-green-400 text-xs rounded-full font-semibold">
          {approvers.length} sélectionné{approvers.length > 1 ? "s" : ""}
        </span>
      </p>

      <div className="space-y-2">
        {activeUsers.map((u) => {
          const enabled = approvers.includes(u.id);
          return (
            <button
              key={u.id}
              onClick={() => toggle(u)}
              disabled={saving === u.id}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                enabled ? "bg-green-950/20 border-green-800/40" : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
              } ${saving === u.id ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">{u.full_name?.[0]}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{u.full_name}</p>
                  <span className="text-zinc-500 text-xs">{u.role}</span>
                </div>
              </div>
              <span
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                  enabled ? "bg-green-600 border-green-600" : "border-zinc-600"
                }`}
              >
                {enabled && <span className="text-white text-xs font-bold">✓</span>}
              </span>
            </button>
          );
        })}
        {activeUsers.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-10">Aucun utilisateur actif.</p>
        )}
      </div>
    </div>
  );
}