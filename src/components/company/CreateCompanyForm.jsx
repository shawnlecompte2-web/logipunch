import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, ChevronRight, Eye, EyeOff } from "lucide-react";

export default function CreateCompanyForm({ onSuccess, onBack }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [adminPinConfirm, setAdminPinConfirm] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState("");

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) { setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); }
  };

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const handleSubmit = async () => {
    if (!name) return;
    if (adminPin.length !== 4 || !/^\d{4}$/.test(adminPin)) { setPinError("Le code doit être 4 chiffres."); return; }
    if (adminPin !== adminPinConfirm) { setPinError("Les codes ne correspondent pas."); return; }
    setPinError("");
    setSaving(true);
    let logo_url = "";
    if (logoFile) {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: logoFile });
      logo_url = file_url;
      setUploading(false);
    }
    const join_code = generateCode();
    const company = await base44.entities.Company.create({ name, join_code, logo_url, address, phone });
    // Create the admin user for this company
    await base44.entities.AppUser.create({
      full_name: "Administrateur",
      pin_code: adminPin,
      role: "Administrateur",
      group: name,
      is_active: true,
      company_id: company.id,
    });
    setSaving(false);
    onSuccess(company);
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] z-50 overflow-y-auto">
      <div className="max-w-md mx-auto w-full px-4 py-8">
        <button onClick={onBack} className="text-zinc-500 text-sm mb-6 flex items-center gap-1 hover:text-zinc-300 transition-colors">
          ← Retour
        </button>
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center overflow-hidden">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a1d6df5ed8bd83fe0fbd65/5493e8e6d_ChatGPTImageFeb27202605_01_06PM.png"
              alt="logo" className="w-full h-full object-contain p-1"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          </div>
          <span className="text-2xl font-black text-white tracking-tight">LOGIPUNCH</span>
        </div>

        <h2 className="text-white text-2xl font-bold mb-1">Créer mon portail</h2>
        <p className="text-zinc-500 text-sm mb-8">Configurez votre espace entreprise</p>

        {/* Logo Upload */}
        <div className="mb-6">
          <label className="text-zinc-400 text-xs uppercase tracking-widest mb-3 block">Logo de l'entreprise (pour les PDFs)</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden flex-shrink-0">
              {logoPreview
                ? <img src={logoPreview} className="w-full h-full object-contain p-1" alt="preview" />
                : <Upload size={20} className="text-zinc-600" />
              }
            </div>
            <label className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-300 text-sm cursor-pointer transition-all">
              <Upload size={14} />
              {uploading ? "Téléchargement..." : "Choisir une image"}
              <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
            </label>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Nom de l'entreprise *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Excavation XYZ Inc." className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-600 text-sm" />
          </div>
          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Adresse</label>
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 rue Principale..." className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-600 text-sm" />
          </div>
          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-widest mb-1.5 block">Téléphone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="514-555-0000" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-600 text-sm" />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!name || saving}
          className={`w-full h-14 rounded-2xl font-bold text-base transition-all flex items-center justify-between px-6 ${
            name && !saving ? "bg-green-600 hover:bg-green-500 text-white" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
          }`}
        >
          <span>{saving ? "Création en cours..." : "CRÉER MON PORTAIL"}</span>
          {!saving && <ChevronRight size={20} />}
        </button>
      </div>
    </div>
  );
}