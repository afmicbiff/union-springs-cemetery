import React, { useState, memo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Search, MapPin, Map } from 'lucide-react';

// Memoized hero image component - optimized for mobile with reduced transforms
const HeroImage = memo(function HeroImage({ index, src, alt, activeImage, onClick, positionClass, hiddenOnMobile }) {
  const isActive = activeImage === index;
  
  return (
    <div 
      onClick={() => onClick(index)}
      className={`absolute transform transition-transform duration-300 ease-out cursor-pointer ${
        hiddenOnMobile ? 'hidden md:block' : ''
      } ${isActive ? 'rotate-0 scale-110 z-50' : `${positionClass} active:scale-105`}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(index)}
      aria-label={`View ${alt}`}
    >
      <div className="max-w-[200px] sm:max-w-[260px] md:max-w-[340px] rounded-sm shadow-lg md:shadow-2xl">
        <img 
          src={src}
          alt={alt}
          className="w-full h-auto"
          loading={index <= 2 ? "eager" : "lazy"}
          decoding="async"
          width={340}
          height={255}
        />
      </div>
    </div>
  );
});

const HeroSection = memo(function HeroSection() {
  const [activeImage, setActiveImage] = useState(null);

  const handleImageClick = useCallback((index) => {
    setActiveImage(prev => prev === index ? null : index);
  }, []);

  return (
    <section className="relative min-h-[480px] sm:min-h-[500px] md:h-[700px] flex items-center justify-center bg-[#0c0a09] px-3 sm:px-4 overflow-hidden py-8 sm:py-12 md:py-0">
      {/* Background - simplified for mobile performance */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1618529285090-e9b46bdc394c?q=50&w=800&auto=format&fit=crop)' }}
        aria-hidden="true"
      />
      <div className="bg-gradient-to-b from-stone-900/90 via-stone-900/60 to-stone-900/90 absolute inset-0"></div>
      
      <div className="relative z-10 max-w-7xl w-full flex flex-col md:flex-row items-center gap-6 sm:gap-8 md:gap-16 px-2 sm:px-4">
        {/* Left Side Image Gallery - reduced height on mobile */}
        <div className="flex-shrink-0 w-full md:w-1/2 max-w-xl relative h-[280px] sm:h-[350px] md:h-[450px] flex items-center justify-center">
          <HeroImage
            index={1}
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/884fb99da_image.png"
            alt="Union Springs Cemetery"
            activeImage={activeImage}
            onClick={handleImageClick}
            positionClass="-rotate-3 sm:-rotate-6 -translate-x-4 sm:-translate-x-8 z-10"
          />
          <HeroImage
            index={2}
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/a5956ebdb_image.png"
            alt="Union Springs Cemetery Gate"
            activeImage={activeImage}
            onClick={handleImageClick}
            positionClass="rotate-3 sm:rotate-6 translate-x-4 sm:translate-x-8 translate-y-2 sm:translate-y-4 z-20"
          />
          <HeroImage
            index={3}
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/419a6d107_image.png"
            alt="Union Springs History"
            activeImage={activeImage}
            onClick={handleImageClick}
            positionClass="-rotate-6 sm:-rotate-12 -translate-y-16 sm:-translate-y-24 -translate-x-3 sm:-translate-x-6 z-0"
          />
          <HeroImage
            index={4}
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/865c809e6_image.png"
            alt="Union Springs Church"
            activeImage={activeImage}
            onClick={handleImageClick}
            positionClass="rotate-[25deg] translate-x-48 translate-y-32 z-30"
            hiddenOnMobile
          />
        </div>

        {/* Right Side Content */}
        <div className="flex-1 text-center md:text-left space-y-4 sm:space-y-6">
          <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-serif text-stone-50 tracking-wide leading-tight">
            Peaceful Resting <br /> 
            <span className="text-teal-500 text-xl sm:text-2xl md:text-4xl lg:text-5xl">In Union Springs</span>
          </h1>
          
          <p className="text-sm sm:text-base md:text-lg text-stone-200 font-light max-w-2xl mx-auto md:mx-0 leading-relaxed px-2 sm:px-0">
            A historic sanctuary of remembrance, honoring lives with dignity in a setting of natural granite beauty.
          </p>
          
          <div className="flex flex-col gap-3 sm:gap-4 justify-center md:justify-start pt-4 sm:pt-6 w-full max-w-md mx-auto md:mx-0 px-2 sm:px-0">
            <Link to={createPageUrl('Search')} className="w-full">
              <Button className="w-full bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white font-serif tracking-wider sm:tracking-widest px-4 sm:px-8 py-4 sm:py-6 text-base sm:text-lg rounded-sm shadow-lg touch-manipulation active:scale-[0.98]">
                <Search className="mr-2 h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" /> Find a Loved One
              </Button>
            </Link>
            <Link to={createPageUrl('Plots')} className="w-full">
              <Button variant="secondary" className="w-full bg-stone-100 hover:bg-white active:bg-stone-200 text-stone-900 font-serif tracking-wider sm:tracking-widest px-4 sm:px-8 py-4 sm:py-6 text-base sm:text-lg rounded-sm shadow-lg touch-manipulation active:scale-[0.98]">
                <MapPin className="mr-2 h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" /> Old Cemetery Plots
              </Button>
            </Link>
            <Link to={createPageUrl('NewPlotsAndMap')} className="w-full">
              <Button variant="secondary" className="w-full bg-stone-100 hover:bg-white active:bg-stone-200 text-stone-900 font-serif tracking-wider sm:tracking-widest px-4 sm:px-8 py-4 sm:py-6 text-base sm:text-lg rounded-sm shadow-lg touch-manipulation active:scale-[0.98]">
                <Map className="mr-2 h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" /> New Plots
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
});

export default HeroSection;