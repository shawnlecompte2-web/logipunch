import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, ChevronRight, MapPin, Navigation } from "lucide-react";
import { format, startOfWeek } from "date-fns";

const AUTO_APPROVE_ROLES = ["Administrateur", "Surintendant", "Chargé de projet"];

export default function PunchInForm({ user, projects, onSuccess, onBack }) {
  const [selectedProject, setSelectedProject] = useState("");
  const [machine, setMachine] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [locationData, setLocationData] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle"); // idle | loading | granted | denied

  const needsMachine = user.role === "Opérateur";
  const needsPlate = user.role === "Chauffeur";
  const needsProject = ["Manœuvre", "Opérateur", "Estimateur", "Chauffeur"].includes(user.role);

  const availableProjects = projects;

  const canSubmit = selectedProject &&
    (!needsMachine || machine) &&
    (!needsPlate || plateNumber);

  // Geocode project address to lat/lng using nominatim
  const geocodeAddress = async (address) => {
    if (!address) return null;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch(e) {}
    return null;
  };

  // Haversine distance in meters
  const distanceM = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const getLocation = () => new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 10000, enableHighAccuracy: true }
    );
  });

  // Request GPS permission as soon as the form loads
  useEffect(() => {
    if (!navigator.geolocation) return;
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocationData({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus("granted");
      },
      () => setLocationStatus("denied"),
      { timeout: 12000, enableHighAccuracy: true }
    );
  }, []);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    const project = projects.find(p => p.id === selectedProject);
    const now = new Date();
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");

    // Use pre-fetched location or try again
    const location = locationData || await getLocation();
    let onSite = null;
    if (location && project?.address) {
      const projectCoords = await geocodeAddress(project.address);
      if (projectCoords) {
        const dist = distanceM(location.lat, location.lng, projectCoords.lat, projectCoords.lng);
        onSite = dist <= 500; // within 500m = on site
      }
    }

    const entry = {
      user_id: user.id,
      user_name: user.full_name,
      project_id: selectedProject,
      project_name: project?.name || "",
      punch_in: now.toISOString(),
      status: AUTO_APPROVE_ROLES.includes(user.role) ? "approved" : "active",
      week_start: weekStart,
      work_date: format(now, "yyyy-MM-dd"),
      group: user.group,
      role: user.role,
      lunch_break: 0,
    };
    if (needsMachine) entry.machine = machine;
    if (needsPlate) entry.plate_number = plateNumber;
    if (location) { entry.punch_in_lat = location.lat; entry.punch_in_lng = location.lng; }
    if (onSite !== null) entry.on_site = onSite;

    const created = await base44.entities.PunchEntry.create(entry);
    onSuccess(created);
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col max-w-md mx-auto px-4 py-6">
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft size={18} />
        <span className="text-sm">Retour</span>
      </button>

      <h2 className="text-white text-2xl font-bold mb-1">Punch In</h2>
      <p className="text-zinc-500 text-sm mb-4">{user.full_name} · {user.role}</p>

      {/* GPS status banner */}
      {locationStatus === "loading" && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center gap-3">
          <MapPin size={16} className="text-yellow-400 animate-pulse shrink-0" />
          <p className="text-zinc-300 text-sm">Localisation en cours...</p>
        </div>
      )}
      {locationStatus === "denied" && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-orange-900/30 border border-orange-700/50">
          <div className="flex items-start gap-3">
            <MapPin size={16} className="text-orange-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-orange-300 text-sm font-semibold">Localisation refusée</p>
              <p className="text-orange-400/70 text-xs mt-1">
                Autorisez la localisation dans les réglages de votre navigateur pour activer la vérification sur site.
              </p>
              <button
                onClick={() => {
                  setLocationStatus("loading");
                  navigator.geolocation.getCurrentPosition(
                    pos => { setLocationData({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocationStatus("granted"); },
                    () => setLocationStatus("denied"),
                    { timeout: 12000, enableHighAccuracy: true }
                  );
                }}
                className="mt-2 text-xs text-orange-300 underline"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      )}
      {locationStatus === "granted" && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-green-900/20 border border-green-800/40 flex items-center gap-2">
          <MapPin size={14} className="text-green-400 shrink-0" />
          <p className="text-green-400 text-xs">Position GPS capturée ✓</p>
        </div>
      )}

      {/* Project Selection */}
      <div className="mb-4">
        <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Sélectionner un projet *</label>
        <div className="flex flex-col gap-2">
          {availableProjects.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedProject(p.id)}
              className={`w-full p-4 rounded-2xl border text-left transition-all ${
                selectedProject === p.id
                  ? "bg-green-900/30 border-green-600 text-white"
                  : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{p.project_number} {p.address ? `· ${p.address}` : ""}</p>
                </div>
                {selectedProject === p.id && (
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Machine (Opérateur) */}
      {needsMachine && (
        <div className="mb-4">
          <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Machine utilisée *</label>
          <input
            value={machine}
            onChange={e => setMachine(e.target.value)}
            placeholder="Ex: Excavatrice 320, Compacteur..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-600 text-sm"
          />
        </div>
      )}

      {/* Plate Number (Chauffeur) */}
      {needsPlate && (
        <div className="mb-4">
          <label className="text-zinc-400 text-xs uppercase tracking-widest mb-2 block">Numéro de plaque *</label>
          <input
            value={plateNumber}
            onChange={e => setPlateNumber(e.target.value.toUpperCase())}
            placeholder="Ex: ABC-1234"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-600 text-sm font-mono"
          />
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || loading}
        className={`mt-4 w-full h-14 rounded-2xl font-bold text-base transition-all flex items-center justify-between px-6 ${
          canSubmit && !loading
            ? "bg-green-600 hover:bg-green-500 text-white glow-green"
            : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
        }`}
      >
        <span>{loading ? "Enregistrement..." : "CONFIRMER PUNCH IN"}</span>
        {!loading && <ChevronRight size={20} />}
      </button>
    </div>
  );
}