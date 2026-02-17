import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Menu, X, Search, Map, Info, Home, Lock, UserCircle, ChevronDown, LayoutDashboard, Users, Calendar, Facebook, Activity, BarChart2, Trash2, Image } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Toaster } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import GovernanceProvider from '@/components/gov/GovernanceProvider';
import ImageContextMenu from '@/components/common/ImageContextMenu';
import { base44 } from '@/api/base44Client';

// Memoized mobile menu item for performance
const MobileMenuItem = memo(function MobileMenuItem({ item, onClose }) {
  const location = useLocation();
  const isActive = location.pathname === item.path;
  
  return (
    <Link
      to={createPageUrl(item.path.replace('/', '')) || '/'}
      onClick={onClose}
      className={`flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium touch-manipulation active:bg-stone-700 ${
        isActive ? 'bg-stone-800 text-white' : 'text-stone-300'
      }`}
    >
      <item.icon className="w-5 h-5 text-teal-500" aria-hidden="true" />
      {item.label}
    </Link>
  );
});

// Memoized mobile dropdown section
const MobileDropdownSection = memo(function MobileDropdownSection({ item, onClose }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-stone-400 uppercase tracking-wider">
        <item.icon className="w-4 h-4 text-teal-500" aria-hidden="true" />
        {item.label}
      </div>
      <div className="pl-8 space-y-0.5">
        {item.items.map((subItem) => (
          <Link
            key={subItem.label}
            to={createPageUrl(subItem.path.replace('/', ''))}
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-stone-400 active:bg-stone-700 active:text-white touch-manipulation"
          >
            <subItem.icon className="w-4 h-4 text-stone-500" aria-hidden="true" />
            {subItem.label}
          </Link>
        ))}
      </div>
    </div>
  );
});

// Board member roles that have admin-level access
const ADMIN_ROLES = ['admin', 'President', 'Vice President', 'Legal', 'Treasurer', 'Secretary', 'Caretaker', 'Administrator'];

// Helper to check if user has admin-level access
export function isAdminRole(userRole) {
  return ADMIN_ROLES.includes(userRole);
}

export default function Layout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const [isAdminUser, setIsAdminUser] = useState(false);
  
  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);
  
  useEffect(() => {
    let mounted = true;
    base44.auth.me().then(u => { 
      if (mounted) setIsAdminUser(u?.role === 'admin' || isAdminRole(u?.role)); 
    }).catch(() => { if (mounted) setIsAdminUser(false); });
    return () => { mounted = false; };
  }, []);
  
  // Memoized toggle handler
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);
  
  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  // Design System Constants mapped to Tailwind classes
  const colors = {
    primary: 'bg-teal-700 hover:bg-teal-800 text-white',
    secondary: 'bg-red-700 hover:bg-red-800 text-white',
    background: 'bg-stone-200', // "Granite" interpretation
    surface: 'bg-slate-50',     // "Silver" interpretation
    text: 'text-stone-900',
    border: 'border-stone-300'
  };

  const isAdmin = location.pathname.startsWith('/admin');
  useEffect(() => {
    const tags = [
      ['Cache-Control', 'no-cache, no-store, must-revalidate'],
      ['Pragma', 'no-cache'],
      ['Expires', '0'],
    ];
    const created = tags.map(([he, content]) => {
      const m = document.createElement('meta');
      m.httpEquiv = he;
      m.content = content;
      document.head.appendChild(m);
      return m;
    });

    // Add resource hints for performance
    const hints = [
      // Preconnect to external domains
      { rel: 'preconnect', href: 'https://qtrypzzcjebvfcihiynt.supabase.co' },
      { rel: 'preconnect', href: 'https://images.unsplash.com' },
      { rel: 'dns-prefetch', href: 'https://base44.app' },
    ];
    const linkElements = hints.map(({ rel, href }) => {
      const link = document.createElement('link');
      link.rel = rel;
      link.href = href;
      if (rel === 'preconnect') link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
      return link;
    });

    return () => {
      created.forEach((m) => {
        if (m && m.parentNode) m.parentNode.removeChild(m);
      });
      linkElements.forEach((l) => {
        if (l && l.parentNode) l.parentNode.removeChild(l);
      });
    };
  }, []);

  // Third-party script blocking: run once at app startup (not per route)
  useEffect(() => {
    if (window.__thirdPartyBlocked) return;
    try {
      const selectors = [
        'script[src*="googletagmanager.com"]',
        'script[src*="gtm.js"]',
        'script[src*="connect.facebook.net"]',
        'script[src*="js.stripe.com"]',
        'script[src*="cdn.tailwindcss.com"]'
      ];
      const nodes = document.querySelectorAll(selectors.join(','));
      nodes.forEach((n) => { try { n.parentNode?.removeChild(n); } catch {} });
      window.__thirdPartyBlocked = true;
      window.dataLayer = window.dataLayer || [];
      if (!window.fbq) {
        window.fbq = (...args) => { (window.__fbqQueue = window.__fbqQueue || []).push(args); };
      }
    } catch {}
  }, []);

  const pageBackground = isAdmin ? 'bg-stone-100' : colors.background;

  // Clear client-side caches and reload app
  const clearSiteCache = async () => {
    if (typeof window === 'undefined') return;
    const ok = window.confirm('This will clear local data (localStorage, sessionStorage, caches) and reload the app. Continue?');
    if (!ok) return;

    // Clear Web Storage
    try { window.localStorage?.clear?.(); } catch {}
    try { window.sessionStorage?.clear?.(); } catch {}

    // Clear Cache Storage
    try {
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
    } catch {}

    // Unregister Service Workers
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {}

    // Best-effort clear IndexedDB (where supported)
    try {
      const anyIDB = window.indexedDB;
      const hasList = typeof anyIDB?.databases === 'function';
      if (hasList) {
        const dbs = await anyIDB.databases();
        await Promise.all(
          (dbs || []).map((db) =>
            new Promise((resolve) => {
              try {
                const req = anyIDB.deleteDatabase(db.name);
                req.onsuccess = req.onerror = req.onblocked = () => resolve();
              } catch { resolve(); }
            })
          )
        );
      }
    } catch {}

    // Reload with cache-busting param
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('v', String(Date.now()));
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  };

  // PERF: navItems is static — define outside render or useMemo to avoid recreating on every render
  const navItems = useMemo(() => [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Plan Your Visit', path: '/Visitor', icon: Calendar },
    { label: 'Deceased Search', path: '/search', icon: Search },
    { 
      label: 'Old Cementery Plots & Map', 
      path: '/plots', 
      icon: Map,
      isDropdown: true,
      items: [
        { label: 'Old Plots and Map', path: '/plots', icon: Map },
        { label: 'New Plots for Reservation', path: '/NewPlotsAndMap', icon: Map }
      ]
    },
    { label: 'Services', path: '/services', icon: Info },
    { 
    label: 'Admin Dashboard', 
    path: '/admin', 
    icon: Lock,
    isDropdown: true,
    items: [
    { label: 'Administrators', path: '/admin', icon: LayoutDashboard },
    { label: 'Employee Portal', path: '/Employees', icon: Users },
    { label: 'Member Portal', path: '/MemberPortal', icon: UserCircle },
    { label: 'Principle Portal', path: '/PrinciplePortal', icon: UserCircle },

    { label: 'Advanced Reports', path: '/Reports', icon: BarChart2 },
    { label: 'Security Dashboard', path: '/SecurityDashboard', icon: Activity },

    { label: 'Image Management', path: '/ImageManager', icon: Image }
    ]
    }
  ], []);

  const navItemsFiltered = useMemo(() => navItems.map((item) => {
    if (item.label === 'Admin Dashboard' && item.items) {
      const adminOnly = ['Performance Dashboard', 'Advanced Reports', 'Image Management', 'Security Dashboard', 'Board Members & Employees'];
      const items = isAdminUser ? item.items : item.items.filter((s) => !adminOnly.includes(s.label));
      return { ...item, items };
    }
    return item;
  }), [isAdminUser]);

  return (
    <div className={`min-h-screen ${pageBackground} font-sans text-stone-900 flex flex-col app-font-scope`}>
      <style>{`
        /* Critical CSS - inlined for fastest first paint */
        .app-font-scope {
          --font-body: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
          --font-heading: Georgia, "Times New Roman", Times, serif;
        }
        .app-font-scope, .app-font-scope :where(p, li, span, a, small, input, button, textarea, select) {
          font-family: var(--font-body);
        }
        .app-font-scope :where(h1, h2, h3, h4, h5, h6, .heading-serif) {
          font-family: var(--font-heading);
        }
        /* Responsive type scale */
        .app-font-scope h1 { font-size: clamp(1.75rem, 2.5vw, 2.25rem); line-height: 1.2; }
        .app-font-scope h2 { font-size: clamp(1.375rem, 2vw, 1.75rem); line-height: 1.25; }
        .app-font-scope h3 { font-size: clamp(1.125rem, 1.5vw, 1.375rem); line-height: 1.3; }
        .app-font-scope :where(p, li) { line-height: 1.6; }
        /* Prevent iOS zoom on focus — ensure inputs render at 16px min */
        .app-font-scope input,
        .app-font-scope select,
        .app-font-scope textarea {
          font-size: max(16px, 1em);
        }
        /* Hide number input spinners cross-browser */
        input[type='number'] {
          -moz-appearance: textfield;
          appearance: textfield;
        }
        input[type='number']::-webkit-outer-spin-button,
        input[type='number']::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        /* Mobile performance optimizations */
        @media (max-width: 640px) {
          .shadow-lg, .shadow-xl, .shadow-2xl {
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          }
          .transition-all {
            transition-property: opacity, transform;
          }
        }
        /* Smooth touch scrolling */
        .overflow-y-auto, .overflow-x-auto {
          -webkit-overflow-scrolling: touch;
        }
        /* Content visibility for off-screen sections */
        section {
          content-visibility: auto;
          contain-intrinsic-size: auto 500px;
        }
        /* Plot cell containment - prevents layout thrashing from thousands of cells */
        .plot-element {
          contain: layout style paint;
        }
        /* Prefers reduced motion */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
        /* Hide scrollbar but keep functionality */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {/* Header */}
      <header className="bg-stone-900 text-stone-100 shadow-md sticky top-0 z-50 border-b-4 border-teal-700">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo / Title */}
            <Link to={createPageUrl('Home')} className="flex items-center gap-3">

              <picture className="shrink-0">
                <source srcSet="https://base44.app/api/apps/693cd1f0c20a0662b5f281d5/files/public/693cd1f0c20a0662b5f281d5/dfd4d861f_img-1767265605524.webp" type="image/webp" />
                <img src="https://base44.app/api/apps/693cd1f0c20a0662b5f281d5/files/public/693cd1f0c20a0662b5f281d5/308ce6802_img-1767265605524.jpg" alt="logo" className="h-10 w-auto md:h-12" />
              </picture>

              <div className="flex flex-col">
                <span className="text-xl md:text-2xl font-serif tracking-wider uppercase text-teal-500">Union Springs</span>
                <span className="text-[0.65rem] md:text-xs text-stone-400 tracking-[0.2em] uppercase text-center">Cemetery - Shongaloo, LA</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-4">
              {navItemsFiltered.map((item) => (
                item.isDropdown ? (
                  <DropdownMenu key={item.label}>
                    <DropdownMenuTrigger className={`flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-md transition-all duration-300 hover:text-teal-400 focus:outline-none ${
                                                (item.items && item.items.some((subItem) => location.pathname === subItem.path)) ? 'bg-teal-700 text-white font-semibold shadow-md' : 'text-stone-300 hover:text-white'
                                              }`}>
                                                <item.icon className="w-3.5 h-3.5" />
                                                {item.label}
                                                <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
                                              </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-stone-900 border-stone-700 text-stone-200">
                      {item.items.map((subItem) => (
                        <DropdownMenuItem key={subItem.label} asChild className="focus:bg-stone-800 focus:text-white cursor-pointer">
                          <Link to={createPageUrl(subItem.path.replace('/', ''))}>
                            <subItem.icon className="w-4 h-4 mr-2" />
                            {subItem.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link
                    key={item.label}
                    to={createPageUrl(item.path.replace('/', '')) || '/'}
                    className={`flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-md transition-all duration-300 hover:text-teal-400 ${
                      location.pathname === item.path ? 'bg-teal-700 text-white font-semibold shadow-md' : 'text-stone-300 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                )
              ))}
            </nav>

            {/* Mobile Menu Button - optimized for touch */}
            <button
              className="md:hidden p-2 rounded-md text-stone-300 active:bg-stone-700 touch-manipulation"
              onClick={toggleMobileMenu}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation - GPU-accelerated slide animation */}
        <div 
          className={`md:hidden bg-stone-900 border-t border-stone-800 overflow-hidden transition-all duration-200 ease-out ${
            isMobileMenuOpen ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0'
          }`}
          style={{ willChange: 'max-height, opacity' }}
        >
          <nav className="px-2 pt-2 pb-3 space-y-1 overflow-y-auto max-h-[70vh]" aria-label="Mobile navigation">
            {navItemsFiltered.map((item) => (
              item.isDropdown ? (
                <MobileDropdownSection key={item.label} item={item} onClose={closeMobileMenu} />
              ) : (
                <MobileMenuItem key={item.label} item={item} onClose={closeMobileMenu} />
              )
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <div className="max-w-[1240px] mx-auto w-full flex-1 flex flex-col">
          <GovernanceProvider>
            {children}
          </GovernanceProvider>
        </div>
      </main>

      <Toaster />
      <ImageContextMenu />
      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400 py-12 border-t border-stone-800 mt-auto">
        <div className="max-w-[1240px] mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          <div>
            <h3 className="text-teal-500 text-xl md:text-2xl font-serif tracking-wider uppercase mb-4">Union Springs</h3>
            <p className="mb-4">Ideally located in a granite setting, providing a peaceful final resting place with dignity and respect.</p>
            <p>&copy; {new Date().getFullYear()} Union Springs Cemetery Association</p>
            <p className="mt-4 text-xs opacity-70">
              Regulated by the Louisiana Cemetery Board. Complaints may be directed to: 3445 N. Causeway Blvd, Suite 700, Metairie, LA 70002.
            </p>
            </div>
          <div>
            <h3 className="text-stone-100 font-serif text-lg mb-4">Contact</h3>
            <p>1311 Fire Tower Road</p>
            <p>Shongaloo, Webster Parish, Louisiana, 71072</p>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-stone-200 font-medium">Darrell Clendennen</p>
                <p>Phone: (540) 760-8863</p>
                <p>Email: <a href="mailto:clencsm@yahoo.com" className="text-teal-400 hover:text-teal-300">clencsm@yahoo.com</a></p>
              </div>
              <div>
                <p className="text-stone-200 font-medium">RD Teutsch</p>
                <p>Phone: (318) 846-2201</p>
                <p>Email: <a href="mailto:royteutsch@yahoo.com" className="text-teal-400 hover:text-teal-300">royteutsch@yahoo.com</a></p>
              </div>
              <div>
                <p className="text-stone-200 font-medium">General Inquiries</p>
                <p>Email: <Link to={createPageUrl('MemberPortal?tab=messages')} className="text-teal-400 hover:text-teal-300">office@unionsprings.com</Link></p>
              </div>
            </div>
          </div>
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-stone-100 font-serif text-lg">Hours</h3>
              <a 
                href="https://www.facebook.com/LTHPreservation/posts/union-springs-school-church-cemetery-near-shongaloo-webster-parish/4371242156248213/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-stone-400 hover:text-[#1877F2] transition-colors"
                title="Follow us on Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
            </div>
            <p>Gates: Sunrise to Sunset</p>
            <p>Office: Contact the administrator by email or phone</p>
            
            <div className="mt-6 space-y-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-transparent border-stone-700 text-stone-400 hover:text-white hover:bg-stone-800 hover:border-stone-600 w-full justify-start">
                    <Map className="w-4 h-4 mr-2" /> Site Map
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-stone-50 max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="font-serif text-2xl text-stone-900 border-b border-stone-200 pb-2">Site Map</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 py-4">
                      {navItemsFiltered.map((item) => (
                        <div key={item.label}>
                          {item.isDropdown ? (
                            <div className="space-y-2">
                              <div className="font-semibold text-teal-800 flex items-center gap-2">
                                <item.icon className="w-4 h-4" /> {item.label}
                              </div>
                              <div className="pl-6 flex flex-col gap-1.5 border-l-2 border-stone-200 ml-2">
                                {item.items.map(subItem => (
                                  <Link key={subItem.path} to={createPageUrl(subItem.path.replace('/', ''))} className="text-stone-600 text-sm hover:text-teal-700 hover:underline">
                                    {subItem.label}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <Link to={createPageUrl(item.path.replace('/', '')) || '/'} className="font-semibold text-stone-800 hover:text-teal-700 flex items-center gap-2 hover:underline py-1">
                              <item.icon className="w-4 h-4 text-teal-600" /> {item.label}
                            </Link>
                          )}
                        </div>
                      ))}
                      <div className="col-span-1 sm:col-span-2 pt-4 mt-2 border-t border-stone-200">
                        <Link to={createPageUrl('Contact')} className="font-semibold text-stone-800 hover:text-teal-700 flex items-center gap-2 hover:underline">
                          <Info className="w-4 h-4 text-teal-600" /> Contact Us
                        </Link>
                      </div>
                  </div>
                </DialogContent>
              </Dialog>
              {isAdminUser && (
                <Button variant="outline" size="sm" onClick={clearSiteCache} className="bg-transparent border-stone-700 text-stone-400 hover:text-white hover:bg-stone-800 hover:border-stone-600 w-full justify-start">
                  <Trash2 className="w-4 h-4 mr-2" /> Clear Cache
                </Button>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}