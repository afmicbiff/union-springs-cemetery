import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Loader2, Calendar, MapPin, User, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: deceasedList, isLoading } = useQuery({
    queryKey: ['deceased'],
    queryFn: () => base44.entities.Deceased.list({
        limit: 100
    }),
    initialData: [],
  });

  // Client-side filtering for simplicity given the small dataset
  const filteredResults = deceasedList.filter(person => {
    const term = searchTerm.toLowerCase();
    const fullName = `${person.first_name} ${person.last_name}`.toLowerCase();
    return fullName.includes(term) || person.last_name.toLowerCase().includes(term);
  });

  return (
    <div className="min-h-screen bg-stone-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-serif text-stone-900">Deceased Search</h1>
          <p className="text-stone-600 max-w-2xl mx-auto text-lg">
            Search our directory to find resting places, obituaries, and memorials of those interred at Union Springs.
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-6 rounded-sm shadow-md border-t-4 border-teal-600">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-lg border-stone-300 focus:border-teal-500 focus:ring-teal-500 bg-stone-50"
              />
            </div>
            <Button className="h-12 px-8 bg-teal-700 hover:bg-teal-800 text-white font-serif tracking-wider text-lg rounded-sm shadow-sm">
              Search
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
          ) : filteredResults.length > 0 ? (
            <div className="grid gap-6">
               {filteredResults.map((person) => (
                 <Card key={person.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow duration-300 bg-slate-50">
                   <div className="flex flex-col md:flex-row">
                     {/* Image Section */}
                     <div className="md:w-48 h-48 md:h-auto bg-stone-200 flex-shrink-0">
                       {person.image_url ? (
                         <img src={person.image_url} alt={`${person.first_name} ${person.last_name}`} className="w-full h-full object-cover filter grayscale hover:grayscale-0 transition-all duration-500" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-stone-400">
                           <User className="w-12 h-12" />
                         </div>
                       )}
                     </div>
                     
                     {/* Content Section */}
                     <CardContent className="p-6 flex-grow flex flex-col justify-between">
                       <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-2xl font-serif font-bold text-stone-900">
                                    {person.first_name} {person.last_name}
                                </h3>
                                {person.veteran_status && (
                                    <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200 rounded-sm">Veteran</Badge>
                                )}
                            </div>
                            <p className="text-stone-500 text-sm font-medium uppercase tracking-wider mb-4">
                                {person.date_of_birth && format(new Date(person.date_of_birth), 'yyyy')} - {person.date_of_death && format(new Date(person.date_of_death), 'yyyy')}
                            </p>
                          </div>
                          <Badge variant="outline" className="border-teal-600 text-teal-700 bg-teal-50 rounded-sm px-3 py-1">
                             Section {person.plot_location?.split('-')[0] || 'Main'}
                          </Badge>
                       </div>

                       <div className="space-y-3">
                         <div className="flex items-center text-stone-600">
                           <MapPin className="w-4 h-4 mr-2 text-red-600" />
                           <span>Plot Location: {person.plot_location}</span>
                         </div>
                         <p className="text-stone-600 text-sm line-clamp-2 italic">
                            "{person.obituary}"
                         </p>
                       </div>

                       <div className="mt-4 flex justify-end">
                          <Button variant="link" className="text-teal-700 hover:text-teal-900 p-0 h-auto font-serif">
                             View Full Memorial <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                       </div>
                     </CardContent>
                   </div>
                 </Card>
               ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-sm border border-stone-200">
              <p className="text-stone-500 text-lg font-serif">No records found matching your search.</p>
              <Button variant="link" onClick={() => setSearchTerm('')} className="text-teal-600 mt-2">Clear filters</Button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}