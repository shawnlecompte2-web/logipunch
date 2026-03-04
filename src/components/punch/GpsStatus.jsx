import { MapPin } from "lucide-react";

export default function GpsStatus({ status }) {
  if (status === "loading") return (
    <div className="mb-4 px-4 py-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700 flex items-center gap-2">
      <MapPin size={14} className="text-zinc-400 shrink-0 animate-pulse" />
      <p className="text-zinc-400 text-xs">Localisation GPS en cours...</p>
    </div>
  );
  if (status === "granted") return (
    <div className="mb-4 px-4 py-2.5 rounded-xl bg-green-900/20 border border-green-800/40 flex items-center gap-2">
      <MapPin size={14} className="text-green-400 shrink-0" />
      <p className="text-green-400 text-xs">Position GPS capturée ✓</p>
    </div>
  );
  if (status === "denied") return (
    <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-900/20 border border-red-800/40 flex items-center gap-2">
      <MapPin size={14} className="text-red-400 shrink-0" />
      <p className="text-red-400 text-xs">Position GPS NON capturée ✗</p>
    </div>
  );
  return null;
}