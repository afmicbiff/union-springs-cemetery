import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import NewPlotsImport from "../components/plots/NewPlotsImport";
import NewPlotsBrowser from "../components/plots/NewPlotsBrowser";
import NewPlotReservation1Map from "../components/plots/NewPlotReservation1Map";
import PlotFilters from "../components/plots/PlotFilters";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Map as MapIcon, FileText, Grid3X3 } from "lucide-react";
import RequestPlotDialog from "../components/plots/RequestPlotDialog";


export default function NewPlotsAndMap() {
  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me().catch(() => null) });
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = React.useState("reservation1");
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
  const [showRequest, setShowRequest] = React.useState(false);
  const [selectedPlot, setSelectedPlot] = React.useState(null);
  const handlePlotClick = React.useCallback((plot) => {
    try {
      if (plot?.id) {
        localStorage.setItem('selected_plot_id', plot.id);
        localStorage.setItem('selected_plot_details', JSON.stringify({
          id: plot.id,
          section: plot.section || '',
          row_number: plot.row_number || '',
          plot_number: plot.plot_number || ''
        }));
      }
    } catch (_) {}
    setSelectedPlot(plot || null);
    setShowRequest(true);
  }, []);
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
          <div className="mt-4 flex flex-col md:flex-row items-center md:justify-between gap-4">
            <div className="text-center md:text-left">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">New Plots for Reservation</h1>
              <p className="text-sm text-gray-500">Explore newly available plots prepared for reservations.</p>
            </div>
            <div className="flex flex-col items-center gap-2 w-full md:w-auto">
              {/* Tab toggles */}
              <div className="flex flex-col md:flex-row md:space-x-1 space-y-1 md:space-y-0 bg-gray-100 p-1 rounded-lg w-full max-w-xs md:max-w-none md:w-auto">
                <button 
                  onClick={() => setActiveTab('reservation1')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition flex items-center justify-center gap-1 whitespace-nowrap flex-shrink-0 w-full md:w-auto ${activeTab === 'reservation1' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Grid3X3 size={14} /> New Plots Map
                </button>

                <button 
                  onClick={() => setActiveTab('data')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition flex items-center justify-center gap-1 whitespace-nowrap flex-shrink-0 w-full md:w-auto ${activeTab === 'data' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <FileText size={14} /> Data List
                </button>
              </div>

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
          <div className="flex items-center justify-center">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-amber-700 text-white text-xs sm:text-sm shadow">
              Click on the plot to start the reservation process.
            </span>
          </div>
          
          {activeTab === 'reservation1' ? (
            <NewPlotReservation1Map filters={filters} onPlotClick={handlePlotClick} />
          ) : (
            <NewPlotsBrowser activeTab={activeTab === 'map' ? 'map' : 'data'} onTabChange={(tab) => setActiveTab(tab)} filters={filters} onPlotClick={handlePlotClick} />
          )}
        </div>
      </main>
      <RequestPlotDialog open={showRequest} onOpenChange={setShowRequest} selectedPlot={selectedPlot} />
    </div>
  );
}