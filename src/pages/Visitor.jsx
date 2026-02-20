import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Clock, Phone } from 'lucide-react';
import Breadcrumbs from "@/components/Breadcrumbs";
import SEOHead from '@/components/common/SEOHead';

// Memoized card component for better performance
const VisitorCard = memo(function VisitorCard({ icon: Icon, iconBgClass, iconColorClass, title, children, footer }) {
  return (
    <div className="bg-white p-6 sm:p-8 rounded-sm shadow-[0_-15px_35px_rgba(0,0,0,0.5)] hover:shadow-[0_-20px_45px_rgba(0,0,0,0.6)] hover:-translate-y-1 transition-all duration-300 group flex flex-col touch-manipulation border-b-4 border-transparent hover:border-teal-600">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 ${iconBgClass} rounded-full flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${iconColorClass}`} aria-hidden="true" />
      </div>
      <h3 className="text-lg sm:text-xl font-serif font-bold text-stone-800 mb-3">{title}</h3>
      <div className="text-stone-600 leading-relaxed mb-4 sm:mb-6 flex-grow text-sm sm:text-base">
        {children}
      </div>
      {footer}
    </div>
  );
});

const VisitorPage = memo(function VisitorPage() {
  return (
    <div className="space-y-0">
      <SEOHead
        title="Plan Your Visit – Union Springs Cemetery"
        description="Plan your visit to Union Springs Cemetery in Shongaloo, Louisiana. Gate hours, directions, parking, and what to expect when visiting."
      />
      {/* Hero Section - Optimized with proper image loading */}
      <section className="relative min-h-[50vh] md:h-[386px] flex items-center justify-center bg-[#0c0a09] text-center px-4 overflow-hidden py-12 md:py-0">
        {/* Optimized Background Image */}
        <picture className="absolute inset-0">
          <source
            media="(max-width: 640px)"
            srcSet="https://images.unsplash.com/photo-1518709328825-4d2d4eb72c1c?q=60&w=640&auto=format&fit=crop"
            type="image/jpeg"
          />
          <source
            media="(max-width: 1024px)"
            srcSet="https://images.unsplash.com/photo-1518709328825-4d2d4eb72c1c?q=70&w=1024&auto=format&fit=crop"
            type="image/jpeg"
          />
          <img
            src="https://images.unsplash.com/photo-1518709328825-4d2d4eb72c1c?q=80&w=2000&auto=format&fit=crop"
            alt=""
            className="w-full h-full object-cover opacity-40"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            width={2000}
            height={1333}
          />
        </picture>
        <div className="bg-zinc-600/70 absolute inset-0"></div>
        
        <div className="relative z-10 max-w-4xl w-full space-y-4 sm:space-y-6">
          <div className="flex justify-start">
            <Breadcrumbs items={[{ label: 'Plan a Visit' }]} className="text-stone-300" />
          </div>
          <div className="space-y-4 sm:space-y-6 pt-4 md:pt-0">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-stone-100">Plan Your Visit</h1>
            <div className="w-16 sm:w-24 h-1 bg-red-700 mx-auto" aria-hidden="true"></div>
            <p className="text-stone-200 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed font-light px-2">
              We welcome you to Union Springs Cemetery. Whether you are visiting a loved one or exploring our historic grounds, we ask that you respect the sanctity of the cemetery.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content - Quick Access Grid Style with black overlap */}
      <section className="relative z-20">
        {/* Black background extension for card overlap effect */}
        <div className="absolute inset-x-0 top-0 h-24 sm:h-28 md:h-32 lg:h-36 bg-[#0c0a09]" aria-hidden="true" />
        {/* Stone background for below cards */}
        <div className="absolute inset-x-0 top-24 sm:top-28 md:top-32 lg:top-36 bottom-0 bg-stone-200" aria-hidden="true" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 md:pt-10 pb-8 sm:pb-12 md:pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
            
            {/* Card 1: Hours & Location */}
            <VisitorCard
              icon={Clock}
              iconBgClass="bg-teal-100 group-hover:bg-teal-700"
              iconColorClass="text-teal-700 group-hover:text-white"
              title="Hours & Location"
              footer={
                <a 
                  href="https://www.google.com/maps/dir/?api=1&destination=1311+Fire+Tower+Road,+Shongaloo,+LA,+71072" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-red-700 font-semibold uppercase text-xs sm:text-sm tracking-widest hover:text-red-800 flex items-center gap-1 mt-auto active:scale-95 transition-transform touch-manipulation"
                >
                  Get Directions <span aria-hidden="true">&rarr;</span>
                </a>
              }
            >
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-stone-700">Visiting Hours</p>
                  <p>Daily: Sunrise to Sunset</p>
                </div>
                <div>
                  <p className="font-semibold text-stone-700">Location</p>
                  <p>1311 Fire Tower Road<br />Shongaloo, Webster Parish, LA 71072</p>
                </div>
              </div>
            </VisitorCard>

            {/* Card 2: Contact & Map */}
            <VisitorCard
              icon={Phone}
              iconBgClass="bg-red-100 group-hover:bg-red-700"
              iconColorClass="text-red-700 group-hover:text-white"
              title="Contact"
              footer={
                <nav className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 sm:gap-4 mt-auto text-xs sm:text-sm" aria-label="Quick links">
                  <Link to={createPageUrl('Plots')} className="text-red-700 font-semibold uppercase tracking-widest hover:text-red-800 active:scale-95 transition-transform touch-manipulation">
                    Old Cemetery Plots
                  </Link>
                  <span className="text-stone-300 hidden sm:inline" aria-hidden="true">|</span>
                  <Link to={createPageUrl('Search')} className="text-red-700 font-semibold uppercase tracking-widest hover:text-red-800 active:scale-95 transition-transform touch-manipulation">
                    Search Records
                  </Link>
                  <span className="text-stone-300 hidden sm:inline" aria-hidden="true">|</span>
                  <Link to={createPageUrl('NewPlotsAndMap')} className="text-red-700 font-semibold uppercase tracking-widest hover:text-red-800 active:scale-95 transition-transform touch-manipulation">
                    New Plots
                  </Link>
                </nav>
              }
            >
              <p className="mb-4">Need assistance locating a loved one? Our board is here to help.</p>
              <Link to={createPageUrl('Contact')}>
                <Button className="bg-red-800 hover:bg-red-900 text-white font-serif px-4 py-3 sm:py-4 text-sm sm:text-base md:text-lg rounded-sm shadow-lg w-full whitespace-normal break-words leading-snug text-center flex items-center justify-center gap-2 touch-manipulation active:scale-[0.98]">
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                  <span>Contact Administrator</span>
                </Button>
              </Link>
            </VisitorCard>

          </div>
        </div>
      </section>
    </div>
  );
});

export default VisitorPage;