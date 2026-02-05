import React, { useState, useEffect, memo, useMemo, useCallback, lazy, Suspense } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { X, Megaphone } from 'lucide-react';

// Critical above-the-fold component loaded immediately
import HeroSection from '@/components/home/HeroSection';

// Lazy load below-the-fold components for faster initial render on mobile
const QuickAccessGrid = lazy(() => import('@/components/home/QuickAccessGrid'));
const InfoSection = lazy(() => import('@/components/home/InfoSection'));
const ServicesSection = lazy(() => import('@/components/home/ServicesSection'));

// Minimal loading fallback
const SectionLoader = memo(() => (
  <div className="w-full py-16 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
  </div>
));

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
    <div className="flex flex-col w-full">
      <NotificationBanner notification={activeNotification} onDismiss={handleDismiss} />
      <HeroSection />
      <Suspense fallback={<SectionLoader />}>
        <QuickAccessGrid />
      </Suspense>
      <Suspense fallback={<SectionLoader />}>
        <InfoSection />
      </Suspense>
      <Suspense fallback={<SectionLoader />}>
        <ServicesSection />
      </Suspense>
    </div>
  );
});

export default Home;