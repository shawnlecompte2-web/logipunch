import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Edit2, Trash2, Check, X } from "lucide-react";

function CategorySection({ title, items, onRename, onDelete, onAdd, saving }) {
  const [newValue, setNewValue] = useState("");
  const [editing, setEditing] = useState(null); // { original, value }

  const handleAdd = () => {
    const trimmed = newValue.trim();
    if (!trimmed || items.includes(trimmed)) return;
    onAdd(trimmed);
    setNewValue("");
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <h3 className="text-white font-bold mb-1">{title}</h3>
      <p className="text-zinc-500 text-xs mb-4">Partagés entre tous les utilisateurs du portail.</p>

      <div className="flex gap-2 mb-4">
        <input
          value={newValue}
          onChange={e => setNewValue(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          placeholder={`Nouveau ${title.toLowerCase()}...`}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600 placeholder:text-zinc-600"
        />
        <button
          onClick={handleAdd}
          disabled={!newValue.trim() || saving}
          className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-40 flex items-center gap-2"
        >
          <Plus size={15} /> Ajouter
        </button>
      </div>

      <div className="space-y-2">
        {items.map(item => {
          const isEditing = editing?.original === item;
          return (
            <div key={item} className="flex items-center gap-3 bg-zinc-800/50 border border-zinc-800 rounded-xl px-4 py-3">
              <div className="flex-1">
                {isEditing ? (
                  <input
                    autoFocus
                    value={editing.value}
                    onChange={e => setEditing(ed => ({ ...ed, value: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === "Enter") { onRename(item, editing.value); setEditing(null); }
                      if (e.key === "Escape") setEditing(null);
                    }}
                    className="w-full bg-zinc-700 border border-green-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-semibold">{item}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button onClick={() => { onRename(item, editing.value); setEditing(null); }} className="p-1.5 bg-green-900/40 hover:bg-green-800/60 border border-green-700/40 rounded-lg transition-all">
                      <Check size={13} className="text-green-400" />
                    </button>
                    <button onClick={() => setEditing(null)} className="p-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-all">
                      <X size={13} className="text-zinc-400" />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setEditing({ original: item, value: item })} className="p-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-all">
                      <Edit2 size={13} className="text-zinc-400" />
                    </button>
                    <button onClick={() => onDelete(item)} className="p-1.5 bg-red-900/20 hover:bg-red-900/40 rounded-lg transition-all">
                      <Trash2 size={13} className="text-red-500" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="text-zinc-600 text-xs text-center py-4">Aucun élément défini.</p>
        )}
      </div>
    </div>
  );
}

export default function CategoriesTab({ users, onRefresh }) {
  const [saving, setSaving] = useState(false);

  const roles = [...new Set(users.filter(u => u.role).map(u => u.role))].sort();
  const groups = [...new Set(users.filter(u => u.group).map(u => u.group))].sort();

  const renameRole = async (original, newName) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === original) return;
    setSaving(true);
    await Promise.all(users.filter(u => u.role === original).map(u => base44.entities.AppUser.update(u.id, { role: trimmed })));
    setSaving(false);
    onRefresh();
  };

  const deleteRole = async (role) => {
    const affected = users.filter(u => u.role === role);
    const msg = affected.length > 0
      ? `Supprimer le rôle "${role}"? Les ${affected.length} utilisateur(s) avec ce rôle auront leur rôle vidé.`
      : `Supprimer le rôle "${role}"?`;
    if (!window.confirm(msg)) return;
    setSaving(true);
    await Promise.all(affected.map(u => base44.entities.AppUser.update(u.id, { role: "" })));
    setSaving(false);
    onRefresh();
  };

  const renameGroup = async (original, newName) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === original) return;
    setSaving(true);
    await Promise.all(users.filter(u => u.group === original).map(u => base44.entities.AppUser.update(u.id, { group: trimmed })));
    setSaving(false);
    onRefresh();
  };

  const deleteGroup = async (group) => {
    const affected = users.filter(u => u.group === group);
    const msg = affected.length > 0
      ? `Supprimer le groupe "${group}"? Les ${affected.length} utilisateur(s) avec ce groupe auront leur groupe vidé.`
      : `Supprimer le groupe "${group}"?`;
    if (!window.confirm(msg)) return;
    setSaving(true);
    await Promise.all(affected.map(u => base44.entities.AppUser.update(u.id, { group: "" })));
    setSaving(false);
    onRefresh();
  };

  return (
    <div className="space-y-5">
      {saving && <p className="text-zinc-500 text-sm animate-pulse">Mise à jour...</p>}
      <CategorySection
        title="Rôles"
        items={roles}
        onRename={renameRole}
        onDelete={deleteRole}
        onAdd={(val) => alert(`Rôle "${val}" — assignez-le à un utilisateur pour le voir dans la liste.`)}
        saving={saving}
      />
      <CategorySection
        title="Groupes"
        items={groups}
        onRename={renameGroup}
        onDelete={deleteGroup}
        onAdd={(val) => alert(`Groupe "${val}" — assignez-le à un utilisateur pour le voir dans la liste.`)}
        saving={saving}
      />
    </div>
  );
}