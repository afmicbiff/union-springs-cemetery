import React from 'react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function InfoSection() {
  return (
    <section className="py-16 md:py-24 px-4 md:px-8 bg-white">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <h2 className="text-3xl md:text-5xl font-serif text-stone-900 tracking-tight">A Tradition of Dignity</h2>
        <div className="w-24 h-1 bg-red-700 mx-auto rounded-full"></div>
        <p className="text-lg md:text-xl text-stone-600 leading-relaxed font-light">
          Established in 1892, Union Springs Cemetery has served our community for generations. 
          Nestled among ancient oaks and granite formations, our grounds offer a serene environment 
          for reflection and remembrance. We are dedicated to preserving the memory of those who 
          rest here and supporting families with compassion.
        </p>
        <div className="pt-8">
           <Link to={createPageUrl('History')}>
             <Button variant="outline" className="border-2 border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-white font-serif uppercase tracking-widest px-10 py-6 text-sm rounded-sm transition-colors duration-300">
               Read Our History
             </Button>
           </Link>
        </div>
      </div>
    </section>
  );
}