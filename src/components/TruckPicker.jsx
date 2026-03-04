import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";

const TRUCK_TYPES = [
  "Camion 12 roue",
  "Camion 2 essieux",
  "Camion 3 essieux",
  "Camion 4 essieux"
];

export default function TruckPicker({ value, onChange }) {
  const trucks = (() => {
    try {
      return JSON.parse(value || "[]");
    } catch {
      return [];
    }
  })();

  const [selectedType, setSelectedType] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [trips, setTrips] = useState("");

  const addTruck = () => {
    if (!selectedType || !plateNumber.trim() || !trips) return;
    
    const newTruck = {
      id: Date.now(),
      type: selectedType,
      plate: plateNumber.trim(),
      trips: parseInt(trips)
    };
    
    const updated = [...trucks, newTruck];
    onChange(JSON.stringify(updated));
    
    setSelectedType("");
    setPlateNumber("");
    setTrips("");
  };

  const removeTruck = (id) => {
    const updated = trucks.filter(t => t.id !== id);
    onChange(JSON.stringify(updated));
  };

  return (
    <div className="space-y-3">
      {/* Add truck form */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="Type de camion" />
            </SelectTrigger>
            <SelectContent>
              {TRUCK_TYPES.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Input
            type="text"
            placeholder="Plaque (ex: ABC-123)"
            value={plateNumber}
            onChange={(e) => setPlateNumber(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500"
          />
          
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              placeholder="Voyages"
              value={trips}
              onChange={(e) => setTrips(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500"
            />
            <Button
              type="button"
              onClick={addTruck}
              disabled={!selectedType || !plateNumber.trim() || !trips}
              size="sm"
              className="bg-green-700 hover:bg-green-600 shrink-0">
              <Plus size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Trucks list */}
      {trucks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Camions enregistrés</p>
          <div className="space-y-2">
            {trucks.map(truck => (
              <div
                key={truck.id}
                className="flex items-center justify-between bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-3 py-2">
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{truck.type}</p>
                  <p className="text-zinc-400 text-xs">{truck.plate} • {truck.trips} voyage{truck.trips > 1 ? 's' : ''}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeTruck(truck.id)}
                  className="text-zinc-500 hover:text-red-400 transition-colors ml-2">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}