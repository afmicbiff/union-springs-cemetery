import React, { useState, useRef, useCallback, memo } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from "@/api/base44Client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Loader2, MapPin, ExternalLink, Filter, X } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Breadcrumbs from "@/components/Breadcrumbs";
import { normalizeSectionKey } from "@/components/plots/normalizeSectionKey";

// Memoized result card for performance - production-ready with error handling
const ResultCard = memo(function ResultCard({ person, locationSearch }) {
  const plotSection = React.useMemo(() => {
    if (!person?.plot_location) return 'Main';
    return person.plot_location.split('-')[0] || 'Main';
  }, [person?.plot_location]);

  // Extract only the grave number (last number in plot_location, e.g., "822" from "F-9-822")
  const plotNumber = React.useMemo(() => {
    if (!person?.plot_location) return '';
    const matches = person.plot_location.match(/\d+/g);
    return matches?.slice(-1)[0] || '';
  }, [person?.plot_location]);

  const normalizedSection = React.useMemo(() => normalizeSectionKey(plotSection), [plotSection]);
  
  const dateRange = React.useMemo(() => {
    const parseLocal = (str) => {
      if (!str) return null;
      const parts = str.split('-');
      if (parts.length === 3) return new Date(+parts[0], +parts[1] - 1, +parts[2]);
      const d = new Date(str);
      return isValid(d) ? d : null;
    };
    const bd = parseLocal(person?.date_of_birth);
    const dd = parseLocal(person?.date_of_death);
    const birthYear = bd ? format(bd, 'yyyy') : '';
    const deathYear = dd ? format(dd, 'yyyy') : '';
    return birthYear && deathYear ? `${birthYear} - ${deathYear}` : birthYear || deathYear || '';
  }, [person?.date_of_birth, person?.date_of_death]);

  // Build map URL using only the grave/plot number for searching
  const mapUrl = React.useMemo(() => {
    const params = new URLSearchParams();
    // Only pass the plot number - the map will find it regardless of section
    if (plotNumber) params.set('plot', plotNumber);
    params.set('from', 'search');
    params.set('highlight', 'true');
    return `${createPageUrl('Plots')}?${params.toString()}`;
  }, [plotNumber]);

  if (!person) return null;

  return (
    <Card className="h-full rounded-lg border border-stone-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 will-change-transform">
      <CardContent className="p-4 sm:p-5 flex flex-col h-full">
        {/* Header with name and section badge */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 leading-tight break-words">
              {person.first_name} {person.last_name}
            </h3>
            {dateRange && (
              <p className="text-stone-500 text-sm font-medium uppercase tracking-wider mt-1">
                {dateRange}
              </p>
            )}
          </div>
          <Badge variant="outline" className="self-start border-teal-600 text-teal-700 bg-teal-50 rounded-sm px-3 py-1 whitespace-nowrap text-xs sm:text-sm">
            Section {plotSection}
          </Badge>
        </div>

        {/* Details */}
        <div className="space-y-2 flex-1">
          {person.family_name && (
            <p className="text-stone-700 text-sm">Family: <span className="font-medium">{person.family_name}</span></p>
          )}
          {person.veteran_status && (
            <p className="text-red-700 text-xs font-semibold uppercase tracking-wide">Veteran</p>
          )}
          <div className="flex items-center text-stone-600 text-sm">
            <MapPin className="w-4 h-4 mr-2 text-red-600 shrink-0" aria-hidden="true" />
            <span className="break-words">Plot: {person.plot_location || 'Unknown'}</span>
          </div>
          {person.notes && (
            <p className="text-stone-600 text-sm bg-yellow-50 p-2 rounded border border-yellow-100 break-words line-clamp-2">
              Note: {person.notes}
            </p>
          )}
          {person.obituary && (
            <p className="text-stone-600 text-sm line-clamp-2 italic break-words">
              {person.obituary}
            </p>
          )}
        </div>

        {/* Action buttons - centered, mobile-first touch targets */}
        <div className="mt-4 pt-3 border-t border-stone-200 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center items-center">
          <Link 
            to={mapUrl}
            state={{ search: locationSearch }}
            className="w-full sm:w-auto"
          >
            <Button 
              variant="outline" 
              className="h-12 sm:h-11 px-6 w-full sm:w-auto bg-white text-teal-700 border-teal-600 hover:bg-teal-50 active:bg-teal-100 touch-manipulation min-w-[140px]"
            >
              <MapPin className="w-4 h-4 mr-2" aria-hidden="true" />
              View on Map
            </Button>
          </Link>
          <Link 
            to={`${createPageUrl('Memorial')}?id=${person.id}`}
            state={{ search: locationSearch }}
            className="w-full sm:w-auto"
          >
            <Button className="h-12 sm:h-11 px-6 w-full sm:w-auto bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-serif shadow-md touch-manipulation min-w-[140px]">
              Memorial &gt;
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
});

// Memoized empty state component
const EmptyState = memo(function EmptyState({ onClear }) {
  return (
    <div className="text-center py-12 bg-white rounded-sm border border-stone-200 space-y-4 px-4">
      <p className="text-stone-500 text-lg font-serif">No records found matching your search.</p>
      <Button variant="link" onClick={onClear} className="text-teal-600 h-11 touch-manipulation">
        Clear filters
      </Button>
      <div className="pt-4 border-t border-stone-100 max-w-md mx-auto mt-4">
        <p className="text-stone-600 mb-3 text-sm sm:text-base">Click on the Find A Grave button for additional searches for your loved ones.</p>
        <a href="https://www.findagrave.com/" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="border-stone-400 text-stone-600 hover:bg-stone-100 h-11 touch-manipulation">
            Find a Grave <ExternalLink className="w-4 h-4 ml-2" aria-hidden="true" />
          </Button>
        </a>
      </div>
    </div>
  );
});

// Memoized initial state component
const InitialState = memo(function InitialState() {
  return (
    <div className="text-center py-16 sm:py-24 bg-stone-50/50 rounded-sm border border-stone-200 border-dashed px-4">
      <Search className="w-10 h-10 sm:w-12 sm:h-12 text-stone-300 mx-auto mb-4" aria-hidden="true" />
      <p className="text-stone-500 text-base sm:text-lg font-serif">Enter a name or use filters to search the directory.</p>
    </div>
  );
});

// Section options - static data outside component
const SECTION_OPTIONS = [
  { value: 'all', label: 'All Sections' },
  { value: 'North', label: 'North' },
  { value: 'South', label: 'South' },
  { value: 'East', label: 'East' },
  { value: 'West', label: 'West' },
  { value: 'Garden of Peace', label: 'Garden of Peace' },
  { value: 'Old Historic', label: 'Old Historic' },
];

const VETERAN_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'true', label: 'Veteran' },
  { value: 'false', label: 'Non-Veteran' },
];




export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  React.useEffect(() => { window.scrollTo(0, 0); }, []);

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

        // If user returns via header link, hydrate last search from localStorage
        React.useEffect(() => {
            const hasAny = ['q','family','section','veteran','bMin','bMax','dMin','dMax'].some(k => searchParams.get(k));
            if (hasAny) return;
            try {
                const saved = JSON.parse(localStorage.getItem('deceased_search_params') || 'null');
                if (!saved) return;
                setSearchTerm(saved.term || '');
                setFamilyName(saved.family || '');
                setSection(saved.section || 'all');
                setVeteranStatus(saved.veteran || 'all');
                setBirthYearMin(saved.bMin || '');
                setBirthYearMax(saved.bMax || '');
                setDeathYearMin(saved.dMin || '');
                setDeathYearMax(saved.dMax || '');

                const params = {};
                if (saved.term) params.q = saved.term;
                if (saved.family) params.family = saved.family;
                if (saved.section && saved.section !== 'all') params.section = saved.section;
                if (saved.veteran && saved.veteran !== 'all') params.veteran = saved.veteran;
                if (saved.bMin) params.bMin = saved.bMin;
                if (saved.bMax) params.bMax = saved.bMax;
                if (saved.dMin) params.dMin = saved.dMin;
                if (saved.dMax) params.dMax = saved.dMax;
                setSearchParams(params, { replace: true });
            } catch {}
        }, []);
  
  
  
  



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
                  const next = {
                      term: searchTerm,
                      family: familyName,
                      section: section,
                      veteran: veteranStatus,
                      bMin: birthYearMin,
                      bMax: birthYearMax,
                      dMin: deathYearMin,
                      dMax: deathYearMax
                  };
                  setDebouncedParams(next);

                  // Persist last search so navigation via header keeps the query
                  try { localStorage.setItem('deceased_search_params', JSON.stringify(next)); } catch {}

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

  // Deduplicate results by full name (first + last), case-insensitive
  const dedupedResults = React.useMemo(() => {
    const seen = new Set();
    const out = [];
    if (!data?.pages) return out;
    for (const page of data.pages) {
      for (const person of (page.results || [])) {
        const key = `${(person.first_name || '').trim().toLowerCase()}|${(person.last_name || '').trim().toLowerCase()}`;
        if (!key.trim()) continue;
        if (!seen.has(key)) {
          seen.add(key);
          out.push(person);
        }
      }
    }
    return out;
  }, [data]);

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
    <div className="min-h-screen bg-stone-200 py-6 sm:py-12 px-3 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        <Breadcrumbs items={[{ label: 'Deceased Search' }]} />
        
        {/* Header - responsive typography */}
        <div className="text-center space-y-3 sm:space-y-4 px-2">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-stone-900">Deceased Search</h1>
          <p className="text-stone-600 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
            Search our directory to find resting places, obituaries, and memorials of those interred at Union Springs.
          </p>
        </div>

        {/* Search Bar & Filters - mobile optimized */}
        <div className="bg-white p-4 sm:p-6 rounded-sm shadow-xl space-y-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 w-5 h-5" aria-hidden="true" />
              <Input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-base sm:text-lg border-stone-300 focus:border-teal-500 focus:ring-teal-500 bg-stone-50"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
            </div>

            <Button 
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="h-12 px-4 border-stone-300 text-stone-700 hover:bg-stone-50 active:bg-stone-100 font-serif touch-manipulation w-full sm:w-auto"
              aria-expanded={showFilters}
            >
              <Filter className="w-4 h-4 mr-2" aria-hidden="true" /> 
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>

          {/* Advanced Filters - mobile optimized layout */}
          {showFilters && (
            <div className="pt-4 border-t border-stone-100" style={{ contain: 'layout style' }}>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Advanced Options</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClearFilters}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-10 touch-manipulation self-start sm:self-auto"
                >
                  <X className="w-3 h-3 mr-1" aria-hidden="true" /> Clear all filters
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Plot Section */}
                <div className="space-y-2">
                  <Label className="text-stone-600 text-sm">Plot Section</Label>
                  <Select value={section} onValueChange={setSection}>
                    <SelectTrigger aria-label="Select Plot Section" className="bg-stone-50 border-stone-300 h-11">
                      <SelectValue placeholder="Select Section" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTION_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Family Name */}
                <div className="space-y-2">
                  <Label className="text-stone-600 text-sm">Family Name</Label>
                  <Input 
                    placeholder="e.g. Smith" 
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    className="bg-stone-50 border-stone-300 h-11"
                  />
                </div>
                
                {/* Veteran Status */}
                <div className="space-y-2">
                  <Label className="text-stone-600 text-sm">Veteran Status</Label>
                  <Select value={veteranStatus} onValueChange={setVeteranStatus}>
                    <SelectTrigger aria-label="Select Veteran Status" className="bg-stone-50 border-stone-300 h-11">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      {VETERAN_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Birth Year Range - stacked on mobile */}
                <div className="space-y-2">
                  <Label className="text-stone-600 text-sm">Birth Year Range</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      placeholder="From" 
                      value={birthYearMin}
                      onChange={(e) => setBirthYearMin(e.target.value)}
                      className="bg-stone-50 border-stone-300 h-11 flex-1"
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                    <span className="text-stone-400 font-medium px-1">-</span>
                    <Input 
                      placeholder="To" 
                      value={birthYearMax}
                      onChange={(e) => setBirthYearMax(e.target.value)}
                      className="bg-stone-50 border-stone-300 h-11 flex-1"
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                  </div>
                </div>
                
                {/* Death Year Range - stacked on mobile */}
                <div className="space-y-2 sm:col-span-2 md:col-span-1">
                  <Label className="text-stone-600 text-sm">Passing Year Range</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      placeholder="From" 
                      value={deathYearMin}
                      onChange={(e) => setDeathYearMin(e.target.value)}
                      className="bg-stone-50 border-stone-300 h-11 flex-1"
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                    <span className="text-stone-400 font-medium px-1">-</span>
                    <Input 
                      placeholder="To" 
                      value={deathYearMax}
                      onChange={(e) => setDeathYearMax(e.target.value)}
                      className="bg-stone-50 border-stone-300 h-11 flex-1"
                      inputMode="numeric"
                      pattern="[0-9]*"
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
            <InitialState />
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-sm text-stone-500 px-2">
                <span className="font-medium">Found {dedupedResults.length} results</span>
                {error && <span className="text-red-500">Error loading data. Please try again.</span>}
              </div>

              {isLoading && !data ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-600" aria-hidden="true" />
                  <span className="text-stone-500 text-sm">Searching records...</span>
                </div>
              ) : dedupedResults.length > 0 ? (
                <div 
                  className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                  style={{ contain: 'layout style' }}
                >
                  {dedupedResults.map((person, index) => {
                    const isLastElement = index === dedupedResults.length - 1;
                    return (
                      <div 
                        key={person.id} 
                        ref={isLastElement ? lastElementRef : null} 
                        className="h-full"
                      >
                        <ResultCard person={person} locationSearch={location.search} />
                      </div>
                    );
                  })}
                  {isFetchingNextPage && (
                    <div className="col-span-full flex justify-center py-6">
                      <Loader2 className="w-6 h-6 animate-spin text-teal-600" aria-hidden="true" />
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState onClear={() => setSearchTerm('')} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}