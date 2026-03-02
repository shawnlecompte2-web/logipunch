import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DailyReportsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight mb-2">Rapport Journalier</h1>
          <p className="text-zinc-500">Gérez vos rapports de travail quotidiens</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Report */}
          <Link to={createPageUrl("CreateDailyReport")} className="block">
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-8 hover:border-green-600/50 hover:bg-zinc-900/60 transition-all cursor-pointer h-full">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-green-400" />
                </div>
                <h2 className="text-xl font-bold">Créer un rapport</h2>
              </div>
              <p className="text-zinc-400 text-sm">Créez un nouveau rapport journalier pour un projet</p>
            </div>
          </Link>

          {/* View Reports */}
          <Link to={createPageUrl("ReportCompilation")} className="block">
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-8 hover:border-blue-600/50 hover:bg-zinc-900/60 transition-all cursor-pointer h-full">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold">Compilations</h2>
              </div>
              <p className="text-zinc-400 text-sm">Consultez tous les rapports créés organisés par projet et semaine</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}