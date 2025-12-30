import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Menu, X, Search, Map, Info, Home, Lock, UserCircle, ChevronDown, LayoutDashboard, Users, Calendar, Facebook, UserPlus, Settings, Mail, Activity, BarChart2 } from 'lucide-react';
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
import { initPerf } from '@/components/perf/initPerf';
initPerf();
export default function Layout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const location = useLocation();

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
  const pageBackground = isAdmin ? 'bg-stone-100' : colors.background;

  const navItems = [
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
    { label: 'Board Members & Employees', path: '/Employees', icon: Users },
    { label: 'Member Portal/Account', path: '/MemberPortal', icon: UserCircle },
    { label: 'Performance Dashboard', path: '/PerformanceDashboard', icon: Activity },
    { label: 'Advanced Reports', path: '/Reports', icon: BarChart2 }
    ]
    },
  ];

  return (
    <div className={`min-h-screen ${pageBackground} font-serif text-stone-900 flex flex-col`}>
      {/* Header */}
      <header className="bg-stone-900 text-stone-100 shadow-md sticky top-0 z-50 border-b-4 border-teal-700">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo / Title */}
            <Link to={createPageUrl('Home')} className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/44a8ffe54_Gemini_Generated_Image_mbje5gmbje5gmbje.png" 
                alt="Union Springs Logo" 
                className="h-14 w-auto rounded-full"
              />
              <div className="flex flex-col">
                <span className="text-xl md:text-2xl font-serif tracking-wider uppercase text-teal-500">Union Springs</span>
                <span className="text-[0.65rem] md:text-xs text-stone-400 tracking-[0.2em] uppercase text-center">Cemetery - Shongaloo, LA</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-4">
              {navItems.map((item) => (
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

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-md text-stone-300 hover:text-white hover:bg-stone-800"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-stone-900 border-t border-stone-800">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navItems.map((item) => (
                item.isDropdown ? (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center gap-3 px-3 py-4 text-base font-medium text-stone-300">
                      <item.icon className="w-5 h-5 text-teal-500" />
                      {item.label}
                    </div>
                    <div className="pl-11 space-y-1">
                      {item.items.map((subItem) => (
                        <Link
                          key={subItem.label}
                          to={createPageUrl(subItem.path.replace('/', ''))}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium text-stone-400 hover:text-white hover:bg-stone-800"
                        >
                          <subItem.icon className="w-4 h-4 text-stone-500" />
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link
                    key={item.label}
                    to={createPageUrl(item.path.replace('/', '')) || '/'}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-4 rounded-md text-base font-medium text-stone-300 hover:text-white hover:bg-stone-800"
                  >
                    <item.icon className="w-5 h-5 text-teal-500" />
                    {item.label}
                  </Link>
                )
              ))}
            </div>
          </div>
        )}
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
      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400 py-12 border-t border-stone-800 mt-auto">
        <div className="max-w-[1240px] mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          <div>
            <h3 className="text-teal-500 font-serif text-lg mb-4 uppercase tracking-widest">Union Springs</h3>
            <p className="mb-4">Ideally located in a granite setting, providing a peaceful final resting place with dignity and respect.</p>
            <p>&copy; {new Date().getFullYear()} Union Springs Cemetery Association</p>
          </div>
          <div>
            <h3 className="text-stone-100 font-serif text-lg mb-4">Contact</h3>
            <p>1311 Fire Tower Road</p>
            <p>Shongaloo, Webster Parish, Louisiana, 71072</p>
            <p className="mt-2">Phone: (555) 123-4567</p>
            <p>Email: office@unionsprings.com</p>
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
            
            <div className="mt-6">
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
                      {navItems.map((item) => (
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
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}