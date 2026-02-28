import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Copy, Check, Upload } from "lucide-react";

export default function CompanySettingsTab({ company, onUpdated }) {
  const [form, setForm] = useState({
    name: company?.name || "",
    address: company?.address || "",
    phone: company?.phone || "",
    logo_url: company?.logo_url || "",
  });
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(company?.join_code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, logo_url: file_url }));
    setUploading(false);
  };

  const handleSave = async () => {
    if (!company?.id) return;
    setSaving(true);
    await base44.entities.Company.update(company.id, form);
    const updated = { ...company, ...form };
    sessionStorage.setItem("logipunch_company", JSON.stringify(updated));
    window.dispatchEvent(new Event("logipunch_company_change"));
    onUpdated(updated);
    setSaving(false);
  };

  return (
    <div>
      {/* Join Code - prominent */}
      <div className="bg-green-950/30 border border-green-700/30 rounded-2xl p-5 mb-6">
        <p className="text-green-400 text-xs uppercase tracking-widest mb-3">Code de connexion au portail</p>
        <div className="flex items-center justify-between mb-2">
          <span className="text-white text-3xl font-black font-mono tracking-widest">
            {company?.join_code || "—"}
          </span>
          <button
            onClick={copyCode}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              copied ? "bg-green-700 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {copied ? <><Check size={14} /> Copié!</> : <><Copy size={14} /> Copier</>}
          </button>
        </div>
        <p className="text-zinc-500 text-xs">Partagez ce code avec vos employés pour qu'ils accèdent à votre portail</p>
      </div>

      {/* Logo */}
      <div className="mb-5">
        <label className="text-zinc-400 text-xs uppercase tracking-widest mb-3 block">Logo (apparaît en haut des fiches de paye PDF)</label>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden flex-shrink-0">
            {form.logo_url
              ? <img src={form.logo_url} className="w-full h-full object-contain p-1" alt="logo" />
              : <Upload size={20} className="text-zinc-600" />
            }
          </div>
          <label className={`flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-300 text-sm cursor-pointer transition-all ${uploading ? "opacity-50 cursor-wait" : ""}`}>
            <Upload size={14} />
            {uploading ? "Téléchargement..." : "Changer le logo"}
            <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} className="hidden" />
          </label>
        </div>
      </div>

      {/* Company details */}
      <div className="space-y-3 mb-6">
        <div>
          <label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Nom de l'entreprise</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600" />
        </div>
        <div>
          <label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Adresse</label>
          <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600" />
        </div>
        <div>
          <label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Téléphone</label>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-green-600" />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-10 rounded-xl bg-green-700 hover:bg-green-600 text-white text-sm font-bold transition-all disabled:opacity-40"
      >
        {saving ? "Sauvegarde..." : "Sauvegarder les modifications"}
      </button>
    </div>
  );
}