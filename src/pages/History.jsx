import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import Breadcrumbs from "@/components/Breadcrumbs";

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-stone-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12 -mt-[124px]">
        
        <Breadcrumbs items={[{ label: 'Our History' }]} />
        
        {/* Header */}
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-serif text-stone-900 mt-[112px]">Our History</h1>
          <div className="w-24 h-1 bg-red-700 mx-auto"></div>
          <p className="text-stone-600 max-w-2xl mx-auto text-lg leading-relaxed italic">
            "Preserving the memories of our community since 1892."
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-12">
            
            {/* Origins */}
            <div className="bg-slate-50 p-8 md:p-12 rounded-sm shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                <h2 className="text-2xl md:text-3xl font-serif text-stone-800 mb-6 border-b border-stone-200 pb-4">The Origins</h2>
                <div className="prose prose-stone max-w-none text-stone-700 leading-loose">
                    <p className="mb-4">
                        Union Springs Cemetery was founded in the late 19th century by the town's early settlers. Recognizing the need for a dignified resting place that reflected the natural beauty of the region, the original committee selected this site for its rolling hills and abundance of native granite.
                    </p>
                    <p>
                        The first interment took place in October 1892. Since then, the cemetery has grown from a small family plot to a central community landmark, serving as the final resting place for generations of families, veterans, and civic leaders who helped shape Union Springs.
                    </p>
                </div>
            </div>



            {/* Today */}
            <div className="bg-slate-50 p-8 md:p-12 rounded-sm shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                <h2 className="text-2xl md:text-3xl font-serif text-stone-800 mb-6 border-b border-stone-200 pb-4">Union Springs Today</h2>
                <div className="prose prose-stone max-w-none text-stone-700 leading-loose">
                    <p>
                        Today, Union Springs Cemetery remains an active non-profit organization governed by a volunteer Board of Trustees. We are dedicated to maintaining the historic integrity of the grounds while adapting to modern needs.
                    </p>
                    <p className="mt-4">
                        Recent preservation efforts have focused on restoring the oldest section of the cemetery, repairing historic headstones, and enhancing the native plantings that provide a habitat for local wildlife, ensuring that Union Springs remains a place of peace and beauty for centuries to come.
                    </p>
                </div>
            </div>

        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-8">
            <Link to={createPageUrl('Search')}>
                <Button className="w-full sm:w-auto bg-teal-700 hover:bg-teal-800 text-white font-serif px-8 py-6 text-lg rounded-sm">
                    Search Our Records
                </Button>
            </Link>
            <Link to={createPageUrl('Plots')}>
                <Button className="w-full sm:w-auto bg-teal-700 hover:bg-teal-800 text-white font-serif px-8 py-6 text-lg rounded-sm">
                    Plots & Maps
                </Button>
            </Link>
            <Link to={createPageUrl('Services')}>
                <Button className="w-full sm:w-auto bg-teal-700 hover:bg-teal-800 text-white font-serif px-8 py-6 text-lg rounded-sm">
                    Services
                </Button>
            </Link>
        </div>

      </div>
    </div>
  );
}