import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Map } from 'lucide-react';

export default function NewPlotsAndMap() {
  return (
    <div className="min-h-screen bg-gray-50 w-full">
      <header className="bg-white border-b border-gray-200 px-6 py-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-700 text-white">
              <Map className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">New Plots for Reservation</h1>
              <p className="text-sm text-gray-500">Explore newly available plots prepared for reservations.</p>
            </div>
          </div>
          <Link to={createPageUrl('Plots')}>
            <Button variant="outline" className="hover:bg-gray-100">Back to Plots & Map</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-gray-600">
          <p>
            This page is reserved for showcasing new plots available for reservation. Let me know how you want this laid out (grid, filters, map overlay), and I’ll build it accordingly.
          </p>
        </div>
      </main>
    </div>
  );
}