import React, { memo } from 'react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Info card component for hours/location and contact
const InfoCard = memo(function InfoCard({ children, className = '' }) {
  return (
    <div className={`bg-white p-6 sm:p-8 rounded-sm shadow-[0_-15px_35px_rgba(0,0,0,0.5)] hover:shadow-[0_-20px_45px_rgba(0,0,0,0.6)] hover:-translate-y-1 transition-all duration-300 border-b-4 border-transparent hover:border-teal-600 ${className}`}>
      {children}
    </div>
  );
});

const InfoSection = memo(function InfoSection() {
  return (
    <>
      {/* Hours & Contact Cards - Overlapping black area */}
      <section className="relative z-20">
        {/* Black background extension for card overlap effect */}
        <div className="absolute inset-x-0 top-0 h-28 sm:h-32 md:h-36 lg:h-40 bg-[#0c0a09]" aria-hidden="true" />
        {/* Stone background for below cards */}
        <div className="absolute inset-x-0 top-28 sm:top-32 md:top-36 lg:top-40 bottom-0 bg-stone-100" aria-hidden="true" />
        <div className="relative max-w-4xl mx-auto px-4 md:px-8 pt-8 sm:pt-10 md:pt-12 pb-12 md:pb-16 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Hours & Location Card */}
          <InfoCard>
            <h3 className="text-lg sm:text-xl font-serif font-bold text-stone-800 mb-4">Hours & Location</h3>
            <div className="space-y-4 text-stone-600 text-sm sm:text-base">
              <div>
                <p className="font-semibold text-stone-800">Visiting Hours</p>
                <p>Daily: Sunrise to Sunset</p>
              </div>
              <div>
                <p className="font-semibold text-stone-800">Location</p>
                <p>1311 Fire Tower Road</p>
                <p>Shongaloo, Webster Parish, LA 71072</p>
              </div>
              <a 
                href="https://www.google.com/maps/search/?api=1&query=1311+Fire+Tower+Road+Shongaloo+LA+71072" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-teal-700 font-bold uppercase text-xs tracking-widest hover:text-teal-900 flex items-center gap-1 mt-4 hover:underline underline-offset-4"
              >
                Get Directions <span aria-hidden="true">&rarr;</span>
              </a>
            </div>
          </InfoCard>

          {/* Contact Card */}
          <InfoCard>
            <h3 className="text-lg sm:text-xl font-serif font-bold text-stone-800 mb-4">Contact</h3>
            <p className="text-stone-600 text-sm sm:text-base mb-4">
              Need assistance locating a loved one? Our board is here to help.
            </p>
            <Link 
              to={createPageUrl('Contact')}
              className="text-teal-700 font-bold uppercase text-xs tracking-widest hover:text-teal-900 flex items-center gap-1 hover:underline underline-offset-4"
            >
              Contact Administrator <span aria-hidden="true">&rarr;</span>
            </Link>
          </InfoCard>
        </div>
      </section>

      {/* Tradition of Dignity Section */}
      <section className="py-12 sm:py-16 md:py-24 px-4 md:px-8 bg-white relative z-10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)]">
        <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-serif text-stone-900 tracking-tight">A Tradition of Dignity</h2>
          <div className="w-16 sm:w-24 h-1 bg-red-700 mx-auto rounded-full" aria-hidden="true"></div>
          <p className="text-base sm:text-lg md:text-xl text-stone-600 leading-relaxed font-light px-2">
            Established in 1892, Union Springs Cemetery has served our community for generations. 
            Nestled among ancient oaks and granite formations, our grounds offer a serene environment 
            for reflection and remembrance. We are dedicated to preserving the memory of those who 
            rest here and supporting families with compassion.
          </p>
          <div className="pt-4 sm:pt-8">
             <Link to={createPageUrl('History')}>
               <Button 
                 variant="outline" 
                 className="border-2 border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-white font-serif uppercase tracking-widest px-6 sm:px-10 py-4 sm:py-6 text-xs sm:text-sm rounded-sm transition-colors duration-300 touch-manipulation active:scale-[0.98]"
               >
                 Read Our History
               </Button>
             </Link>
          </div>
        </div>
      </section>
    </>
  );
});

export default InfoSection;