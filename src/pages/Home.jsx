import React from 'react';
import HeroSection from '@/components/home/HeroSection';
import QuickAccessGrid from '@/components/home/QuickAccessGrid';
import InfoSection from '@/components/home/InfoSection';
import ServicesSection from '@/components/home/ServicesSection';

export default function Home() {
  return (
    <div className="flex flex-col w-full overflow-x-hidden">
      <HeroSection />
      <QuickAccessGrid />
      <InfoSection />
      <ServicesSection />
    </div>
  );
}