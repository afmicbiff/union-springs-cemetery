import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Clock, MapPin, AlertCircle, Car, Dog, Flower2 } from 'lucide-react';

export default function VisitorPage() {
  return (
    <div className="min-h-screen bg-stone-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-serif text-stone-900">Plan Your Visit</h1>
          <div className="w-24 h-1 bg-red-700 mx-auto"></div>
          <p className="text-stone-600 max-w-2xl mx-auto text-lg leading-relaxed">
            We welcome you to Union Springs Cemetery. Whether you are visiting a loved one or exploring our historic grounds, we ask that you respect the sanctity of this place.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
            
            {/* Hours & Location */}
            <div className="bg-white p-8 rounded-sm shadow-md space-y-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-teal-100 rounded-full">
                        <Clock className="w-6 h-6 text-teal-700" />
                    </div>
                    <div>
                        <h3 className="text-xl font-serif font-bold text-stone-800 mb-2">Visiting Hours</h3>
                        <p className="text-stone-600">Daily: Sunrise to Sunset</p>
                        <p className="text-stone-500 text-sm mt-2 italic">Gates close automatically at dusk.</p>
                    </div>
                </div>

                <div className="border-t border-stone-100 pt-6 flex items-start gap-4">
                    <div className="p-3 bg-teal-100 rounded-full">
                        <MapPin className="w-6 h-6 text-teal-700" />
                    </div>
                    <div>
                        <h3 className="text-xl font-serif font-bold text-stone-800 mb-2">Office Location</h3>
                        <p className="text-stone-600">123 Granite Way<br/>Union Springs, USA</p>
                        <p className="text-stone-600 mt-2">Mon-Fri: 9am - 5pm<br/>Sat: 10am - 2pm</p>
                    </div>
                </div>
            </div>

            {/* Rules */}
            <div className="bg-white p-8 rounded-sm shadow-md">
                <div className="flex items-center gap-3 mb-6">
                    <AlertCircle className="w-6 h-6 text-red-700" />
                    <h3 className="text-xl font-serif font-bold text-stone-800">Visitor Guidelines</h3>
                </div>
                <ul className="space-y-4 text-stone-700">
                    <li className="flex gap-3 items-center">
                        <Car className="w-4 h-4 text-stone-400 flex-shrink-0" />
                        <span>Please drive slowly (15 mph limit).</span>
                    </li>
                    <li className="flex gap-3 items-center">
                        <Dog className="w-4 h-4 text-stone-400 flex-shrink-0" />
                        <span>Pets must be leashed at all times.</span>
                    </li>
                    <li className="flex gap-3 items-center">
                        <Flower2 className="w-4 h-4 text-stone-400 flex-shrink-0" />
                        <span>Artificial flowers allowed Nov-Mar only.</span>
                    </li>
                    <li className="flex gap-3 items-center">
                        <span className="w-4 h-4 flex items-center justify-center text-xs font-bold text-stone-400">P</span>
                        <span>Please park only on paved roads.</span>
                    </li>
                </ul>
            </div>
        </div>

        {/* Call to Action */}
        <div className="bg-slate-50 border border-stone-200 p-8 rounded-sm text-center space-y-6">
            <h3 className="text-2xl font-serif text-stone-800">Looking for a specific location?</h3>
            <p className="text-stone-600">Use our digital map to find plots or get walking directions.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to={createPageUrl('Plots')}>
                    <Button className="bg-teal-700 hover:bg-teal-800 text-white font-serif px-8">
                        View Map
                    </Button>
                </Link>
                <Link to={createPageUrl('Search')}>
                    <Button variant="outline" className="border-stone-400 text-stone-700 font-serif px-8">
                        Search Deceased
                    </Button>
                </Link>
            </div>
        </div>

      </div>
    </div>
  );
}