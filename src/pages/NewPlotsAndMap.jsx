import React, { useState, useCallback, lazy, Suspense } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from 'lucide-react';

function lazyRetry(fn) {
  return lazy(() => fn().catch(() =>
    new Promise(r => setTimeout(r, 500)).then(() => fn()).catch(() => {
      window.location.reload();
      return fn();
    })
  ));
}

const NewPlotReservation1Map = lazyRetry(() => import("@/components/plots/NewPlotReservation1Map"));
const PlotFilters = lazyRetry(() => import("@/components/plots/PlotFilters"));
const RequestPlotDialog = lazyRetry(() => import("@/components/plots/RequestPlotDialog"));

const SectionLoader = () => (
  <div className="flex items-center justify-center py-12 text-gray-400">
    <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…
  </div>
);

export default function NewPlotsAndMap() {
  const [filters, setFilters] = useState({
    search: "",
    owner: "",
    plot: "",
    status: "All",
    section: "All"
  });
  const [showRequest, setShowRequest] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState(null);

  const handlePlotClick = useCallback((plot) => {
    setSelectedPlot(plot || null);
    setShowRequest(true);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sm:py-6 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/44a8ffe54_Gemini_Generated_Image_mbje5gmbje5gmbje.png"
              alt="Union Springs Logo"
              className="h-10 sm:h-14 w-auto rounded-full"
              loading="eager"
              width={56}
              height={56}
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xl sm:text-2xl md:text-3xl font-serif tracking-wider uppercase text-teal-600 truncate">Union Springs</span>
              <span className="text-[0.6rem] sm:text-[0.7rem] md:text-xs text-stone-500 tracking-[0.2em] uppercase">Cemetery - Shongaloo, LA</span>
            </div>
          </div>
          <div className="mt-4 text-center md:text-left">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">New Plots for Reservation</h1>
            <p className="text-sm text-gray-500">Explore newly available plots prepared for reservations.</p>
          </div>
        </div>
      </header>

      <div className="border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <Suspense fallback={null}>
            <PlotFilters
              filters={filters}
              onFilterChange={setFilters}
              statusOptions={["All","Available","Pending Reservation","Reserved","Occupied","Veteran","Unavailable","Unknown","Not Usable"]}
            />
          </Suspense>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-3 sm:p-6">
        <Suspense fallback={<SectionLoader />}>
          <NewPlotReservation1Map filters={filters} onPlotClick={handlePlotClick} />
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <RequestPlotDialog open={showRequest} onOpenChange={setShowRequest} selectedPlot={selectedPlot} />
      </Suspense>
    </div>
  );
}