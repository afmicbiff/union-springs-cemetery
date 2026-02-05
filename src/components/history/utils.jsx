// Optimized Levenshtein with early exit for performance
export const levenshtein = (a, b) => {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    // Early exit if length difference is too great
    if (Math.abs(a.length - b.length) > 3) return Math.max(a.length, b.length);
    
    // Use single array optimization (2x memory reduction)
    const aLen = a.length;
    const bLen = b.length;
    let prev = new Array(aLen + 1);
    let curr = new Array(aLen + 1);
    
    for (let j = 0; j <= aLen; j++) prev[j] = j;
    
    for (let i = 1; i <= bLen; i++) {
        curr[0] = i;
        for (let j = 1; j <= aLen; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                curr[j] = prev[j - 1];
            } else {
                curr[j] = 1 + Math.min(prev[j - 1], curr[j - 1], prev[j]);
            }
        }
        [prev, curr] = [curr, prev];
    }
    return prev[aLen];
};

export const getFootnotesContent = (text, footnotesMap) => {
    if (!text || !footnotesMap) return "";
    const noteMatches = text.match(/NOTE\s*\[?(\d+)\]?/g);
    if (!noteMatches) return "";
    return noteMatches.map(match => {
        const idMatch = match.match(/\d+/);
        if (!idMatch) return "";
        const id = parseInt(idMatch[0], 10);
        return footnotesMap[id] || "";
    }).join(" ");
};

export const parseYear = (yearStr) => {
    if (!yearStr) return 0;
    const match = yearStr.match(/(\d{4})/);
    return match ? parseInt(match[1], 10) : 0;
};

// Memoization cache for fuzzy matching
const fuzzyCache = new Map();
const MAX_CACHE_SIZE = 500;

export const isFuzzyMatch = (text, query) => {
    if (!query || !text) return false;
    
    const cacheKey = `${text.slice(0, 100)}|${query}`;
    if (fuzzyCache.has(cacheKey)) {
        return fuzzyCache.get(cacheKey);
    }
    
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase().trim();
    
    // Fast path: exact substring match
    if (lowerText.includes(lowerQuery)) {
        cacheResult(cacheKey, true);
        return true;
    }
    
    // Split query into words and check if all words match
    const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 0);
    if (queryWords.length === 0) {
        cacheResult(cacheKey, false);
        return false;
    }
    
    const result = queryWords.every(word => {
        // Check for substring first (fast path)
        if (lowerText.includes(word)) return true;
        
        // Only do fuzzy match for words >= 3 chars (avoid false positives)
        if (word.length < 3) return false;
        
        // Check for fuzzy match on words in text
        const textWords = lowerText.split(/\s+/);
        return textWords.some(textWord => {
            if (Math.abs(textWord.length - word.length) > 2) return false;
            const distance = levenshtein(textWord, word);
            return distance <= 2;
        });
    });
    
    cacheResult(cacheKey, result);
    return result;
};

function cacheResult(key, value) {
    // Prevent unbounded cache growth
    if (fuzzyCache.size >= MAX_CACHE_SIZE) {
        const firstKey = fuzzyCache.keys().next().value;
        fuzzyCache.delete(firstKey);
    }
    fuzzyCache.set(key, value);
}

// Import React for hooks
import React from 'react';

// Hook for responsive breakpoint detection (SSR-safe)
export const useIsMobile = () => {
    // SSR-safe initial state
    const [isMobile, setIsMobile] = React.useState(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth < 768;
    });
    
    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const mq = window.matchMedia('(max-width: 767px)');
        setIsMobile(mq.matches);
        
        const handler = (e) => setIsMobile(e.matches);
        
        // Modern API
        if (mq.addEventListener) {
            mq.addEventListener('change', handler);
            return () => mq.removeEventListener('change', handler);
        }
        // Legacy fallback
        mq.addListener(handler);
        return () => mq.removeListener(handler);
    }, []);
    
    return isMobile;
};