import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { X, Megaphone } from 'lucide-react';
import HeroSection from '@/components/home/HeroSection';
import QuickAccessGrid from '@/components/home/QuickAccessGrid';
import InfoSection from '@/components/home/InfoSection';
import ServicesSection from '@/components/home/ServicesSection';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Home() {
  const [dismissedIds, setDismissedIds] = useState([]);

  useEffect(() => {
    const dismissed = JSON.parse(localStorage.getItem('dismissed_home_notifications') || '[]');
    setDismissedIds(dismissed);
  }, []);

  const { data: notifications } = useQuery({
    queryKey: ['active-home-notifications'],
    queryFn: () => base44.entities.HomeNotification.list('-created_at', 5),
    initialData: []
  });

  const activeNotification = notifications?.find(n => n.is_active && !dismissedIds.includes(n.id));

  const handleDismiss = (id) => {
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    localStorage.setItem('dismissed_home_notifications', JSON.stringify(newDismissed));
  };

  return (
    <div className="flex flex-col w-full overflow-x-hidden">
      {activeNotification && (
        <div className="bg-teal-700 text-white px-4 py-3 relative animate-in slide-in-from-top duration-500">
          <div className="max-w-[1240px] mx-auto flex items-start md:items-center justify-between gap-4 pr-8">
            <div className="flex gap-3">
              <Megaphone className="w-5 h-5 shrink-0 mt-0.5 md:mt-0 text-teal-300" />
              <p className="font-medium text-sm md:text-base leading-snug">
                {activeNotification.message}
              </p>
            </div>
            <button 
              onClick={() => handleDismiss(activeNotification.id)}
              className="absolute top-2 right-2 md:relative md:top-auto md:right-auto p-1.5 hover:bg-teal-600 rounded-full transition-colors shrink-0"
              title="Do not show communication anymore"
            >
              <X className="w-5 h-5" />
              <span className="sr-only">Do not show communication anymore</span>
            </button>
          </div>
        </div>
      )}
      {/* Quick link to resend acknowledgment */}
      <div className="bg-teal-50 border-b border-teal-200">
        <div className="max-w-[1240px] mx-auto px-4 py-2 text-sm">
          <Link to={createPageUrl('ResendAck') + '?plotNumber=1173'} className="text-teal-800 underline hover:text-teal-900">
            Resend reservation acknowledgment for plot 1173
          </Link>
        </div>
      </div>
      <HeroSection />
      <QuickAccessGrid />
      <InfoSection />
      <ServicesSection />
    </div>
  );
}