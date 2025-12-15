import React from 'react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Search, MapPin, Flower2, Phone } from 'lucide-react';

export default function Home() {
  return (
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[500px] flex items-center justify-center bg-[#0c0a09] text-center px-4 overflow-hidden">
        {/* Abstract "Granite" Background Effect - Darkened */}
        <div className="absolute inset-0 opacity-30 bg-[url('https://images.unsplash.com/photo-1618529285090-e9b46bdc394c?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay"></div>
        <div className="bg-zinc-700 absolute inset-0 from-black via-transparent to-black/80"></div>
        
        <div className="relative z-10 max-w-3xl space-y-6 animate-fade-in-up -mt-[112px]">
          <h1 className="text-4xl md:text-6xl font-serif text-stone-100 tracking-wide">
            Peaceful Resting <br /> <span className="text-teal-500">In Union Springs</span>
          </h1>
          <p className="text-lg md:text-xl text-stone-300 font-light max-w-xl mx-auto leading-relaxed">
            A historic sanctuary of remembrance, honoring lives with dignity in a setting of natural granite beauty.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Link to={createPageUrl('Search')}>
              <Button className="w-full sm:w-auto bg-teal-700 hover:bg-teal-600 text-white font-serif tracking-wider px-8 py-3 h-auto text-lg rounded-sm shadow-lg transition-transform hover:-translate-y-1">
                <Search className="mr-2 h-5 w-5" /> Find a Loved One
              </Button>
            </Link>
            <Link to={createPageUrl('Plots')}>
              <Button variant="secondary" className="w-full sm:w-auto bg-stone-100 hover:bg-white text-stone-900 font-serif tracking-wider px-8 py-3 h-auto text-lg rounded-sm shadow-lg transition-transform hover:-translate-y-1">
                <MapPin className="mr-2 h-5 w-5" /> View Plots
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Access Grid */}
      <section className="py-16 px-4 md:px-8 bg-stone-200">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 -mt-[112px] relative z-20">
          
          {/* Card 1 */}
          <div className="bg-slate-50 p-8 rounded-sm shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group flex flex-col">
            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-teal-700 transition-colors duration-300">
              <Search className="w-6 h-6 text-teal-700 group-hover:text-white" />
            </div>
            <h3 className="text-xl font-serif font-bold text-stone-800 mb-3">Record Search</h3>
            <p className="text-stone-600 leading-relaxed mb-6">
              Locate gravesites, view obituaries, and find service information for loved ones resting here.
            </p>
            <Link to={createPageUrl('Search')} className="text-red-700 font-semibold uppercase text-sm tracking-widest hover:text-red-800 flex items-center gap-1 mt-auto">
              Search Records &rarr;
            </Link>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-50 p-8 rounded-sm shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group flex flex-col">
            <div className="w-12 h-12 bg-stone-200 rounded-full flex items-center justify-center mb-6 group-hover:bg-stone-700 transition-colors duration-300">
              <Flower2 className="w-6 h-6 text-stone-700 group-hover:text-white" />
            </div>
            <h3 className="text-xl font-serif font-bold text-stone-800 mb-3">Send Flowers</h3>
            <p className="text-stone-600 leading-relaxed mb-6">
              Partnering with local florists to ensure fresh, beautiful arrangements are delivered directly to the site.
            </p>
            <span className="text-red-700 font-semibold uppercase text-sm tracking-widest hover:text-red-800 flex items-center gap-1 cursor-pointer mt-auto">
              View Florists &rarr;
            </span>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-50 p-8 rounded-sm shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group flex flex-col">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-red-700 transition-colors duration-300">
              <MapPin className="w-6 h-6 text-red-700 group-hover:text-white" />
            </div>
            <h3 className="text-xl font-serif font-bold text-stone-800 mb-3">Plan a Visit</h3>
            <p className="text-stone-600 leading-relaxed mb-6">
              Our grounds are open daily. View our map, hours, and visitor guidelines to plan your respectful visit.
            </p>
            <Link to={createPageUrl('Visitor')} className="text-red-700 font-semibold uppercase text-sm tracking-widest hover:text-red-800 flex items-center gap-1 mt-auto">
              Visitor Info &rarr;
            </Link>
          </div>

        </div>
      </section>

      {/* Info Section */}
      <section className="py-20 px-4 md:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-serif text-stone-900">A Tradition of Dignity</h2>
          <div className="w-24 h-1 bg-red-700 mx-auto"></div>
          <p className="text-lg text-stone-600 leading-loose">
            Established in 1892, Union Springs Cemetery has served our community for generations. 
            Nestled among ancient oaks and granite formations, our grounds offer a serene environment 
            for reflection and remembrance. We are dedicated to preserving the memory of those who 
            rest here and supporting families with compassion.
          </p>
          <div className="pt-8">
             <Link to={createPageUrl('History')}>
               <Button variant="outline" className="border-2 border-stone-800 text-stone-800 hover:bg-stone-800 hover:text-white font-serif uppercase tracking-widest px-8 py-4 h-auto rounded-sm">
                 Read Our History
               </Button>
             </Link>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 bg-stone-100 border-t border-stone-200">
         <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
                <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693cd1f0c20a0662b5f281d5/b9bd76074_wooden-crosss.jpg"
              alt="Peaceful cemetery grounds"
              className="rounded-sm shadow-xl border-8 border-white grayscale hover:grayscale-0 transition-all duration-700" />

            </div>
            <div className="md:w-1/2 space-y-6">
                <h2 className="text-3xl font-serif text-stone-800">Pre-Planning Services</h2>
                <p className="text-stone-600 text-lg">
                    Planning ahead provides peace of mind for you and your family. Our counselors are here to guide you through plot selection and arrangement options.
                </p>
                <ul className="space-y-3 text-stone-700">
                    <li className="flex items-center gap-3">
                        <span className="w-2 h-2 bg-teal-600 rounded-full"></span>
                        Traditional Burial Plots
                    </li>
                    <li className="flex items-center gap-3">
                        <span className="w-2 h-2 bg-teal-600 rounded-full"></span>
                        Cremation Niches
                    </li>
                    <li className="flex items-center gap-3">
                        <span className="w-2 h-2 bg-teal-600 rounded-full"></span>
                        Family Estates
                    </li>
                </ul>
                <Link to={createPageUrl('Contact')}>
                    <Button className="bg-red-700 hover:bg-red-800 text-white font-serif mt-4">
                        <Phone className="w-4 h-4 mr-2" /> Contact an Advisor
                    </Button>
                </Link>
            </div>
         </div>
      </section>
    </div>);

}