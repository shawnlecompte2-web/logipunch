import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Edit2, Trash2, X, Check, ChevronDown } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

export default function RoleConfigTab({ users, companyId }) {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [newRole, setNewRole] = useState("");

  const uniqueRoles = [...new Set(users.filter(u => u.role).map(u => u.role))].sort();

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    const configs = await base44.entities.RoleConfig.filter(
      companyId ? { company_id: companyId } : {}
    );
    setConfigs(configs || []);
    setLoading(false);
  };

  const handleAddRole = async () => {
    const trimmed = newRole.trim();
    if (!trimmed || configs.some(c => c.role_name === trimmed)) return;
    
    const newConfig = {
      role_name: trimmed,
      fields: [],
      ...(companyId ? { company_id: companyId } : {})
    };
    const created = await base44.entities.RoleConfig.create(newConfig);
    setConfigs([...configs, created]);
    setNewRole("");
  };

  const handleDeleteRole = async (id) => {
    if (!window.confirm("Supprimer cette configuration?")) return;
    await base44.entities.RoleConfig.delete(id);
    setConfigs(configs.filter(c => c.id !== id));
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-white font-semibold mb-1">Champs personnalisés par rôle</p>
        <p className="text-zinc-500 text-xs">Configurez les champs supplémentaires qui apparaîtront au punch-out pour chaque rôle.</p>
      </div>

      {/* Add new role config */}
      <div className="flex gap-2 mb-6">
        <select
          value={newRole}
          onChange={e => setNewRole(e.target.value)}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600"
        >
          <option value="">Sélectionner un rôle...</option>
          {uniqueRoles.filter(r => !configs.some(c => c.role_name === r)).map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <button
          onClick={handleAddRole}
          disabled={!newRole.trim()}
          className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-40 flex items-center gap-2"
        >
          <Plus size={15} /> Ajouter
        </button>
      </div>

      <div className="space-y-2">
        {configs.map(config => (
          <ConfigCard
            key={config.id}
            config={config}
            onEdit={setEditingConfig}
            onDelete={handleDeleteRole}
            onUpdate={(updated) => setConfigs(configs.map(c => c.id === updated.id ? updated : c))}
          />
        ))}
        {configs.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-8">Aucune configuration.</p>
        )}
      </div>

      {editingConfig && (
        <ConfigEditor
          config={editingConfig}
          onClose={() => setEditingConfig(null)}
          onSave={(updated) => {
            setConfigs(configs.map(c => c.id === updated.id ? updated : c));
            setEditingConfig(null);
          }}
        />
      )}
    </div>
  );
}

function ConfigCard({ config, onEdit, onDelete, onUpdate }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
      <div className="flex-1">
        <p className="text-white font-semibold text-sm">{config.role_name}</p>
        <p className="text-zinc-600 text-xs mt-1">
          {config.fields?.length || 0} champ{config.fields?.length !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onEdit(config)} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all">
          <Edit2 size={14} className="text-zinc-400" />
        </button>
        <button onClick={() => onDelete(config.id)} className="p-2 bg-red-900/30 hover:bg-red-900/50 rounded-lg transition-all">
          <Trash2 size={14} className="text-red-500" />
        </button>
      </div>
    </div>
  );
}

function ConfigEditor({ config, onClose, onSave }) {
  const [form, setForm] = useState({
    ...config,
    fields: config.fields || []
  });
  const [newField, setNewField] = useState({ label: "", field_type: "text", options: [] });
  const [saving, setSaving] = useState(false);

  const addField = () => {
    if (!newField.label.trim()) return;
    const field = {
      field_id: `field_${Date.now()}`,
      label: newField.label,
      field_type: newField.field_type,
      ...(newField.field_type === "select" && { options: newField.options }),
      required: false
    };
    setForm(f => ({ ...f, fields: [...f.fields, field] }));
    setNewField({ label: "", field_type: "text", options: [] });
  };

  const removeField = (fieldId) => {
    setForm(f => ({ ...f, fields: f.fields.filter(fld => fld.field_id !== fieldId) }));
  };

  const handleSave = async () => {
    setSaving(true);
    const updated = await base44.entities.RoleConfig.update(form.id, {
      fields: form.fields
    });
    setSaving(false);
    onSave(updated);
  };

  return (
    <Drawer open={true} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="bg-zinc-900 border-t border-zinc-700 max-h-[90vh] flex flex-col">
        <DrawerHeader className="border-b border-zinc-800">
          <DrawerTitle className="text-white text-left">Configuration — {form.role_name}</DrawerTitle>
        </DrawerHeader>
        
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* Existing fields */}
          <div>
            <p className="text-zinc-400 text-xs uppercase tracking-widest mb-3">Champs configurés</p>
            <div className="space-y-2">
              {form.fields.length === 0 ? (
                <p className="text-zinc-600 text-sm">Aucun champ configuré.</p>
              ) : (
                form.fields.map(field => (
                  <div key={field.field_id} className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-white text-sm font-semibold">{field.label}</p>
                      <p className="text-zinc-600 text-xs mt-0.5">
                        Type: {field.field_type}
                        {field.field_type === "select" && ` (${field.options?.length || 0} options)`}
                      </p>
                    </div>
                    <button
                      onClick={() => removeField(field.field_id)}
                      className="p-2 bg-red-900/30 hover:bg-red-900/50 rounded-lg transition-all"
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add new field */}
          <div className="border-t border-zinc-700 pt-4">
            <p className="text-zinc-400 text-xs uppercase tracking-widest mb-3">Ajouter un champ</p>
            <div className="space-y-3">
              <input
                value={newField.label}
                onChange={e => setNewField(f => ({ ...f, label: e.target.value }))}
                placeholder="Nom du champ (ex: Machine)"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600 placeholder:text-zinc-600"
              />
              <select
                value={newField.field_type}
                onChange={e => setNewField(f => ({ ...f, field_type: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600"
              >
                <option value="text">Texte</option>
                <option value="select">Liste déroulante</option>
                <option value="number">Nombre</option>
              </select>

              {newField.field_type === "select" && (
                <div>
                  <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Options (une par ligne)</label>
                  <textarea
                    value={newField.options.join("\n")}
                    onChange={e => setNewField(f => ({ ...f, options: e.target.value.split("\n").filter(v => v.trim()) }))}
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600 placeholder:text-zinc-600 resize-none h-24"
                  />
                </div>
              )}

              <button
                onClick={addField}
                disabled={!newField.label.trim()}
                className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Ajouter ce champ
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-700 px-4 py-4 flex gap-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-semibold hover:bg-zinc-700 transition-all">
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 h-10 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-bold transition-all disabled:opacity-40">
            {saving ? "..." : "Sauvegarder"}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}