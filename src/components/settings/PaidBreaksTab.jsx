import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function PaidBreaksTab({ users, onRefresh }) {
  const activeUsers = users.filter(u => u.is_active !== false);
  const [saving, setSaving] = useState(null); // userId being saved

  const handleToggle = async (user) => {
    setSaving(user.id);
    await base44.entities.AppUser.update(user.id, { has_paid_breaks: !user.has_paid_breaks });
    setSaving(null);
    onRefresh();
  };

  const enabledCount = activeUsers.filter(u => u.has_paid_breaks).length;

  return (
    <div>
      <p className="text-zinc-400 text-sm mb-5">
        Activez les pauses payées (2 × 15 min) pour les employés qui y ont droit.
        <span className="ml-2 px-2 py-0.5 bg-green-900/30 border border-green-700/40 text-green-400 text-xs rounded-full font-semibold">
          {enabledCount} / {activeUsers.length} activés
        </span>
      </p>

      <div className="space-y-2">
        {activeUsers.map(user => {
          const enabled = !!user.has_paid_breaks;
          const isSaving = saving === user.id;
          return (
            <div
              key={user.id}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                enabled ? "bg-green-950/20 border-green-800/40" : "bg-zinc-900 border-zinc-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">{user.full_name?.[0]}</span>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{user.full_name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="px-2 py-0.5 bg-zinc-800 text-zinc-500 text-xs rounded-full">{user.role}</span>
                    <span className="px-2 py-0.5 bg-zinc-800 text-zinc-500 text-xs rounded-full">{user.group}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleToggle(user)}
                disabled={isSaving}
                className={`relative w-12 h-6 rounded-full transition-all shrink-0 ${
                  enabled ? "bg-green-600" : "bg-zinc-700"
                } ${isSaving ? "opacity-50" : ""}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                  enabled ? "left-6" : "left-0.5"
                }`} />
              </button>
            </div>
          );
        })}

        {activeUsers.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-10">Aucun utilisateur actif.</p>
        )}
      </div>
    </div>
  );
}