import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Loader2, Calendar, MapPin, User, ChevronRight, ExternalLink } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Filter, X } from 'lucide-react';
import Breadcrumbs from "@/components/Breadcrumbs";



export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  // Filters
  const [familyName, setFamilyName] = useState('');
  const [section, setSection] = useState('all');
  const [veteranStatus, setVeteranStatus] = useState('all');
  const [birthYearMin, setBirthYearMin] = useState('');
  const [birthYearMax, setBirthYearMax] = useState('');
  const [deathYearMin, setDeathYearMin] = useState('');
  const [deathYearMax, setDeathYearMax] = useState('');

  // Debounce state
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedParams, setDebouncedParams] = useState({
      term: '',
      family: '',
      section: 'all',
      veteran: 'all',
      bMin: '',
      bMax: '',
      dMin: '',
      dMax: ''
  });

  // Effect to debounce inputs
  React.useEffect(() => {
      const timer = setTimeout(() => {
          setDebouncedParams({
              term: searchTerm,
              family: familyName,
              section: section,
              veteran: veteranStatus,
              bMin: birthYearMin,
              bMax: birthYearMax,
              dMin: deathYearMin,
              dMax: deathYearMax
          });
          setCurrentPage(1);
      }, 500);

      return () => clearTimeout(timer);
  }, [searchTerm, familyName, section, veteranStatus, birthYearMin, birthYearMax, deathYearMin, deathYearMax]);

  const { data: queryData, isLoading, error } = useQuery({
    queryKey: ['searchDeceased', debouncedParams, currentPage],
    queryFn: async () => {
        try {
            const response = await base44.functions.invoke('searchDeceased', {
                query: debouncedParams.term,
                family_name: debouncedParams.family,
                section: debouncedParams.section,
                veteran_status: debouncedParams.veteran,
                birth_year_min: debouncedParams.bMin,
                birth_year_max: debouncedParams.bMax,
                death_year_min: debouncedParams.dMin,
                death_year_max: debouncedParams.dMax,
                page: currentPage,
                limit: 12
            });
            return response.data || { results: [], pagination: { total: 0, totalPages: 0 } };
        } catch (err) {
            console.error("Failed to search deceased records:", err);
            return { results: [], pagination: { total: 0, totalPages: 0 } };
        }
    },
    initialData: { results: [], pagination: { total: 0, totalPages: 0 } },
  });

  const filteredResults = queryData.results || [];
  const pagination = queryData.pagination || { total: 0, totalPages: 0, page: 1 };

  const hasActiveSearch = searchTerm || familyName || section !== 'all' || veteranStatus !== 'all' || birthYearMin || birthYearMax || deathYearMin || deathYearMax;

  let suggestion = null;
  // suggestion logic removed or needs update (client side suggestion requires full list or backend support)
  // For now we keep it simple as requested - server side filtering.

  // "Did you mean?" logic removed due to missing full list client-side

  return (
    <div className="min-h-screen bg-stone-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Breadcrumbs items={[{ label: 'Deceased Search' }]} />
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <h1 className="text-4xl md:text-5xl font-serif text-stone-900">Deceased Search</h1>
            <a href="https://www.findagrave.com/" target="_blank" rel="noreferrer">
              <Button variant="outline" className="border-stone-400 text-stone-600 hover:bg-stone-100 hover:text-stone-900" size="sm">
                 Find a Grave <ExternalLink className="w-3 h-3 ml-2" />
              </Button>
            </a>
          </div>
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
                <Label className="text-stone-600">Family Name</Label>
                <Input 
                  placeholder="e.g. Smith" 
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="bg-stone-50 border-stone-300"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-stone-600">Veteran Status</Label>
                <Select value={veteranStatus} onValueChange={setVeteranStatus}>
                  <SelectTrigger className="bg-stone-50 border-stone-300">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Veteran</SelectItem>
                    <SelectItem value="false">Non-Veteran</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Ranges */}
              <div className="space-y-2 col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label className="text-stone-600">Birth Year Range</Label>
                      <div className="flex gap-2">
                          <Input 
                              placeholder="From" 
                              value={birthYearMin}
                              onChange={(e) => setBirthYearMin(e.target.value)}
                              className="bg-stone-50 border-stone-300"
                          />
                          <Input 
                              placeholder="To" 
                              value={birthYearMax}
                              onChange={(e) => setBirthYearMax(e.target.value)}
                              className="bg-stone-50 border-stone-300"
                          />
                      </div>
                  </div>
                  <div className="space-y-2">
                      <Label className="text-stone-600">Passing Year Range</Label>
                      <div className="flex gap-2">
                          <Input 
                              placeholder="From" 
                              value={deathYearMin}
                              onChange={(e) => setDeathYearMin(e.target.value)}
                              className="bg-stone-50 border-stone-300"
                          />
                          <Input 
                              placeholder="To" 
                              value={deathYearMax}
                              onChange={(e) => setDeathYearMax(e.target.value)}
                              className="bg-stone-50 border-stone-300"
                          />
                      </div>
                  </div>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="space-y-4">
          {!hasActiveSearch ? (
             <div className="text-center py-24 bg-stone-50/50 rounded-sm border border-stone-200 border-dashed">
                 <Search className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                 <p className="text-stone-500 text-lg font-serif">Enter a name or use filters to search the directory.</p>
             </div>
          ) : (
            <>
              <div className="flex justify-between items-center text-sm text-stone-500 px-2">
                <span>Found {pagination.total} results</span>
                {error && <span className="text-red-500">Error loading data</span>}
              </div>

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
                                    {person.family_name && (
                                        <Badge variant="outline" className="ml-2 text-stone-500 border-stone-300">
                                            {person.family_name} Family
                                        </Badge>
                                    )}
                                    {person.veteran_status && (
                                        <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200 rounded-sm">Veteran</Badge>
                                    )}
                                </div>
                                <p className="text-stone-500 text-sm font-medium uppercase tracking-wider mb-4">
                                    {person.date_of_birth && isValid(new Date(person.date_of_birth)) ? format(new Date(person.date_of_birth), 'yyyy') : ''}
                                    {(person.date_of_birth && isValid(new Date(person.date_of_birth)) && person.date_of_death && isValid(new Date(person.date_of_death))) ? ' - ' : ''}
                                    {person.date_of_death && isValid(new Date(person.date_of_death)) ? format(new Date(person.date_of_death), 'yyyy') : ''}
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
                             {person.notes && (
                               <p className="text-stone-600 text-sm bg-yellow-50 p-2 rounded border border-yellow-100">
                                  Note: {person.notes}
                               </p>
                             )}
                             <p className="text-stone-600 text-sm line-clamp-2 italic">
                                "{person.obituary}"
                             </p>
                           </div>

                           <div className="mt-4 flex justify-end">
                              <Link to={`${createPageUrl('Memorial')}?id=${person.id}`}>
                                  <Button variant="link" className="text-teal-700 hover:text-teal-900 p-0 h-auto font-serif">
                                     View Full Memorial <ChevronRight className="w-4 h-4 ml-1" />
                                  </Button>
                              </Link>
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

              {/* Pagination Controls */}
              {pagination.total > 0 && (
                <div className="flex justify-center items-center gap-4 pt-4 border-t border-stone-200">
                   <Button 
                       variant="outline" 
                       onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                       disabled={currentPage === 1 || isLoading}
                       className="w-24"
                   >
                       Previous
                   </Button>
                   <span className="text-stone-600 font-medium">
                       Page {currentPage} of {pagination.totalPages || 1}
                   </span>
                   <Button 
                       variant="outline" 
                       onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                       disabled={currentPage >= pagination.totalPages || isLoading}
                       className="w-24"
                   >
                       Next
                   </Button>
                </div>
              )}
            </>
          )}
        </div>

            </div>
            </div>
            );
            }