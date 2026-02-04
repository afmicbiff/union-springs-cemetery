import React, { useState, memo } from 'react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Search, MapPin, Map } from 'lucide-react';

const HeroSection = memo(function HeroSection() {
  const [activeImage, setActiveImage] = useState(null);

  const handleImageClick = (index) => {
    setActiveImage(activeImage === index ? null : index);
  };

  return (
    <section className="relative min-h-[500px] md:h-[700px] flex items-center justify-center bg-[#0c0a09] px-4 overflow-hidden py-12 md:py-0">
      {/* Background Image with optimized loading and overlay */}
      <picture className="absolute inset-0" aria-hidden="true">
        <source 
          media="(max-width: 640px)" 
          srcSet="https://images.unsplash.com/photo-1618529285090-e9b46bdc394c?q=60&w=640&auto=format&fit=crop" 
        />
        <source 
          media="(max-width: 1024px)" 
          srcSet="https://images.unsplash.com/photo-1618529285090-e9b46bdc394c?q=70&w=1024&auto=format&fit=crop" 
        />
        <img 
          src="https://images.unsplash.com/photo-1618529285090-e9b46bdc394c?q=80&w=2000&auto=format&fit=crop"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </picture>
      <div className="bg-gradient-to-b from-stone-900/90 via-stone-900/50 to-stone-900/90 absolute inset-0"></div>
      
      <div className="relative z-10 max-w-7xl w-full flex flex-col md:flex-row items-center gap-8 md:gap-16 px-4 animate-fade-in-up">
        {/* Left Side Image */}
        <div className="flex-shrink-0 w-full md:w-1/2 max-w-xl relative h-[350px] md:h-[450px] flex items-center justify-center">
           {/* First Image - Tilted Left */}
           <div 
             onClick={() => handleImageClick(1)}
             className={`absolute transform transition-all duration-500 ease-in-out cursor-pointer ${
               activeImage === 1 
                 ? 'rotate-0 scale-110 z-50' 
                 : '-rotate-6 -translate-x-8 z-10 hover:scale-105 hover:z-50'
             }`}
           >
             <div className="max-w-[280px] md:max-w-[340px] rounded-sm shadow-2xl">
               <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/884fb99da_image.png" 
                  alt="Union Springs Cemetery" 
                  className="w-full h-auto shadow-2xl drop-shadow-2xl md:shadow-2xl"
               />
             </div>
           </div>
           
           {/* Second Image - Tilted Right */}
           <div 
             onClick={() => handleImageClick(2)}
             className={`absolute transform transition-all duration-500 ease-in-out cursor-pointer ${
               activeImage === 2 
                 ? 'rotate-0 scale-110 z-50' 
                 : 'rotate-6 translate-x-8 translate-y-4 z-20 hover:scale-105 hover:z-50'
             }`}
           >
             <div className="max-w-[280px] md:max-w-[340px] rounded-sm shadow-2xl">
               <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/a5956ebdb_image.png" 
                  alt="Union Springs Cemetery Gate" 
                  className="w-full h-auto shadow-2xl drop-shadow-2xl md:shadow-2xl"
               />
             </div>
           </div>

           {/* Third Image - Top Position */}
           <div 
             onClick={() => handleImageClick(3)}
             className={`absolute transform transition-all duration-500 ease-in-out cursor-pointer ${
               activeImage === 3 
                 ? 'rotate-0 translate-y-0 translate-x-0 scale-110 z-50' 
                 : '-rotate-12 -translate-y-24 -translate-x-6 z-0 hover:scale-105 hover:z-50'
             }`}
           >
             <div className="max-w-[280px] md:max-w-[340px] rounded-sm shadow-2xl">
               <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/419a6d107_image.png" 
                  alt="Union Springs History" 
                  className="w-full h-auto shadow-2xl drop-shadow-2xl md:shadow-2xl"
               />
             </div>
           </div>

           {/* Fourth Image - Bottom Right Overlay */}
           <div 
             onClick={() => handleImageClick(4)}
             className={`absolute transform transition-all duration-500 ease-in-out cursor-pointer hidden md:block ${
               activeImage === 4 
                 ? 'rotate-0 translate-x-0 translate-y-0 scale-110 z-50' 
                 : 'rotate-[25deg] translate-x-48 translate-y-32 z-30 hover:scale-105 hover:z-50'
             }`}
           >
             <div className="max-w-[280px] md:max-w-[340px] rounded-sm shadow-2xl">
               <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/865c809e6_image.png" 
                  alt="Union Springs Church" 
                  className="w-full h-auto shadow-2xl drop-shadow-2xl md:shadow-2xl"
               />
             </div>
           </div>
        </div>

        {/* Right Side Content */}
        <div className="flex-1 text-center md:text-left space-y-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif text-stone-50 tracking-wide leading-tight drop-shadow-lg">
            Peaceful Resting <br /> 
            <span className="text-teal-500 text-2xl sm:text-3xl md:text-4xl lg:text-5xl">In Union Springs</span>
          </h1>
          
          <p className="text-base sm:text-lg text-stone-200 font-light max-w-2xl mx-auto md:mx-0 leading-relaxed drop-shadow-md">
            A historic sanctuary of remembrance, honoring lives with dignity in a setting of natural granite beauty.
          </p>
          
          <div className="flex flex-col gap-4 justify-center md:justify-start pt-6 w-full max-w-md mx-auto md:mx-0">
            <Link to={createPageUrl('Search')} className="w-full">
              <Button className="w-full bg-teal-700 hover:bg-teal-600 text-white font-serif tracking-widest px-8 py-6 text-lg rounded-sm shadow-xl transition-all hover:scale-105 hover:shadow-2xl">
                <Search className="mr-2 h-5 w-5" /> Find a Loved One
              </Button>
            </Link>
            <Link to={createPageUrl('Plots')} className="w-full">
              <Button variant="secondary" className="w-full bg-stone-100 hover:bg-white text-stone-900 font-serif tracking-widest px-8 py-6 text-lg rounded-sm shadow-xl transition-all hover:scale-105 hover:shadow-2xl">
                <MapPin className="mr-2 h-5 w-5" /> View Old Cemetery Plots
              </Button>
            </Link>
            <Link to={createPageUrl('NewPlotsAndMap')} className="w-full">
              <Button variant="secondary" className="w-full bg-stone-100 hover:bg-white text-stone-900 font-serif tracking-widest px-8 py-6 text-lg rounded-sm shadow-xl transition-all hover:scale-105 hover:shadow-2xl">
                <Map className="mr-2 h-5 w-5" /> New Plots for Reservation
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
});

export default HeroSection;