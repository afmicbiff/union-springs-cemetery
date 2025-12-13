import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Menu, X, Search, Map, Info, Home, Lock } from 'lucide-react';
import { Button } from "@/components/ui/button";

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

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Deceased Search', path: '/search', icon: Search },
    { label: 'Plots & Map', path: '/plots', icon: Map },
    { label: 'Services', path: '/services', icon: Info },
    { label: 'Admin', path: '/admin', icon: Lock },
  ];

  return (
    <div className={`min-h-screen ${colors.background} font-serif text-stone-900 flex flex-col`}>
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
                <span className="text-[0.65rem] md:text-xs text-stone-400 tracking-[0.2em] uppercase text-center">Cemetery</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={createPageUrl(item.path.replace('/', '')) || '/'}
                  className={`flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-md transition-all duration-300 hover:text-teal-400 ${
                    location.pathname === item.path ? 'text-teal-500 font-semibold bg-stone-800' : 'text-stone-300'
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
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
                <Link
                  key={item.label}
                  to={createPageUrl(item.path.replace('/', '')) || '/'}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-4 rounded-md text-base font-medium text-stone-300 hover:text-white hover:bg-stone-800"
                >
                  <item.icon className="w-5 h-5 text-teal-500" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-[1240px] mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400 py-12 border-t border-stone-800">
        <div className="max-w-[1240px] mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          <div>
            <h3 className="text-teal-500 font-serif text-lg mb-4 uppercase tracking-widest">Union Springs</h3>
            <p className="mb-4">Ideally located in a granite setting, providing a peaceful final resting place with dignity and respect.</p>
            <p>&copy; {new Date().getFullYear()} Union Springs Cemetery</p>
          </div>
          <div>
            <h3 className="text-stone-100 font-serif text-lg mb-4">Contact</h3>
            <p>123 Granite Way</p>
            <p>Union Springs, USA</p>
            <p className="mt-2">Phone: (555) 123-4567</p>
            <p>Email: office@unionsprings.com</p>
          </div>
          <div>
            <h3 className="text-stone-100 font-serif text-lg mb-4">Hours</h3>
            <p>Gates: Sunrise to Sunset</p>
            <p>Office: Mon-Fri 9am - 5pm</p>
            <p>Sat: 10am - 2pm</p>
          </div>
        </div>
      </footer>
    </div>
  );
}