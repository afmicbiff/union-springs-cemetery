import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function Breadcrumbs({ items }) {
  return (
    <nav className="flex items-center text-sm text-stone-500 mb-6 font-serif" aria-label="Breadcrumb">
      <Link to={createPageUrl('Home')} className="hover:text-teal-700 flex items-center transition-colors">
        <Home className="w-4 h-4 mr-1" />
        Home
      </Link>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="w-4 h-4 mx-2 text-stone-400" />
          {item.path ? (
             <Link to={createPageUrl(item.path)} className="hover:text-teal-700 transition-colors">
               {item.label}
             </Link>
          ) : (
             <span className="font-medium text-stone-800">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}