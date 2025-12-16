import React from 'react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Search, MapPin } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative h-[80vh] min-h-[500px] md:h-[600px] flex items-center justify-center bg-[#0c0a09] text-center px-4 overflow-hidden">
      {/* Background Image with optimized loading and overlay */}
      <div 
        className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1618529285090-e9b46bdc394c?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat mix-blend-overlay"
        aria-hidden="true"
      />
      <div className="bg-gradient-to-b from-stone-900/80 via-transparent to-stone-900/90 absolute inset-0"></div>
      
      <div className="relative z-10 max-w-4xl space-y-6 md:space-y-8 animate-fade-in-up px-4">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif text-stone-50 tracking-wide leading-tight drop-shadow-lg">
          Peaceful Resting <br /> 
          <span className="text-teal-500 italic">In Union Springs</span>
        </h1>
        
        <p className="text-base sm:text-lg md:text-xl text-stone-200 font-light max-w-2xl mx-auto leading-relaxed drop-shadow-md">
          A historic sanctuary of remembrance, honoring lives with dignity in a setting of natural granite beauty.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 w-full max-w-md mx-auto sm:max-w-none">
          <Link to={createPageUrl('Search')} className="w-full sm:w-auto">
            <Button className="w-full bg-teal-700 hover:bg-teal-600 text-white font-serif tracking-widest px-8 py-6 text-lg rounded-sm shadow-xl transition-all hover:scale-105 hover:shadow-2xl">
              <Search className="mr-2 h-5 w-5" /> Find a Loved One
            </Button>
          </Link>
          <Link to={createPageUrl('Plots')} className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full bg-stone-100 hover:bg-white text-stone-900 font-serif tracking-widest px-8 py-6 text-lg rounded-sm shadow-xl transition-all hover:scale-105 hover:shadow-2xl">
              <MapPin className="mr-2 h-5 w-5" /> View Plots
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}