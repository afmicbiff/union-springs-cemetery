import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import NewPlotsImport from "../components/plots/NewPlotsImport";
import NewPlotsBrowser from "../components/plots/NewPlotsBrowser";
import PlotFilters from "../components/plots/PlotFilters";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Map as MapIcon, FileText } from "lucide-react";


export default function NewPlotsAndMap() {
  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me().catch(() => null) });
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = React.useState("map");
  const [filters, setFilters] = React.useState({
    search: "",
    owner: "",
    plot: "",
    status: "All",
    birthYearStart: "",
    birthYearEnd: "",
    deathYearStart: "",
    deathYearEnd: "",
    section: "All"
  });
  const handleDeleteA1 = async () => {
    if (!window.confirm('Delete A-1 plot records (101–132/A1*)? This cannot be undone.')) return;
    const res = await base44.functions.invoke('deleteA1Plots', {});
    const count = res.data?.deleted_count ?? 0;
    alert(`Deleted ${count} A-1 plot(s).`);
  };
  const handlePopulateA1 = async () => {
    if (!window.confirm('Fill A-1 (101–132) from NewPlot data?')) return;
    const res = await base44.functions.invoke('populateA1Plots', {});
    alert(res.data?.message || 'Done');
  };
  const handleDeleteA1Unplaced = async () => {
    if (!window.confirm('Delete A-1 labeled but not placed NewPlot rows (e.g., 1334–1341)? This cannot be undone.')) return;
    const res = await base44.functions.invoke('deleteA1UnplacedNewPlots', {});
    const count = res.data?.deleted_count ?? 0;
    alert(res.data?.message || `Deleted ${count} unplaced A-1 row(s).`);
  };
  return (
    <div className="min-h-screen bg-gray-50 w-full">
      <header className="bg-white border-b border-gray-200 px-6 py-6 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/44a8ffe54_Gemini_Generated_Image_mbje5gmbje5gmbje.png" 
              alt="Union Springs Logo" 
              className="h-14 w-auto rounded-full"
            />
            <div className="flex flex-col">
              <span className="text-2xl md:text-3xl font-serif tracking-wider uppercase text-teal-600">Union Springs</span>
              <span className="text-[0.7rem] md:text-xs text-stone-500 tracking-[0.2em] uppercase">Cemetery - Shongaloo, LA</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">New Plots for Reservation</h1>
              <p className="text-sm text-gray-500">Explore newly available plots prepared for reservations.</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Map/Data toggles aligned left of Import CSV */}
              <div className="hidden md:flex space-x-1 bg-gray-100 p-1 rounded-lg mr-2">
                <button 
                  onClick={() => setActiveTab('map')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition flex items-center gap-1 ${activeTab === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <MapIcon size={14} /> Map View
                </button>
                <button 
                  onClick={() => setActiveTab('data')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition flex items-center gap-1 ${activeTab === 'data' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <FileText size={14} /> Data List
                </button>
              </div>
              {isAdmin && (<NewPlotsImport />)}
              <Link to={createPageUrl('Plots')}>
                <Button className="bg-teal-700 hover:bg-teal-800 text-white">Back to Plots & Map</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Filters bar similar to old Plots & Map */}
      <div className="border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <PlotFilters 
            filters={filters} 
            onFilterChange={setFilters}
            statusOptions={["All","Available","Pending Reservation","Reserved","Occupied","Veteran","Unavailable","Unknown","Not Usable"]}
          />
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-6">
        <div className="space-y-6">
          <NewPlotsBrowser activeTab={activeTab} onTabChange={setActiveTab} filters={filters} />
        </div>
      </main>
    </div>
  );
}