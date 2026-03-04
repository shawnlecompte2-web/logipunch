import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Settings, X } from "lucide-react";

const ADMIN_KEYS = ["TimeSheet", "ActiveUsers", "Settings"];

export default function MobileNav({ navItems, currentPageName }) {
  const [adminOpen, setAdminOpen] = useState(false);

  const mainItems = navItems.filter(item => !ADMIN_KEYS.includes(item.key));
  const adminItems = navItems.filter(item => ADMIN_KEYS.includes(item.key));
  const isAdminActive = adminItems.some(item => item.page === currentPageName);

  return (
    <>
      {/* Admin drawer */}
      {adminOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setAdminOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute bottom-16 left-0 right-0 bg-[#111] border-t border-zinc-800 px-4 pt-4 pb-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400 text-xs uppercase tracking-widest font-semibold">Admin</span>
              <button onClick={() => setAdminOpen(false)} className="text-zinc-600 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="flex gap-2">
              {adminItems.map(({ label, page, icon: Icon }) => {
                const isActive = currentPageName === page;
                return (
                  <Link
                    key={page}
                    to={createPageUrl(page)}
                    onClick={() => setAdminOpen(false)}
                    className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 rounded-xl border transition-all ${
                      isActive
                        ? "bg-green-900/30 border-green-700/50 text-green-400"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                    <span className="text-[9px] font-semibold">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0d0d0d] border-t border-zinc-800/60 flex z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {mainItems.map(({ label, page, icon: Icon }) => {
          const isActive = currentPageName === page;
          return (
            <Link
              key={page}
              to={createPageUrl(page)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all ${
                isActive ? "text-green-400" : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[9px] font-semibold">{label}</span>
            </Link>
          );
        })}

        {/* Admin button — only show if user has at least one admin item */}
        {adminItems.length > 0 && (
          <button
            onClick={() => setAdminOpen(o => !o)}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all ${
              isAdminActive || adminOpen ? "text-green-400" : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            <Settings size={20} strokeWidth={isAdminActive || adminOpen ? 2.5 : 1.5} />
            <span className="text-[9px] font-semibold">Admin</span>
          </button>
        )}
      </nav>
    </>
  );
}