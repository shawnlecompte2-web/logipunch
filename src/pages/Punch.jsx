import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PinEntry from "../components/punch/PinEntry";
import PunchDashboard from "../components/punch/PunchDashboard";

export default function Punch() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeEntry, setActiveEntry] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePinSuccess = (user, entry) => {
    setCurrentUser(user);
    setActiveEntry(entry || null);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveEntry(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-start">
      {!currentUser ? (
        <PinEntry onSuccess={handlePinSuccess} />
      ) : (
        <PunchDashboard
          user={currentUser}
          activeEntry={activeEntry}
          setActiveEntry={setActiveEntry}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}