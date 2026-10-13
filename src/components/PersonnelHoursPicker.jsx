import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, X } from "lucide-react";

function getStoredCompany() {
  try { return JSON.parse(sessionStorage.getItem("logipunch_company") || "null"); } catch { return null; }
}

export default function PersonnelHoursPicker({ value, onChange }) {
  const [name, setName] = useState("");
  const [hours, setHours] = useState("");
  const [employees, setEmployees] = useState([]);

  const list = (() => { try { return JSON.parse(value || "[]"); } catch { return []; } })();

  useEffect(() => {
    const company = getStoredCompany();
    const filter = { is_active: true, ...(company?.id ? { company_id: company.id } : {}) };
    base44.entities.AppUser.filter(filter).then(users => setEmployees(users || [])).catch(() => {});
  }, []);

  const add = () => {
    const n = name.trim();
    const h = parseFloat(hours);
    if (!n || isNaN(h) || h <= 0) return;
    const emp = employees.find(e => e.full_name === n);
    const entry = { name: n, hours: h, role: emp?.role || "" };
    onChange(JSON.stringify([...list, entry]));
    setName("");
    setHours("");
  };

  const remove = (idx) => {
    onChange(JSON.stringify(list.filter((_, i) => i !== idx)));
  };

  const total = list.reduce((s, p) => s + (parseFloat(p.hours) || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          list="personnel-hours-list"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nom de l'employé..."
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-green-600"
        />
        <datalist id="personnel-hours-list">
          {employees.map(e => <option key={e.id} value={e.full_name} />)}
        </datalist>
        <input
          type="number"
          min="0"
          step="0.25"
          value={hours}
          onChange={e => setHours(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Heures"
          className="w-full sm:w-24 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm text-center placeholder-zinc-500 focus:outline-none focus:border-green-600"
        />
        <button type="button" onClick={add} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-semibold transition-all">
          <Plus size={15} /> Ajouter
        </button>
      </div>
      {list.length > 0 && (
        <div className="space-y-2">
          {list.map((p, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-zinc-800/60 border border-zinc-700/60 rounded-xl px-3 py-2">
              <div className="flex-1 min-w-0">
                <span className="text-white text-sm font-medium">{p.name}</span>
                {p.role && <span className="text-zinc-500 text-xs ml-2">· {p.role}</span>}
              </div>
              <span className="text-green-400 text-sm font-bold shrink-0">{p.hours}h</span>
              <button type="button" onClick={() => remove(idx)} className="text-zinc-500 hover:text-red-400 transition-colors shrink-0">
                <X size={15} />
              </button>
            </div>
          ))}
          <p className="text-xs text-zinc-500">Total : {total.toFixed(2)}h · Ces heures n'apparaissent pas dans la paie</p>
        </div>
      )}
    </div>
  );
}