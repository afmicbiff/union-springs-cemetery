import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Search, MapPin } from 'lucide-react';

const QuickAccessCard = ({ icon: Icon, title, description, linkText, linkUrl, colorClass, hoverColorClass }) => (
  <div className="bg-white p-8 rounded-sm shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col items-center text-center h-full border-b-4 border-transparent hover:border-teal-600">
    <div className={`w-14 h-14 ${colorClass} rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
      <Icon className={`w-7 h-7 ${hoverColorClass}`} />
    </div>
    <h3 className="text-xl font-serif font-bold text-stone-800 mb-3">{title}</h3>
    <p className="text-stone-600 leading-relaxed mb-6 text-sm md:text-base flex-grow">
      {description}
    </p>
    {linkUrl ? (
      <Link to={linkUrl} className="text-teal-700 font-bold uppercase text-xs tracking-widest hover:text-teal-900 flex items-center gap-1 mt-auto group-hover:underline underline-offset-4">
        {linkText} &rarr;
      </Link>
    ) : (
      <span className="text-teal-700 font-bold uppercase text-xs tracking-widest hover:text-teal-900 flex items-center gap-1 mt-auto cursor-pointer group-hover:underline underline-offset-4">
        {linkText} &rarr;
      </span>
    )}
  </div>
);

export default function QuickAccessGrid() {
  return (
    <section className="py-12 md:py-20 px-4 md:px-8 bg-stone-100 relative z-20">
      <div className="max-w-6xl mx-auto -mt-24 md:-mt-32 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
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
}