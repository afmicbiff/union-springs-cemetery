import React from 'react';
import NewPlotsBrowser from "../components/plots/NewPlotsBrowser";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function NewPlotReservations() {
  return (
    <div className="min-h-screen bg-gray-50 w-full">
      <header className="bg-white border-b border-gray-200 px-6 py-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">New Plot Reservations</h1>
            <span className="text-sm text-gray-500 hidden sm:inline">Viewer database with admin controls</span>
          </div>
          <Link to={createPageUrl('Admin')}>
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Admin
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <NewPlotsBrowser />
      </main>
    </div>
  );
}