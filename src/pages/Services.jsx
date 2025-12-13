import React from 'react';
import Breadcrumbs from "@/components/Breadcrumbs";

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-stone-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <Breadcrumbs items={[{ label: 'Services' }]} />
        
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-serif text-stone-900">Our Services</h1>
          <div className="w-24 h-1 bg-red-700 mx-auto"></div>
          <p className="text-stone-600 max-w-2xl mx-auto text-lg leading-relaxed">
            We offer a range of services to honor your loved ones and provide support during difficult times.
            From traditional burials to modern memorials, every service is conducted with the utmost dignity.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
            <div className="bg-slate-50 p-8 rounded-sm shadow-md">
                <h3 className="text-2xl font-serif font-bold text-stone-800 mb-4">Traditional Burial</h3>
                <p className="text-stone-600 mb-4">
                    Our traditional burial services include full plot preparation, maintenance, and coordination with funeral directors.
                    We offer single, companion, and family estate plots throughout our historic grounds.
                </p>
                <ul className="list-disc list-inside text-stone-700 space-y-2">
                    <li>Perpetual care included</li>
                    <li>Choice of headstone styles</li>
                    <li>Graveside service setup</li>
                </ul>
            </div>

            <div className="bg-slate-50 p-8 rounded-sm shadow-md">
                <h3 className="text-2xl font-serif font-bold text-stone-800 mb-4">Cremation Services</h3>
                <p className="text-stone-600 mb-4">
                    For those choosing cremation, we offer several respectful options including columbarium niches,
                    scattering gardens, and in-ground cremation plots.
                </p>
                <ul className="list-disc list-inside text-stone-700 space-y-2">
                    <li>Glass-front niches</li>
                    <li>Granite memorial benches</li>
                    <li>Memorial garden plaques</li>
                </ul>
            </div>
            
            <div className="bg-slate-50 p-8 rounded-sm shadow-md md:col-span-2">
                <h3 className="text-2xl font-serif font-bold text-stone-800 mb-4">Memorial Planning</h3>
                <p className="text-stone-600 mb-4">
                    Our dedicated staff is here to help you create a lasting tribute. We assist with:
                </p>
                <div className="grid md:grid-cols-3 gap-4 text-stone-700">
                    <div className="p-4 bg-stone-100 rounded-sm">
                        <span className="font-bold block mb-1">Monument Design</span>
                        Custom engraving and stone selection
                    </div>
                    <div className="p-4 bg-stone-100 rounded-sm">
                        <span className="font-bold block mb-1">Floral Placement</span>
                        Annual and seasonal programs
                    </div>
                    <div className="p-4 bg-stone-100 rounded-sm">
                        <span className="font-bold block mb-1">Genealogy</span>
                        Record search assistance
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}