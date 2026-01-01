import React, { useState, useRef, useCallback } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from "@/api/base44Client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Loader2, Calendar, MapPin, ChevronRight, ExternalLink, MessageSquare } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


import { Label } from "@/components/ui/label";
import { Filter, X } from 'lucide-react';
import Breadcrumbs from "@/components/Breadcrumbs";




export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [familyName, setFamilyName] = useState(searchParams.get('family') || '');
  const [section, setSection] = useState(searchParams.get('section') || 'all');
  const [veteranStatus, setVeteranStatus] = useState(searchParams.get('veteran') || 'all');
  const [birthYearMin, setBirthYearMin] = useState(searchParams.get('bMin') || '');
  const [birthYearMax, setBirthYearMax] = useState(searchParams.get('bMax') || '');
  const [deathYearMin, setDeathYearMin] = useState(searchParams.get('dMin') || '');
  const [deathYearMax, setDeathYearMax] = useState(searchParams.get('dMax') || '');

  const hasAdvancedFilters = searchParams.get('family') || 
                             (searchParams.get('section') && searchParams.get('section') !== 'all') || 
                             (searchParams.get('veteran') && searchParams.get('veteran') !== 'all') ||
                             searchParams.get('bMin') || searchParams.get('bMax') ||
                             searchParams.get('dMin') || searchParams.get('dMax');

  const [showFilters, setShowFilters] = useState(!!hasAdvancedFilters);
  
  
  
  



  // Debounce state
  const [debouncedParams, setDebouncedParams] = useState({
      term: searchParams.get('q') || '',
      family: searchParams.get('family') || '',
      section: searchParams.get('section') || 'all',
      veteran: searchParams.get('veteran') || 'all',
      bMin: searchParams.get('bMin') || '',
      bMax: searchParams.get('bMax') || '',
      dMin: searchParams.get('dMin') || '',
      dMax: searchParams.get('dMax') || ''
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
          
          // Update URL
          const params = {};
          if (searchTerm) params.q = searchTerm;
          if (familyName) params.family = familyName;
          if (section && section !== 'all') params.section = section;
          if (veteranStatus && veteranStatus !== 'all') params.veteran = veteranStatus;
          if (birthYearMin) params.bMin = birthYearMin;
          if (birthYearMax) params.bMax = birthYearMax;
          if (deathYearMin) params.dMin = deathYearMin;
          if (deathYearMax) params.dMax = deathYearMax;
          
          setSearchParams(params, { replace: true });
      }, 500);

      return () => clearTimeout(timer);
  }, [searchTerm, familyName, section, veteranStatus, birthYearMin, birthYearMax, deathYearMin, deathYearMax]);



  const {
      data,
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
      isLoading,
      error
   } = useInfiniteQuery({
       queryKey: ['searchDeceased', debouncedParams],
       enabled: Boolean(
         debouncedParams.term || debouncedParams.family ||
         debouncedParams.section !== 'all' || debouncedParams.veteran !== 'all' ||
         debouncedParams.bMin || debouncedParams.bMax || debouncedParams.dMin || debouncedParams.dMax
       ),
       queryFn: async ({ pageParam = 1 }) => {
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
                   page: pageParam,
                   limit: 24
               });
               const d = response.data || { results: [], pagination: { total: 0, totalPages: 0, page: pageParam } };
               return {
                 ...d,
                 results: (d.results || []).map(p => ({
                   id: p.id,
                   first_name: p.first_name,
                   last_name: p.last_name,
                   family_name: p.family_name,
                   date_of_birth: p.date_of_birth,
                   date_of_death: p.date_of_death,
                   plot_location: p.plot_location,
                   notes: p.notes,
                   obituary: p.obituary,
                   veteran_status: p.veteran_status,
                 })),
               };
           } catch (err) {
               console.error("Failed to search deceased records:", err);
               return { results: [], pagination: { total: 0, totalPages: 0, page: pageParam } };
           }
       },
       getNextPageParam: (lastPage, allPages) => {
           const current = lastPage.pagination.page || allPages.length;
           const total = lastPage.pagination.totalPages;
           return current < total ? current + 1 : undefined;
       },
       initialPageParam: 1,
       staleTime: 5 * 60_000,
       gcTime: 15 * 60_000,
       refetchOnWindowFocus: false,
       refetchOnReconnect: false,
   });

  const observer = useRef();
  const lastElementRef = useCallback(node => {
      if (isLoading || isFetchingNextPage) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(entries => {
          if (entries[0].isIntersecting && hasNextPage) {
              fetchNextPage();
          }
      });
      if (node) observer.current.observe(node);
  }, [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]);

  const totalResults = data?.pages?.[0]?.pagination?.total || 0;

  const handleClearFilters = () => {
      setSection('all');
      setFamilyName('');
      setVeteranStatus('all');
      setBirthYearMin('');
      setBirthYearMax('');
      setDeathYearMin('');
      setDeathYearMax('');
      // Search term is usually separate, but let's clear it too if requested, though user said "advanced filters"
      // Usually "Clear All Filters" keeps the main search term, but often it clears everything. 
      // I'll clear advanced filters only as they are in that section.
  };

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
          </div>
          <p className="text-stone-600 max-w-2xl mx-auto text-lg">
            Search our directory to find resting places, obituaries, and memorials of those interred at Union Springs.
          </p>
        </div>

        {/* Search Bar & Filters */}
        <div className="bg-white p-6 rounded-sm shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by name, use natural language or terms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-lg border-stone-300 focus:border-teal-500 focus:ring-teal-500 bg-stone-50"
              />
            </div>

            <div className="flex gap-2">


              <Button 
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-12 px-4 border-stone-300 text-stone-700 hover:bg-stone-50 font-serif"
              >
                  <Filter className="w-4 h-4 mr-2" /> Filters
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="pt-4 border-t border-stone-100 animate-in slide-in-from-top-2">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Advanced Options</h3>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleClearFilters}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                    >
                        <X className="w-3 h-3 mr-1" /> Clear all filters
                    </Button>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
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
              <div className="col-span-1 md:col-span-2 pt-2">
                  <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1 flex items-center gap-3">
                          <Label className="text-stone-600 whitespace-nowrap min-w-[80px]">Birth Year:</Label>
                          <Input 
                              placeholder="From" 
                              value={birthYearMin}
                              onChange={(e) => setBirthYearMin(e.target.value)}
                              className="bg-stone-50 border-stone-300"
                          />
                          <span className="text-stone-400 font-medium">-</span>
                          <Input 
                              placeholder="To" 
                              value={birthYearMax}
                              onChange={(e) => setBirthYearMax(e.target.value)}
                              className="bg-stone-50 border-stone-300"
                          />
                      </div>
                      <div className="flex-1 flex items-center gap-3">
                          <Label className="text-stone-600 whitespace-nowrap min-w-[90px]">Passing Year:</Label>
                          <Input 
                              placeholder="From" 
                              value={deathYearMin}
                              onChange={(e) => setDeathYearMin(e.target.value)}
                              className="bg-stone-50 border-stone-300"
                          />
                          <span className="text-stone-400 font-medium">-</span>
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
                <span>Found {totalResults} results</span>
                {error && <span className="text-red-500">Error loading data</span>}
              </div>

              {isLoading && !data ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                </div>
              ) : (totalResults > 0) ? (
                <div className="grid gap-6">
                   {data?.pages?.map((page, pageIndex) => (
                       <React.Fragment key={pageIndex}>
                           {page.results.map((person, index) => {
                               const isLastElement = pageIndex === data.pages.length - 1 && index === page.results.length - 1;
                               return (
                                 <div key={person.id} ref={isLastElement ? lastElementRef : null}>
                                   <Card className="overflow-hidden border-none shadow-lg hover:shadow-2xl transition-shadow duration-300 bg-slate-50">
                                     <div className="flex flex-col md:flex-row">


                                       {/* Content Section */}
                                       <CardContent className="p-6 flex-grow flex flex-col justify-between">
                                         <div className="flex justify-between items-start">
                                            <div>
                                              <div className="flex items-center gap-2 mb-1">
                                                  <h3 className="text-2xl font-serif font-bold text-stone-900">
                                                      {person.first_name} {person.last_name}
                                                  </h3>
                                                  {person.family_name && (
                                                                                                              <Badge variant="outline" className="hidden md:inline-flex ml-2 text-stone-500 border-stone-300">
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
                                            <Badge variant="outline" className="hidden md:inline-flex border-teal-600 text-teal-700 bg-teal-50 rounded-sm px-4 py-1 whitespace-nowrap">
                                                                                                 Section {person.plot_location?.split('-')[0] || 'Main'}
                                                                                              </Badge>
                                         </div>

                                         {/* Mobile-centered section and family badges */}
                                         <div className="md:hidden flex flex-col items-center gap-2 mt-2">
                                           <Badge variant="outline" className="border-teal-600 text-teal-700 bg-teal-50 rounded-sm px-4 py-1 whitespace-nowrap">
                                             Section {person.plot_location?.split('-')[0] || 'Main'}
                                           </Badge>
                                           {person.family_name && (
                                             <Badge variant="outline" className="text-stone-600 border-stone-300">
                                               {person.family_name} Family
                                             </Badge>
                                           )}
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
                                           {person.obituary && (
                                             <p className="text-stone-600 text-sm line-clamp-2 italic">
                                                {person.obituary}
                                             </p>
                                           )}
                                         </div>

                                         <div className="mt-2 flex justify-end">
                                            <Link 
                                              to={`${createPageUrl('Plots')}?section=${encodeURIComponent(person.plot_location?.split('-')[0] || '')}&plot=${encodeURIComponent((person.plot_location || '').match(/\d+/g)?.slice(-1)[0] || '')}&from=search`}
                                              state={{ search: location.search }}
                                            >
                                              <Button variant="outline" className="bg-white text-teal-700 border-teal-600 hover:bg-teal-50">
                                                View on Map
                                              </Button>
                                            </Link>
                                         </div>
                                         <div className="mt-4 flex justify-end">
                                            <Link 
                                              to={`${createPageUrl('Memorial')}?id=${person.id}`}
                                              state={{ search: location.search }}
                                            >
                                                <Button className="bg-teal-700 hover:bg-teal-800 text-white font-serif shadow-md">
                                                   View Full Memorial <ChevronRight className="w-4 h-4 ml-1" />
                                                </Button>
                                            </Link>
                                         </div>
                                       </CardContent>
                                     </div>
                                   </Card>
                                 </div>
                               );
                           })}
                       </React.Fragment>
                   ))}
                   {isFetchingNextPage ? (
                       <div className="flex justify-center py-6">
                           <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                       </div>
                   ) : null}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-sm border border-stone-200 space-y-4">
                 <p className="text-stone-500 text-lg font-serif">No records found matching your search.</p>
                 <Button variant="link" onClick={() => setSearchTerm('')} className="text-teal-600">Clear filters</Button>
                 
                 <div className="pt-4 border-t border-stone-100 max-w-md mx-auto mt-4">
                    <p className="text-stone-600 mb-3">Click on the Find A Grave button for additional searches for your loved ones.</p>
                    <a href="https://www.findagrave.com/" target="_blank" rel="noreferrer">
                        <Button variant="outline" className="border-stone-400 text-stone-600 hover:bg-stone-100 hover:text-stone-900">
                           Find a Grave <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                    </a>
                 </div>
                </div>
              )}
            </>
          )}
        </div>

            </div>
            </div>
            );
            }