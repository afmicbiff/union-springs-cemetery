import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Search, MapPin } from 'lucide-react';

const QuickAccessCard = memo(function QuickAccessCard({ icon: Icon, title, description, linkText, linkUrl, colorClass, hoverColorClass }) {
  return (
    <div className="bg-white p-6 sm:p-8 rounded-sm shadow-[0_-15px_35px_rgba(0,0,0,0.5)] hover:shadow-[0_-20px_45px_rgba(0,0,0,0.6)] hover:-translate-y-1 transition-all duration-300 group flex flex-col items-center text-center h-full border-b-4 border-transparent hover:border-teal-600 touch-manipulation">
      <div className={`w-12 h-12 sm:w-14 sm:h-14 ${colorClass} rounded-full flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${hoverColorClass}`} aria-hidden="true" />
      </div>
      <h3 className="text-lg sm:text-xl font-serif font-bold text-stone-800 mb-2 sm:mb-3">{title}</h3>
      <p className="text-stone-600 leading-relaxed mb-4 sm:mb-6 text-sm md:text-base flex-grow">
        {description}
      </p>
      {linkUrl ? (
        <Link 
          to={linkUrl} 
          className="text-teal-700 font-bold uppercase text-xs tracking-widest hover:text-teal-900 flex items-center gap-1 mt-auto group-hover:underline underline-offset-4 active:scale-95 transition-transform"
        >
          {linkText} <span aria-hidden="true">&rarr;</span>
        </Link>
      ) : (
        <span className="text-teal-700 font-bold uppercase text-xs tracking-widest hover:text-teal-900 flex items-center gap-1 mt-auto cursor-pointer group-hover:underline underline-offset-4">
          {linkText} <span aria-hidden="true">&rarr;</span>
        </span>
      )}
    </div>
  );
});

const QuickAccessGrid = memo(function QuickAccessGrid() {
  return (
    <section className="relative z-20">
      {/* Black background extension for card overlap effect */}
      <div className="absolute inset-x-0 top-0 h-28 sm:h-32 md:h-36 lg:h-40 bg-[#0c0a09]" aria-hidden="true" />
      {/* Stone background for below cards */}
      <div className="absolute inset-x-0 top-28 sm:top-32 md:top-36 lg:top-40 bottom-0 bg-stone-100" aria-hidden="true" />
      <div className="relative max-w-4xl mx-auto px-4 md:px-8 pt-8 sm:pt-10 md:pt-12 pb-12 md:pb-20 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        
        <QuickAccessCard
          icon={Search}
          title="Record Search"
          description="Locate gravesites, view obituaries, and find service information for loved ones resting here."
          linkText="Search Records"
          linkUrl={createPageUrl('Search')}
          colorClass="bg-teal-50"
          hoverColorClass="text-teal-700"
        />



        <QuickAccessCard
          icon={MapPin}
          title="Plan a Visit"
          description="Our grounds are open daily. View our map, hours, and visitor guidelines to plan your respectful visit."
          linkText="Visitor Info"
          linkUrl={createPageUrl('Visitor')}
          colorClass="bg-red-50"
          hoverColorClass="text-red-700"
        />

      </div>
    </section>
  );
});

export default QuickAccessGrid;