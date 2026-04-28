import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Edit2, Trash2, X, Search, Users } from "lucide-react";
import UserFormDrawer from "./UserFormDrawer";

export default function UsersTab({ users, projects, companyId, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [search, setSearch] = useState("");

  const handleDelete = async (userId) => {
    if (!window.confirm("Désactiver cet utilisateur?")) return;
    await base44.entities.AppUser.update(userId, { is_active: false });
    onRefresh();
  };

  const activeUsers = users.filter(u => u.is_active !== false);
  const filtered = search.trim()
    ? activeUsers.filter(u =>
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.role?.toLowerCase().includes(search.toLowerCase()) ||
        u.group?.toLowerCase().includes(search.toLowerCase())
      )
    : activeUsers;

  const grouped = Object.entries(
    filtered.reduce((acc, user) => {
      const role = user.role || "Sans rôle";
      if (!acc[role]) acc[role] = [];
      acc[role].push(user);
      return acc;
    }, {})
  ).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div>
      {/* Stats bar */}
      <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 mb-5">
        <Users size={16} className="text-green-400" />
        <span className="text-white font-bold text-lg">{activeUsers.length}</span>
        <span className="text-zinc-500 text-sm">utilisateurs actifs</span>
        <button
          onClick={() => { setEditUser(null); setShowForm(true); }}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-all"
        >
          <Plus size={15} /> Ajouter
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-9 py-2.5 text-white text-sm focus:outline-none focus:border-green-700 placeholder:text-zinc-600"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {/* List grouped by role */}
      <div className="space-y-1">
        {grouped.map(([role, roleUsers]) => (
          <div key={role}>
            <p className="text-zinc-600 text-xs uppercase tracking-widest font-semibold mb-2 mt-4">
              {role} <span className="text-zinc-700 normal-case tracking-normal">({roleUsers.length})</span>
            </p>
            {roleUsers.map(user => (
              <div key={user.id} className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-3 flex items-center justify-between mb-1.5 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 shrink-0 rounded-xl bg-zinc-800 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{user.full_name?.[0]}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold text-sm truncate">{user.full_name}</p>
                      <span className="text-zinc-600 text-xs font-mono shrink-0">#{user.pin_code}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-zinc-800 text-zinc-500 text-xs rounded-full">{user.group}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 ml-2">
                  <button onClick={() => { setEditUser(user); setShowForm(true); }} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all">
                    <Edit2 size={14} className="text-zinc-400" />
                  </button>
                  <button onClick={() => handleDelete(user.id)} className="p-2 bg-red-900/20 hover:bg-red-900/40 rounded-lg transition-all">
                    <Trash2 size={14} className="text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-10">
            {search ? `Aucun résultat pour "${search}"` : "Aucun utilisateur."}
          </p>
        )}
      </div>

      <UserFormDrawer
        open={showForm}
        user={editUser}
        projects={projects}
        users={users}
        companyId={companyId}
        onClose={() => { setShowForm(false); setEditUser(null); }}
        onSaved={() => { setShowForm(false); setEditUser(null); onRefresh(); }}
      />
    </div>
  );
}