import React, { useState, useEffect, memo, useMemo, useCallback, lazy, Suspense } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { X, Megaphone } from 'lucide-react';
import SEOHead from '@/components/common/SEOHead';
import StructuredData from '@/components/common/StructuredData';

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

  const cemeterySchema = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "Cemetery",
    "name": "Union Springs Cemetery",
    "description": "Historic cemetery established in 1892 in Shongaloo, Webster Parish, Louisiana. Offering burial plots, memorial services, and deceased record searches.",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "1311 Fire Tower Road",
      "addressLocality": "Shongaloo",
      "addressRegion": "LA",
      "postalCode": "71072",
      "addressCountry": "US"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 32.9868,
      "longitude": -93.3065
    },
    "telephone": "(540) 760-8863",
    "openingHours": "Mo-Su sunrise-sunset",
    "foundingDate": "1892",
    "image": "https://base44.app/api/apps/693cd1f0c20a0662b5f281d5/files/public/693cd1f0c20a0662b5f281d5/dfd4d861f_img-1767265605524.webp",
    "sameAs": [
      "https://www.facebook.com/LTHPreservation/posts/union-springs-school-church-cemetery-near-shongaloo-webster-parish/4371242156248213/"
    ]
  }), []);

  const faqSchema = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Where is Union Springs Cemetery located?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Union Springs Cemetery is located at 1311 Fire Tower Road, Shongaloo, Webster Parish, Louisiana 71072."
        }
      },
      {
        "@type": "Question",
        "name": "What are the visiting hours for Union Springs Cemetery?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The cemetery gates are open from sunrise to sunset, every day of the week."
        }
      },
      {
        "@type": "Question",
        "name": "How can I search for a deceased person at Union Springs Cemetery?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You can search our online deceased records database on our website by name, date, or plot location. Visit the Deceased Search page to get started."
        }
      },
      {
        "@type": "Question",
        "name": "How do I reserve a burial plot at Union Springs Cemetery?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "To reserve a plot, contact our office by phone at (540) 760-8863 or email clencsm@yahoo.com. You can also browse available plots on our website."
        }
      },
      {
        "@type": "Question",
        "name": "Is Union Springs Cemetery regulated?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Union Springs Cemetery is regulated by the Louisiana Cemetery Board. Complaints may be directed to 3445 N. Causeway Blvd, Suite 700, Metairie, LA 70002."
        }
      }
    ]
  }), []);

  return (
    <div className="flex flex-col w-full">
      <SEOHead
        title="Union Springs Cemetery – Shongaloo, LA | Since 1892"
        description="Union Springs Cemetery in Shongaloo, Louisiana. Search deceased records, view burial plots, plan your visit. Serving Webster Parish families since 1892."
      />
      <StructuredData id="cemetery" data={cemeterySchema} />
      <StructuredData id="faq" data={faqSchema} />
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