import React, { useState, memo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Search, MapPin, Map } from 'lucide-react';

// Memoized hero image component - all 4 visible on mobile with scattered layout
// Optimized with WebP, responsive srcSet, and proper aspect ratio
const HeroImage = memo(function HeroImage({ index, src, webpSrc, alt, activeImage, onClick, positionClass, mobilePositionClass }) {
  const isActive = activeImage === index;
  const isPriority = index <= 2;
  
  return (
    <div 
      onClick={() => onClick(index)}
      className={`absolute transform cursor-pointer transition-all duration-500 ease-out will-change-transform ${
        isActive 
          ? 'rotate-0 scale-125 md:scale-110 z-50 translate-x-0 translate-y-0' 
          : `${mobilePositionClass} md:${positionClass} active:scale-105 z-${index * 10}`
      }`}
      style={{ 
        transitionTimingFunction: isActive ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' : 'ease-out',
        contentVisibility: 'auto',
        containIntrinsicSize: '340px 255px'
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(index)}
      aria-label={`View ${alt}`}
    >
      <div className={`rounded-sm shadow-lg md:shadow-2xl overflow-hidden ${
        isActive ? 'max-w-[240px] sm:max-w-[280px] md:max-w-[340px]' : 'max-w-[140px] sm:max-w-[180px] md:max-w-[340px]'
      }`}>
        <picture>
          {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
          <img 
            src={src}
            alt={alt}
            className="w-full h-auto"
            loading={isPriority ? "eager" : "lazy"}
            decoding={isPriority ? "sync" : "async"}
            fetchpriority={isPriority ? "high" : "auto"}
            width={340}
            height={255}
            style={{ aspectRatio: '340/255' }}
          />
        </picture>
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
    <section className="relative min-h-[600px] sm:min-h-[620px] md:h-[700px] flex items-center justify-center bg-[#0c0a09] px-3 sm:px-4 py-12 sm:py-16 md:py-0">
      {/* Background - optimized with smaller mobile image and WebP */}
      <picture className="absolute inset-0" aria-hidden="true">
        <source 
          media="(max-width: 640px)" 
          srcSet="https://images.unsplash.com/photo-1618529285090-e9b46bdc394c?q=30&w=400&auto=format&fit=crop&fm=webp"
          type="image/webp"
        />
        <source 
          media="(max-width: 1024px)" 
          srcSet="https://images.unsplash.com/photo-1618529285090-e9b46bdc394c?q=40&w=800&auto=format&fit=crop&fm=webp"
          type="image/webp"
        />
        <source 
          srcSet="https://images.unsplash.com/photo-1618529285090-e9b46bdc394c?q=50&w=1200&auto=format&fit=crop&fm=webp"
          type="image/webp"
        />
        <img 
          src="https://images.unsplash.com/photo-1618529285090-e9b46bdc394c?q=50&w=800&auto=format&fit=crop"
          alt=""
          className="w-full h-full object-cover opacity-30"
          loading="eager"
          decoding="async"
          fetchpriority="low"
        />
      </picture>
      <div className="bg-gradient-to-b from-stone-900/90 via-stone-900/60 to-stone-900/90 absolute inset-0"></div>
      
      <div className="relative z-10 max-w-7xl w-full flex flex-col md:flex-row items-center gap-6 sm:gap-8 md:gap-16 px-2 sm:px-4">
        {/* Left Side Image Gallery - stacked cater-corner on mobile, scattered on desktop */}
        <div className="flex-shrink-0 w-full md:w-1/2 max-w-md md:max-w-xl relative">
          {/* Mobile: Stacked cater-corner layout with tap-to-center-enlarge */}
          <div className="relative h-[280px] flex items-center justify-center md:hidden">
            {/* Image 1 - Top Left */}
            <div 
              onClick={() => handleImageClick(1)}
              className={`absolute cursor-pointer transition-all duration-500 ease-out will-change-transform ${
                activeImage === 1 
                  ? 'z-50 rotate-0 scale-[1.4] translate-x-0 translate-y-0' 
                  : 'z-10 -rotate-6 -translate-x-16 -translate-y-14 active:scale-105'
              }`}
              style={{ transitionTimingFunction: activeImage === 1 ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' : 'ease-out' }}
            >
              <div className={`rounded-sm shadow-xl overflow-hidden w-[130px] ${activeImage === 1 ? 'ring-2 ring-teal-400' : ''}`}>
                <picture>
                  <source srcSet="https://base44.app/api/apps/693cd1f0c20a0662b5f281d5/files/public/693cd1f0c20a0662b5f281d5/1cf0694e7_img-1767267629072.webp" type="image/webp" />
                  <img 
                    src="https://base44.app/api/apps/693cd1f0c20a0662b5f281d5/files/public/693cd1f0c20a0662b5f281d5/80931bb52_img-1767267629071.jpg"
                    alt="Union Springs Cemetery"
                    className="w-full h-auto"
                    loading="eager"
                    width={130}
                    height={98}
                  />
                </picture>
              </div>
            </div>
            {/* Image 2 - Top Right */}
            <div 
              onClick={() => handleImageClick(2)}
              className={`absolute cursor-pointer transition-all duration-500 ease-out will-change-transform ${
                activeImage === 2 
                  ? 'z-50 rotate-0 scale-[1.4] translate-x-0 translate-y-0' 
                  : 'z-20 rotate-5 translate-x-16 -translate-y-10 active:scale-105'
              }`}
              style={{ transitionTimingFunction: activeImage === 2 ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' : 'ease-out' }}
            >
              <div className={`rounded-sm shadow-xl overflow-hidden w-[130px] ${activeImage === 2 ? 'ring-2 ring-teal-400' : ''}`}>
                <picture>
                  <source srcSet="https://base44.app/api/apps/693cd1f0c20a0662b5f281d5/files/public/693cd1f0c20a0662b5f281d5/7948b6c15_img-1767267602235.webp" type="image/webp" />
                  <img 
                    src="https://base44.app/api/apps/693cd1f0c20a0662b5f281d5/files/public/693cd1f0c20a0662b5f281d5/ffe750753_img-1767267602235.jpg"
                    alt="Union Springs Cemetery Gate"
                    className="w-full h-auto"
                    loading="eager"
                    width={130}
                    height={98}
                  />
                </picture>
              </div>
            </div>
            {/* Image 3 - Bottom Left */}
            <div 
              onClick={() => handleImageClick(3)}
              className={`absolute cursor-pointer transition-all duration-500 ease-out will-change-transform ${
                activeImage === 3 
                  ? 'z-50 rotate-0 scale-[1.4] translate-x-0 translate-y-0' 
                  : 'z-30 -rotate-4 -translate-x-14 translate-y-14 active:scale-105'
              }`}
              style={{ transitionTimingFunction: activeImage === 3 ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' : 'ease-out' }}
            >
              <div className={`rounded-sm shadow-xl overflow-hidden w-[130px] ${activeImage === 3 ? 'ring-2 ring-teal-400' : ''}`}>
                <picture>
                  <source srcSet="https://base44.app/api/apps/693cd1f0c20a0662b5f281d5/files/public/693cd1f0c20a0662b5f281d5/6e06dcd71_img-1767267640474.webp" type="image/webp" />
                  <img 
                    src="https://base44.app/api/apps/693cd1f0c20a0662b5f281d5/files/public/693cd1f0c20a0662b5f281d5/b65c10f44_img-1767267640474.jpg"
                    alt="Union Springs History"
                    className="w-full h-auto"
                    loading="lazy"
                    width={130}
                    height={98}
                  />
                </picture>
              </div>
            </div>
            {/* Image 4 - Bottom Right */}
            <div 
              onClick={() => handleImageClick(4)}
              className={`absolute cursor-pointer transition-all duration-500 ease-out will-change-transform ${
                activeImage === 4 
                  ? 'z-50 rotate-0 scale-[1.4] translate-x-0 translate-y-0' 
                  : 'z-40 rotate-6 translate-x-14 translate-y-16 active:scale-105'
              }`}
              style={{ transitionTimingFunction: activeImage === 4 ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' : 'ease-out' }}
            >
              <div className={`rounded-sm shadow-xl overflow-hidden w-[130px] ${activeImage === 4 ? 'ring-2 ring-teal-400' : ''}`}>
                <picture>
                  <source srcSet="https://base44.app/api/apps/693cd1f0c20a0662b5f281d5/files/public/693cd1f0c20a0662b5f281d5/ab190c6ca_img-1767267584485.webp" type="image/webp" />
                  <img 
                    src="https://base44.app/api/apps/693cd1f0c20a0662b5f281d5/files/public/693cd1f0c20a0662b5f281d5/dd9991be5_img-1767267584485.jpg"
                    alt="Union Springs Church"
                    className="w-full h-auto"
                    loading="lazy"
                    width={130}
                    height={98}
                  />
                </picture>
              </div>
            </div>
          </div>
          
          {/* Desktop: Scattered absolute positioned layout */}
          <div className="hidden md:flex relative h-[450px] items-center justify-center">
            <HeroImage
              index={1}
              src="https://base44.app/api/apps/693cd1f0c20a0662b5f281d5/files/public/693cd1f0c20a0662b5f281d5/80931bb52_img-1767267629071.jpg"
              webpSrc="https://base44.app/api/apps/693cd1f0c20a0662b5f281d5/files/public/693cd1f0c20a0662b5f281d5/1cf0694e7_img-1767267629072.webp"
              alt="Union Springs Cemetery"
              activeImage={activeImage}
              onClick={handleImageClick}
              positionClass="-rotate-6 -translate-x-8"
              mobilePositionClass=""
            />
            <HeroImage
              index={2}
              src="https://base44.app/api/apps/693cd1f0c20a0662b5f281d5/files/public/693cd1f0c20a0662b5f281d5/ffe750753_img-1767267602235.jpg"
              webpSrc="https://base44.app/api/apps/693cd1f0c20a0662b5f281d5/files/public/693cd1f0c20a0662b5f281d5/7948b6c15_img-1767267602235.webp"
              alt="Union Springs Cemetery Gate"
              activeImage={activeImage}
              onClick={handleImageClick}
              positionClass="rotate-6 translate-x-8 translate-y-4"
              mobilePositionClass=""
            />
            <HeroImage
              index={3}
              src="https://base44.app/api/apps/693cd1f0c20a0662b5f281d5/files/public/693cd1f0c20a0662b5f281d5/b65c10f44_img-1767267640474.jpg"
              webpSrc="https://base44.app/api/apps/693cd1f0c20a0662b5f281d5/files/public/693cd1f0c20a0662b5f281d5/6e06dcd71_img-1767267640474.webp"
              alt="Union Springs History"
              activeImage={activeImage}
              onClick={handleImageClick}
              positionClass="-rotate-12 -translate-y-24 -translate-x-6"
              mobilePositionClass=""
            />
            <HeroImage
              index={4}
              src="https://base44.app/api/apps/693cd1f0c20a0662b5f281d5/files/public/693cd1f0c20a0662b5f281d5/dd9991be5_img-1767267584485.jpg"
              webpSrc="https://base44.app/api/apps/693cd1f0c20a0662b5f281d5/files/public/693cd1f0c20a0662b5f281d5/ab190c6ca_img-1767267584485.webp"
              alt="Union Springs Church"
              activeImage={activeImage}
              onClick={handleImageClick}
              positionClass="rotate-[25deg] translate-x-48 translate-y-32"
              mobilePositionClass=""
            />
          </div>
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