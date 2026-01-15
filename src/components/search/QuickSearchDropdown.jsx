import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Search, Loader2, MapPin, User } from 'lucide-react';
import { normalizeSectionKey } from "@/components/plots/normalizeSectionKey";

export default function QuickSearchDropdown({ onSearchChange, initialValue = '' }) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await base44.functions.invoke('searchDeceased', {
          query: query,
          limit: 8
        });
        const data = response.data || { results: [] };
        setResults(data.results || []);
        setShowDropdown(true);
      } catch (err) {
        console.error('Quick search error:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedIndex(-1);
    if (onSearchChange) onSearchChange(val);
  };

  const handleSelectPerson = (person) => {
    setShowDropdown(false);
    
    // Extract section and plot from plot_location (e.g., "3-405" -> section=3, plot=405)
    const plotLocation = person.plot_location || '';
    const parts = plotLocation.split('-');
    const sectionRaw = parts[0] || '';
    const plotNum = plotLocation.match(/\d+/g)?.slice(-1)[0] || '';
    const sectionNorm = normalizeSectionKey(sectionRaw);

    // Navigate to Plots page with parameters for centering and blinking
    const url = `${createPageUrl('Plots')}?section=${encodeURIComponent(sectionNorm)}&plot=${encodeURIComponent(plotNum)}&from=search`;
    navigate(url, { state: { search: location.search } });
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectPerson(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 w-5 h-5" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search by name to locate on map..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          className="pl-10 h-12 text-lg border-stone-300 focus:border-teal-500 focus:ring-teal-500 bg-stone-50"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 animate-spin text-teal-600" />
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-md shadow-lg max-h-80 overflow-y-auto">
          {results.map((person, index) => (
            <button
              key={person.id}
              type="button"
              onClick={() => handleSelectPerson(person)}
              className={`w-full px-4 py-3 text-left flex items-start gap-3 hover:bg-teal-50 transition-colors border-b border-stone-100 last:border-b-0 ${
                index === selectedIndex ? 'bg-teal-50' : ''
              }`}
            >
              <User className="w-5 h-5 text-stone-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-stone-900">
                  {person.first_name} {person.last_name}
                </div>
                {person.family_name && (
                  <div className="text-sm text-stone-500">
                    Family: {person.family_name}
                  </div>
                )}
                <div className="flex items-center gap-1 text-sm text-teal-700 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Plot: {person.plot_location || 'Unknown'}</span>
                </div>
              </div>
              <span className="text-xs text-stone-400 whitespace-nowrap mt-1">
                Click to view
              </span>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showDropdown && query.length >= 2 && !isLoading && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-md shadow-lg p-4 text-center text-stone-500">
          No matches found for "{query}"
        </div>
      )}
    </div>
  );
}