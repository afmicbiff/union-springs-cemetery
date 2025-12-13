import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Loader2, Calendar, MapPin, User, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Filter, X } from 'lucide-react';
import Breadcrumbs from "@/components/Breadcrumbs";

// Simple Levenshtein distance for "Did you mean?"
const getLevenshteinDistance = (a, b) => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
  for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }
  return matrix[b.length][a.length];
};

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [deathYear, setDeathYear] = useState('');
  const [section, setSection] = useState('all');
  
  const { data: deceasedList, isLoading } = useQuery({
    queryKey: ['deceased'],
    queryFn: () => base44.entities.Deceased.list({
        limit: 100
    }),
    initialData: [],
  });

  let suggestion = null;

  // Client-side filtering
  const filteredResults = deceasedList.filter(person => {
    const term = searchTerm.toLowerCase();
    const fullName = `${person.first_name} ${person.last_name}`.toLowerCase();
    const matchesName = !term || fullName.includes(term) || person.last_name.toLowerCase().includes(term);
    
    const matchesYear = !deathYear || (person.date_of_death && person.date_of_death.includes(deathYear));
    
    const matchesSection = section === 'all' || (person.plot_location && person.plot_location.startsWith(section));

    return matchesName && matchesYear && matchesSection;
  });

  // "Did you mean?" logic
  if (filteredResults.length === 0 && searchTerm.length > 2) {
    let closestMatch = null;
    let minDistance = Infinity;
    
    deceasedList.forEach(person => {
      const fullName = `${person.first_name} ${person.last_name}`;
      const dist = getLevenshteinDistance(searchTerm.toLowerCase(), fullName.toLowerCase());
      if (dist < minDistance && dist < 4) { // Threshold of 4
        minDistance = dist;
        closestMatch = fullName;
      }
    });

    if (closestMatch) {
      suggestion = closestMatch;
    }
  }

  return (
    <div className="min-h-screen bg-stone-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Breadcrumbs items={[{ label: 'Deceased Search' }]} />
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-serif text-stone-900">Deceased Search</h1>
          <p className="text-stone-600 max-w-2xl mx-auto text-lg">
            Search our directory to find resting places, obituaries, and memorials of those interred at Union Springs.
          </p>
        </div>

        {/* Search Bar & Filters */}
        <div className="bg-white p-6 rounded-sm shadow-md space-y-4">
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
            <Button 
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="h-12 px-4 border-stone-300 text-stone-700 hover:bg-stone-50 font-serif"
            >
              <Filter className="w-4 h-4 mr-2" /> Filters
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-stone-100 animate-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label className="text-stone-600">Plot Section</Label>
                <Select value={section} onValueChange={setSection}>
                  <SelectTrigger className="bg-stone-50 border-stone-300">
                    <SelectValue placeholder="Select Section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    <SelectItem value="North">North</SelectItem>
                    <SelectItem value="South">South</SelectItem>
                    <SelectItem value="East">East</SelectItem>
                    <SelectItem value="West">West</SelectItem>
                    <SelectItem value="Garden of Peace">Garden of Peace</SelectItem>
                    <SelectItem value="Old Historic">Old Historic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-stone-600">Year of Passing</Label>
                <Input 
                  placeholder="e.g. 1995" 
                  value={deathYear}
                  onChange={(e) => setDeathYear(e.target.value)}
                  className="bg-stone-50 border-stone-300"
                />
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="space-y-4">
          {suggestion && (
            <div className="bg-teal-50 border border-teal-200 text-teal-800 px-4 py-3 rounded-sm flex items-center gap-2">
              <span className="text-stone-600">Did you mean:</span>
              <button 
                onClick={() => setSearchTerm(suggestion)}
                className="font-bold underline hover:text-teal-900"
              >
                {suggestion}
              </button>?
            </div>
          )}

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