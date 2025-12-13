import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Clock, MapPin, AlertCircle, Car, Dog, Flower2, Phone } from 'lucide-react';
import Breadcrumbs from "@/components/Breadcrumbs";

export default function VisitorPage() {
  return (
    <div className="space-y-0">
      
      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[274px] flex items-center justify-center bg-[#0c0a09] text-center px-4 overflow-hidden">
        {/* Background - using a fitting cemetery image */}
        <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1518709328825-4d2d4eb72c1c?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center"></div>
        <div className="bg-zinc-600 absolute inset-0 from-black/80 via-transparent to-black/80"></div>
        
        <div className="relative z-10 max-w-4xl w-full space-y-6 animate-fade-in-up pb-20 -mt-[224px]">
          <div className="flex justify-start mt-[112px]">
            <Breadcrumbs items={[{ label: 'Plan a Visit' }]} className="text-stone-300" />
          </div>
          <div className="-mt-24 space-y-6">
            <h1 className="text-4xl md:text-5xl font-serif text-stone-100">Plan Your Visit</h1>
            <div className="w-24 h-1 bg-red-700 mx-auto"></div>
            <p className="text-stone-200 max-w-2xl mx-auto text-lg leading-relaxed font-light">
              We welcome you to Union Springs Cemetery. Whether you are visiting a loved one or exploring our historic grounds, we ask that you respect the sanctity of this place.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content - Quick Access Grid Style */}
      <section className="bg-stone-200 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-[224px] relative z-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 1: Hours & Location */}
            <div className="bg-slate-50 p-8 rounded-sm shadow-md hover:shadow-xl transition-shadow duration-300 group flex flex-col">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-teal-700 transition-colors duration-300">
                <Clock className="w-6 h-6 text-teal-700 group-hover:text-white" />
              </div>
              <h3 className="text-xl font-serif font-bold text-stone-800 mb-3">Hours & Location</h3>
              <div className="text-stone-600 leading-relaxed mb-6 flex-grow space-y-4">
                <div>
                  <p className="font-semibold text-stone-700">Visiting Hours</p>
                  <p>Daily: Sunrise to Sunset</p>
                </div>
                <div>
                  <p className="font-semibold text-stone-700">Office</p>
                  <p>123 Granite Way, Union Springs</p>
                  <p className="text-sm">Mon-Fri: 9am-5pm • Sat: 10am-2pm</p>
                </div>
              </div>
              <a href="https://maps.google.com" target="_blank" rel="noreferrer" className="text-red-700 font-semibold uppercase text-sm tracking-widest hover:text-red-800 flex items-center gap-1 mt-auto">
                Get Directions &rarr;
              </a>
            </div>

            {/* Card 2: Guidelines */}
            <div className="bg-slate-50 p-8 rounded-sm shadow-md hover:shadow-xl transition-shadow duration-300 group flex flex-col">
              <div className="w-12 h-12 bg-stone-200 rounded-full flex items-center justify-center mb-6 group-hover:bg-stone-700 transition-colors duration-300">
                <AlertCircle className="w-6 h-6 text-stone-700 group-hover:text-white" />
              </div>
              <h3 className="text-xl font-serif font-bold text-stone-800 mb-3">Visitor Guidelines</h3>
              <ul className="text-stone-600 leading-relaxed mb-6 flex-grow space-y-2">
                <li className="flex gap-2 items-start"><Car className="w-4 h-4 mt-1 text-stone-400"/> 15 mph speed limit</li>
                <li className="flex gap-2 items-start"><Dog className="w-4 h-4 mt-1 text-stone-400"/> Pets must be leashed</li>
                <li className="flex gap-2 items-start"><Flower2 className="w-4 h-4 mt-1 text-stone-400"/> Artificial flowers Nov-Mar</li>
              </ul>
              <span className="text-red-700 font-semibold uppercase text-sm tracking-widest hover:text-red-800 flex items-center gap-1 mt-auto cursor-pointer">
                View Full Rules &rarr;
              </span>
            </div>

            {/* Card 3: Contact & Map */}
            <div className="bg-slate-50 p-8 rounded-sm shadow-md hover:shadow-xl transition-shadow duration-300 group flex flex-col">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-red-700 transition-colors duration-300">
                <Phone className="w-6 h-6 text-red-700 group-hover:text-white" />
              </div>
              <h3 className="text-xl font-serif font-bold text-stone-800 mb-3">Contact & Maps</h3>
              <div className="text-stone-600 leading-relaxed mb-6 flex-grow">
                <p className="mb-4">Need assistance locating a loved one? Our board is here to help.</p>
                <a href="tel:2222222222" className="flex items-center gap-2 text-lg font-semibold text-teal-700 hover:underline">
                  <Phone className="w-4 h-4" /> 222-222-2222
                </a>
              </div>
              <div className="flex gap-4 mt-auto">
                <Link to={createPageUrl('Plots')} className="text-red-700 font-semibold uppercase text-sm tracking-widest hover:text-red-800">
                  View Map
                </Link>
                <span className="text-stone-300">|</span>
                <Link to={createPageUrl('Search')} className="text-red-700 font-semibold uppercase text-sm tracking-widest hover:text-red-800">
                  Search Records
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}