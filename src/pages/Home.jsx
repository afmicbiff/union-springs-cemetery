import React, { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { X, Megaphone } from 'lucide-react';
import HeroSection from '@/components/home/HeroSection';
import QuickAccessGrid from '@/components/home/QuickAccessGrid';
import InfoSection from '@/components/home/InfoSection';
import ServicesSection from '@/components/home/ServicesSection';

// Memoized NotificationBanner component for performance
const NotificationBanner = memo(function NotificationBanner({ notification, onDismiss }) {
  if (!notification) return null;
  
  return (
    <div className="bg-teal-700 text-white px-3 sm:px-4 py-2.5 sm:py-3 relative animate-in slide-in-from-top duration-500">
      <div className="max-w-[1240px] mx-auto flex items-start md:items-center justify-between gap-3 sm:gap-4 pr-8">
        <div className="flex gap-2 sm:gap-3">
          <Megaphone className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 md:mt-0 text-teal-300" />
          <p className="font-medium text-xs sm:text-sm md:text-base leading-snug">
            {notification.message}
          </p>
        </div>
        <button 
          onClick={() => onDismiss(notification.id)}
          className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 md:relative md:top-auto md:right-auto p-1 sm:p-1.5 hover:bg-teal-600 active:bg-teal-500 rounded-full transition-colors shrink-0"
          title="Dismiss notification"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
});

const Home = memo(function Home() {
  const [dismissedIds, setDismissedIds] = useState([]);

  // Load dismissed IDs from localStorage safely
  useEffect(() => {
    try {
      const dismissed = JSON.parse(localStorage.getItem('dismissed_home_notifications') || '[]');
      if (Array.isArray(dismissed)) setDismissedIds(dismissed);
    } catch {
      setDismissedIds([]);
    }
  }, []);

  const { data: notifications = [] } = useQuery({
    queryKey: ['active-home-notifications'],
    queryFn: () => base44.entities.HomeNotification.list('-created_at', 5),
    initialData: [],
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const activeNotification = useMemo(() => 
    (notifications || []).find(n => n.is_active && !dismissedIds.includes(n.id)),
    [notifications, dismissedIds]
  );

  const handleDismiss = useCallback((id) => {
    setDismissedIds(prev => {
      const newDismissed = [...prev, id];
      try {
        localStorage.setItem('dismissed_home_notifications', JSON.stringify(newDismissed));
      } catch {}
      return newDismissed;
    });
  }, []);

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
      <HeroSection />
      <QuickAccessGrid />
      <InfoSection />
      <ServicesSection />
    </div>
  );
});

export default Home;