import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function ApprovalsTab({ users, onRefresh }) {
  const activeUsers = users.filter(u => u.is_active !== false);
  const [saving, setSaving] = useState(false);
  const [assignments, setAssignments] = useState({});

  // Re-initialize whenever users list changes (e.g. new user added)
  useEffect(() => {
    const map = {};
    activeUsers.forEach(u => {
      if (Array.isArray(u.approved_by)) map[u.id] = u.approved_by;
      else if (u.approved_by) map[u.id] = [u.approved_by];
      else map[u.id] = [];
    });
    setAssignments(map);
  }, [users]);

  const handleSave = async () => {
    setSaving(true);
    await Promise.all(
      activeUsers.map(u => base44.entities.AppUser.update(u.id, { approved_by: assignments[u.id] || [] }))
    );
    setSaving(false);
    onRefresh();
  };

  const toggleApprover = (workerId, approverId) => {
    setAssignments(a => {
      const current = a[workerId] || [];
      if (approverId === "auto") {
        return { ...a, [workerId]: current.includes("auto") ? [] : ["auto"] };
      }
      const withoutAuto = current.filter(id => id !== "auto");
      return {
        ...a,
        [workerId]: withoutAuto.includes(approverId)
          ? withoutAuto.filter(id => id !== approverId)
          : [...withoutAuto, approverId],
      };
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-zinc-400 text-sm">Définissez qui approuve les heures de chaque employé.</p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
        >
          {saving ? "..." : "Sauvegarder"}
        </button>
      </div>

      <div className="space-y-3">
        {activeUsers.map(worker => {
          const selected = assignments[worker.id] || [];
          const isAuto = selected.includes("auto");
          return (
            <div key={worker.id} className={`bg-zinc-900 border rounded-xl p-4 ${isAuto ? "border-blue-800/40" : "border-zinc-800"}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">{worker.full_name?.[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{worker.full_name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="px-2 py-0.5 bg-zinc-800 text-zinc-500 text-xs rounded-full">{worker.role}</span>
                    <span className="px-2 py-0.5 bg-zinc-800 text-zinc-500 text-xs rounded-full">{worker.group}</span>
                  </div>
                </div>
                <span className="text-zinc-600 text-xs shrink-0">approuvé par →</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => toggleApprover(worker.id, "auto")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    isAuto
                      ? "bg-blue-900/40 border-blue-700/60 text-blue-400"
                      : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500"
                  }`}
                >
                  ⚡ Automatique
                </button>
                {!isAuto && activeUsers.filter(u => u.id !== worker.id).map(approver => (
                  <button
                    key={approver.id}
                    onClick={() => toggleApprover(worker.id, approver.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      selected.includes(approver.id)
                        ? "bg-green-900/40 border-green-700/60 text-green-400"
                        : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500"
                    }`}
                  >
                    {approver.full_name}
                  </button>
                ))}
              </div>
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