import React from 'react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Phone, Check } from 'lucide-react';

export default function ServicesSection() {
  return (
    <section className="py-16 md:py-24 bg-stone-50 border-t border-stone-200">
       <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col md:flex-row items-center gap-12 lg:gap-20">
          <div className="md:w-1/2 w-full">
              <div className="relative group">
                <div className="absolute inset-0 bg-teal-900 rounded-sm transform translate-x-2 translate-y-2 group-hover:translate-x-3 group-hover:translate-y-3 transition-transform duration-500 opacity-20"></div>
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/b9bd76074_wooden-crosss.jpg"
                  alt="Peaceful cemetery grounds"
                  className="relative rounded-sm shadow-2xl w-full h-[300px] md:h-[400px] object-cover grayscale group-hover:grayscale-0 transition-all duration-700" 
                />
              </div>
          </div>
          
          <div className="md:w-1/2 w-full space-y-8 text-center md:text-left">
              <div>
                <h2 className="text-3xl md:text-4xl font-serif text-stone-900 mb-4">Services</h2>
                <p className="text-stone-600 text-lg leading-relaxed">
                    The staff at the Union Springs Cemetery maintains the grounds and upkeep of the property.
                    <br /><br />
                    The cemetery allows for:
                </p>
              </div>
              
              <ul className="space-y-4 text-stone-700 inline-block text-left">
                  <li className="flex items-center gap-4 bg-white p-3 rounded-md shadow-sm border border-stone-100 w-full">
                      <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 text-teal-700" />
                      </div>
                      <span className="font-medium">Traditional Burial Plots</span>
                  </li>
                  <li className="flex items-center gap-4 bg-white p-3 rounded-md shadow-sm border border-stone-100 w-full">
                      <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 text-teal-700" />
                      </div>
                      <span className="font-medium">Cremation Niches</span>
                  </li>
                  <li className="flex items-center gap-4 bg-white p-3 rounded-md shadow-sm border border-stone-100 w-full">
                      <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 text-teal-700" />
                      </div>
                      <span className="font-medium">Family Estates</span>
                  </li>
              </ul>

              <div className="pt-2">
                <Link to={createPageUrl('Contact')}>
                    <Button className="bg-red-800 hover:bg-red-900 text-white font-serif px-8 py-6 text-lg rounded-sm shadow-lg w-full sm:w-auto">
                        <Phone className="w-5 h-5 mr-3" /> Contact the Administrator of the Grounds
                    </Button>
                </Link>
              </div>
          </div>
       </div>
    </section>
  );
}