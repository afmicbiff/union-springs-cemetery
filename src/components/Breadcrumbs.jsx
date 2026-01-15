import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function Breadcrumbs({ items, className = "" }) {
  return (
    <nav className={`flex items-center text-sm mb-6 font-serif ${className || 'text-stone-500'}`} aria-label="Breadcrumb">
      <Link to={createPageUrl('Home')} className="hover:text-teal-700 flex items-center transition-colors">
        <Home className="w-4 h-4 mr-1" />
        Home
      </Link>
      {items.map((item, index) => {
        return (
          <span key={index} className="contents">
            <ChevronRight className="w-4 h-4 mx-2 text-stone-400" />
            {item.path ? (
               <Link to={createPageUrl(item.path)} className="hover:text-teal-700 transition-colors">
                 {item.label}
               </Link>
            ) : (
               <span className="font-medium opacity-90">{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}