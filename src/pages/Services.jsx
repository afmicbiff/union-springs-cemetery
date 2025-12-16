import React from 'react';
import Breadcrumbs from "@/components/Breadcrumbs";

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-stone-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <Breadcrumbs items={[{ label: 'Services' }]} />
        
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-serif text-stone-900">Services</h1>
          <div className="w-24 h-1 bg-red-700 mx-auto"></div>
          <div className="text-stone-600 max-w-2xl mx-auto text-lg leading-relaxed text-left">
            <p>The staff at the Union Springs Cemetery maintains the grounds and upkeep of the property.</p>
            <br />
            <p>The cemetery allows for:</p>
            <ul className="list-disc list-inside mt-4 ml-4 space-y-2 font-medium">
                <li>Traditional Burial Plots</li>
                <li>Cremation Niches</li>
                <li>Family Estates</li>
            </ul>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
            <div className="bg-slate-50 p-8 rounded-sm shadow-md">
                <h3 className="text-2xl font-serif font-bold text-stone-800 mb-4">Traditional Burial</h3>
                <p className="text-stone-600 text-lg leading-relaxed">
                    The community Funeral Homes will assist you in the services of traditional burial.
                </p>
            </div>

            <div className="bg-slate-50 p-8 rounded-sm shadow-md">
                <h3 className="text-2xl font-serif font-bold text-stone-800 mb-4">Cremation Services</h3>
                <p className="text-stone-600 text-lg leading-relaxed">
                    The community Funeral Homes will assist you in the services of cremation.
                </p>
            </div>
            
            <div className="bg-slate-50 p-8 rounded-sm shadow-md md:col-span-2">
                <h3 className="text-2xl font-serif font-bold text-stone-800 mb-4">Memorial Planning</h3>
                <p className="text-stone-600 text-lg leading-relaxed">
                    The community Funeral Homes will assist you in the services of memorial planning.
                </p>
            </div>
        </div>

      </div>
    </div>
  );
}