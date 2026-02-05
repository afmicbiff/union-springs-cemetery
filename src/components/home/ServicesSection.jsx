import React, { memo } from 'react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Phone, Check } from 'lucide-react';

// Memoized service item for performance
const ServiceItem = memo(function ServiceItem({ text }) {
  return (
    <li className="flex items-center gap-4 bg-white p-3 rounded-md shadow-sm border border-stone-100 w-full">
      <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
        <Check className="w-4 h-4 text-teal-700" aria-hidden="true" />
      </div>
      <span className="font-medium">{text}</span>
    </li>
  );
});

const ServicesSection = memo(function ServicesSection() {
  return (
    <section className="py-16 md:py-24 bg-stone-50 border-t border-stone-200">
       <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col md:flex-row items-center gap-12 lg:gap-20">
          <div className="md:w-1/2 w-full">
              <div className="relative group">
                <picture>
                  <source 
                    media="(max-width: 640px)"
                    srcSet="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/b9bd76074_wooden-crosss.jpg?width=400"
                    type="image/jpeg"
                  />
                  <source 
                    srcSet="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/b9bd76074_wooden-crosss.jpg?width=600"
                    type="image/jpeg"
                  />
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/b9bd76074_wooden-crosss.jpg"
                    alt="Peaceful cemetery grounds"
                    className="relative rounded-sm shadow-[0_35px_60px_-15px_rgba(0,0,0,0.8)] w-full h-[300px] md:h-[400px] object-cover grayscale hover:grayscale-0 hover:-translate-y-2 hover:scale-[1.02] transition-all duration-700 ease-in-out"
                    loading="lazy"
                    decoding="async"
                    width={600}
                    height={400}
                    style={{ aspectRatio: '600/400', contentVisibility: 'auto' }}
                  />
                </picture>
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
              
              <ul className="space-y-4 text-stone-700 inline-block text-left" role="list">
                <ServiceItem text="Traditional Burial Plots" />
                <ServiceItem text="Cremation Niches" />
                <ServiceItem text="Family Estates" />
              </ul>

              <div className="pt-2">
                <Link to={createPageUrl('Contact')}>
                    <Button className="bg-red-800 hover:bg-red-900 text-white font-serif px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 text-sm sm:text-base md:text-lg rounded-sm shadow-lg w-full sm:w-auto whitespace-normal leading-snug text-center touch-manipulation active:scale-[0.98]">
                        <Phone className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3" aria-hidden="true" /> Contact the Administrator
                    </Button>
                </Link>
              </div>
          </div>
       </div>
    </section>
  );
});

export default ServicesSection;