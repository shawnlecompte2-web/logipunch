import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Check } from "lucide-react";

const EXTRA_PAGES = [
  { key: "DailyReports", label: "Rapports" },
  { key: "Approvals", label: "Approbation" },
  { key: "ForceCheckout", label: "Gestion pointages" },
  { key: "TimeSheet", label: "Heures" },
  { key: "ActiveUsers", label: "Actifs" },
  { key: "Settings", label: "Réglages" },
];

export default function PageAccessTab({ users, onRefresh }) {
  const activeUsers = users.filter(u => u.is_active !== false && !u.is_admin);
  const [saving, setSaving] = useState(null); // userId being saved

  const togglePage = async (user, pageKey) => {
    const current = Array.isArray(user.allowed_pages) ? user.allowed_pages : [];
    const updated = current.includes(pageKey)
      ? current.filter(p => p !== pageKey)
      : [...current, pageKey];
    setSaving(user.id);
    await base44.entities.AppUser.update(user.id, { allowed_pages: updated });
    setSaving(null);
    onRefresh();
  };

  return (
    <div>
      <p className="text-zinc-500 text-sm mb-5">
        Gérez les pages accessibles par chaque employé. Punch et Mes heures sont toujours accessibles. Les administrateurs ont accès à tout.
      </p>

      {/* Header row */}
      <div className="hidden md:flex items-center gap-2 px-4 mb-2">
        <div className="w-48 shrink-0" />
        {EXTRA_PAGES.map(p => (
          <div key={p.key} className="flex-1 text-center text-zinc-500 text-xs font-semibold uppercase tracking-wide">
            {p.label}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {activeUsers.map(user => {
          const allowed = Array.isArray(user.allowed_pages) ? user.allowed_pages : [];
          const isSaving = saving === user.id;
          return (
            <div key={user.id} className={`bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 transition-all ${isSaving ? "opacity-60" : ""}`}>
              {/* Mobile: user name + toggles stacked */}
              <div className="flex items-center gap-3 mb-3 md:mb-0">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">{user.full_name?.[0]}</span>
                </div>
                <div className="min-w-0 md:w-40 md:shrink-0">
                  <p className="text-white font-semibold text-sm truncate">{user.full_name}</p>
                  <p className="text-zinc-600 text-xs truncate">{user.role}</p>
                </div>

                {/* Desktop: inline toggles */}
                <div className="hidden md:flex flex-1 items-center gap-2">
                  {EXTRA_PAGES.map(p => {
                    const active = allowed.includes(p.key);
                    return (
                      <button
                        key={p.key}
                        onClick={() => togglePage(user, p.key)}
                        disabled={isSaving}
                        className={`flex-1 h-9 rounded-lg border transition-all flex items-center justify-center ${
                          active
                            ? "bg-green-900/40 border-green-700/60 text-green-400"
                            : "bg-zinc-800 border-zinc-700 text-zinc-600 hover:border-zinc-500"
                        }`}
                      >
                        {active && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile: page chips */}
              <div className="flex flex-wrap gap-2 md:hidden">
                {EXTRA_PAGES.map(p => {
                  const active = allowed.includes(p.key);
                  return (
                    <button
                      key={p.key}
                      onClick={() => togglePage(user, p.key)}
                      disabled={isSaving}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        active
                          ? "bg-green-900/40 border-green-700/60 text-green-400"
                          : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {activeUsers.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-10">Aucun utilisateur non-admin.</p>
        )}
      </div>
    </div>
  );
}