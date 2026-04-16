import React, { useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, ClipboardList, Map as MapIcon, Database } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function lazyRetry(fn) {
  return lazy(() => fn().catch(() =>
    new Promise(r => setTimeout(r, 500)).then(() => fn()).catch(() => {
      window.location.reload();
      return fn();
    })
  ));
}

const PlotReservationsAdmin = lazyRetry(() => import("@/components/admin/PlotReservationsAdmin"));
const NewPlotReservation1Map = lazyRetry(() => import("@/components/plots/NewPlotReservation1Map"));
const NewPlotsBrowser = lazyRetry(() => import("@/components/plots/NewPlotsBrowser"));

const SectionLoader = () => (
  <div className="flex items-center justify-center py-16 text-gray-400">
    <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…
  </div>
);

export default function NewPlotReservations() {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me().catch(() => null),
  });
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState("reservations");

  // Show loading while checking auth
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  // Redirect non-authenticated users to login
  if (!user) {
    base44.auth.redirectToLogin(window.location.pathname);
    return null;
  }

  // Non-admin users shouldn't access this page
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-gray-600 font-medium">Admin access required</p>
          <p className="text-sm text-gray-500">You don't have permission to view this page.</p>
          <Link to={createPageUrl('Home')}>
            <Button variant="outline" className="gap-2 mt-2">
              <ArrowLeft className="w-4 h-4" /> Go Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sm:py-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">New Plot Reservations</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage reservation requests, view plots map, and import data</p>
          </div>
          <Link to={createPageUrl('Admin')}>
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Admin
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-3 sm:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white border border-gray-200 shadow-sm p-1 h-auto flex-wrap gap-1">
            <TabsTrigger value="reservations" className="gap-1.5 data-[state=active]:bg-teal-700 data-[state=active]:text-white">
              <ClipboardList className="w-4 h-4" />
              <span>Reservations</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-1.5 data-[state=active]:bg-teal-700 data-[state=active]:text-white">
              <MapIcon className="w-4 h-4" />
              <span>Plots Map</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-1.5 data-[state=active]:bg-teal-700 data-[state=active]:text-white">
              <Database className="w-4 h-4" />
              <span>Import & Data</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reservations">
            <Suspense fallback={<SectionLoader />}>
              <PlotReservationsAdmin />
            </Suspense>
          </TabsContent>

          <TabsContent value="map">
            <Suspense fallback={<SectionLoader />}>
              <NewPlotReservation1Map />
            </Suspense>
          </TabsContent>

          <TabsContent value="data">
            <Suspense fallback={<SectionLoader />}>
              <NewPlotsBrowser />
            </Suspense>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}