import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { X, ChevronRight, Info, BookOpen, CloudLightning, CloudSnow, Sun, Cloud, Maximize2, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { isFuzzyMatch, useIsMobile } from './utils';

// Lazy load heavy modal component
const DraggableImageModal = lazy(() => import('./DraggableImageModal'));

// Memoized text highlighter
const HighlightedText = React.memo(function HighlightedText({ text, highlight }) {
    if (!highlight || !text) return <>{text}</>;
    
    try {
        const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const parts = text.split(new RegExp(`(${escapedHighlight})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) => 
                    part.toLowerCase() === highlight.toLowerCase() ? (
                        <mark key={i} className="bg-yellow-200 text-stone-900 rounded-sm px-0.5">{part}</mark>
                    ) : (
                        <React.Fragment key={i}>{part}</React.Fragment>
                    )
                )}
            </span>
        );
    } catch {
        return <>{text}</>;
    }
});

// Memoized footnote button
const FootnoteButton = React.memo(function FootnoteButton({ noteId, noteContent }) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <button 
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center justify-center mx-1 h-5 w-5 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold hover:bg-teal-200 transition-colors align-top mt-1 cursor-pointer ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={`View footnote ${noteId}`}
                >
                    {noteId}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-white p-4 shadow-lg border-stone-200">
                <div className="flex flex-col gap-2">
                    <h4 className="text-sm font-serif font-bold text-teal-800 border-b border-teal-100 pb-1">
                        Footnote {noteId}
                    </h4>
                    <p className="text-stone-600 leading-relaxed text-xs">
                        {noteContent}
                    </p>
                </div>
            </PopoverContent>
        </Popover>
    );
});

// Memoized text with footnotes parser
const TextWithFootnotes = React.memo(function TextWithFootnotes({ text, highlight, footnotes }) {
    const parts = useMemo(() => text.split(/(NOTE\s*\[?\d+\]?)/g), [text]);
    
    return (
        <span className="leading-relaxed text-stone-700">
            {parts.map((part, index) => {
                const noteMatch = part.match(/NOTE\s*\[?(\d+)\]?/);
                if (noteMatch) {
                    const noteId = parseInt(noteMatch[1], 10);
                    const noteContent = footnotes[noteId];
                    return <FootnoteButton key={index} noteId={noteId} noteContent={noteContent} />;
                }
                return <HighlightedText key={index} text={part} highlight={highlight} />;
            })}
        </span>
    );
});

// Weather icon mapping - memoized
const WEATHER_ICONS = {
    'cloud-lightning': CloudLightning,
    'snowflake': CloudSnow,
    'sun': Sun,
    'default': Cloud
};

const getWeatherIcon = (iconName) => WEATHER_ICONS[iconName] || WEATHER_ICONS.default;

// Reduced motion spring config for better mobile performance
const SPRING_CONFIG = { type: "spring", stiffness: 200, damping: 25 };
const SPRING_CONFIG_REDUCED = { type: "tween", duration: 0.2 };

const HistoryItem = React.memo(function HistoryItem({ item, isSelected, isMatch, searchQuery, onToggle, footnotes, id }) {
    const [showImageModal, setShowImageModal] = useState(false);
    const [activeMedia, setActiveMedia] = useState(null);
    const isMobile = useIsMobile();
    
    // Check for reduced motion preference
    const prefersReducedMotion = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    }, []);

    const hasFootnotes = useMemo(() => /NOTE\s*\[?\d+\]?/.test(item.text), [item.text]);
    
    const footnoteIds = useMemo(() => {
        const matches = item.text.match(/NOTE\s*\[?\d+\]?/g);
        if (!matches) return [];
        return [...new Set(matches.map(m => parseInt(m.match(/\d+/)[0], 10)))].sort((a, b) => a - b);
    }, [item.text]);

    const handleImageClick = useCallback((e, media) => {
        e.stopPropagation();
        setActiveMedia(media);
        setShowImageModal(true);
    }, []);

    const handleToggle = useCallback(() => {
        onToggle(item.id);
    }, [onToggle, item.id]);

    const handleClose = useCallback((e) => {
        e.stopPropagation();
        onToggle(null);
    }, [onToggle]);

    const handleCloseModal = useCallback(() => {
        setShowImageModal(false);
    }, []);

    const WeatherIcon = item.weather ? getWeatherIcon(item.weather.icon) : null;

    // Simplified animation for mobile
    const animationConfig = prefersReducedMotion ? SPRING_CONFIG_REDUCED : SPRING_CONFIG;
    
    const cardWidth = isSelected 
        ? (isMobile ? "100%" : "40rem") 
        : (isMobile ? "100%" : "16rem");

    return (
        <>
            <motion.div
                id={id}
                layout={!prefersReducedMotion}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ 
                    opacity: 1, 
                    scale: 1,
                    flexBasis: cardWidth,
                    minWidth: cardWidth
                }}
                transition={animationConfig}
                className={cn(
                    "relative w-full md:w-auto flex flex-col cursor-pointer group",
                    "rounded-xl border shadow-md",
                    !prefersReducedMotion && "transition-shadow duration-200 hover:shadow-xl md:hover:-translate-y-1",
                    isSelected 
                        ? "bg-white border-teal-500 z-20 h-[70vh] md:h-[60vh] overflow-hidden" 
                        : "bg-white/80 border-stone-200 h-64 hover:bg-white",
                    isMatch && !isSelected && "ring-2 ring-yellow-400 ring-offset-2"
                )}
                onClick={handleToggle}
            >
                {/* Connector Line Point - Hidden on mobile collapsed state for cleaner look */}
                {!isSelected && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex-col items-center gap-1 hidden md:flex">
                        <Badge variant="outline" className="bg-stone-100 border-stone-300 text-stone-600 font-serif flex items-center gap-1">
                            {item.year}
                            {item.weather && WeatherIcon && <WeatherIcon className="w-3 h-3 text-stone-400" aria-hidden="true" />}
                        </Badge>
                        <div className="w-0.5 h-6 bg-stone-300" aria-hidden="true" />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className={cn(
                                    "w-4 h-4 rounded-full border-4 shadow-sm transition-colors cursor-help",
                                    isMatch ? "bg-yellow-400 border-yellow-200" : "bg-stone-100 border-stone-400 group-hover:border-teal-500"
                                )} aria-label={`${item.title} - ${item.year}`} />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="font-serif font-bold">{item.title}</p>
                                <p className="text-xs text-stone-500">{item.year}</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                )}

                {/* Card Content */}
                <div className="flex flex-col h-full p-4 md:p-6">
                    {/* Card Header */}
                    <div className="flex justify-between items-start mb-3 md:mb-4">
                        <div className="flex-1 min-w-0">
                            <span className={cn("text-xs font-bold uppercase tracking-wider mb-1 block", isSelected ? "text-teal-600" : "text-stone-500")}>
                                {item.year}
                            </span>
                            <h3 className={cn(
                                "font-serif font-bold text-stone-900 leading-tight whitespace-normal", 
                                isSelected ? "text-xl md:text-2xl" : "text-base md:text-lg line-clamp-2"
                            )}>
                                <HighlightedText text={item.title} highlight={searchQuery} />
                            </h3>
                            {hasFootnotes && !isSelected && (
                                <div className="flex items-center gap-1 mt-1 text-teal-600 text-xs">
                                    <BookOpen className="w-3 h-3" aria-hidden="true" />
                                    <span className="font-medium">Has Footnotes</span>
                                </div>
                            )}
                        </div>
                        {isSelected ? (
                            <button 
                                onClick={handleClose}
                                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 flex-shrink-0 touch-manipulation"
                                aria-label="Close details"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        ) : (
                            <div className="p-2 bg-stone-50 rounded-full text-stone-400 group-hover:text-teal-600 group-hover:bg-teal-50 transition-colors flex-shrink-0" aria-hidden="true">
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        )}
                    </div>

                    {/* Card Body */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1 md:pr-2 custom-scrollbar">
                        {/* Thumbnail Image */}
                        {item.media && item.media.length > 0 && (
                            <div className={cn("mb-2 relative z-10", isSelected ? "float-right ml-3 md:ml-4" : "float-right ml-2")}>
                                <button 
                                    className={cn(
                                        "bg-stone-200 rounded-md overflow-hidden border-2 border-stone-300 shadow-sm cursor-pointer hover:border-teal-500 hover:shadow-md transition-all relative group/img",
                                        isSelected ? "w-[40mm] h-[40mm] md:w-[50mm] md:h-[50mm]" : "w-16 h-16 md:w-20 md:h-20"
                                    )}
                                    onClick={(e) => handleImageClick(e, item.media[0])}
                                    aria-label={`View image: ${item.media[0].caption || "Historical image"}`}
                                >
                                    <img 
                                        src={item.media[0].url} 
                                        alt={item.media[0].caption || "Historical image"} 
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                                        <Maximize2 className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-md" aria-hidden="true" />
                                    </div>
                                </button>
                                {isSelected && (
                                    <div className="text-[9px] md:text-[10px] text-stone-400 text-center mt-1 font-mono">Click to expand</div>
                                )}
                            </div>
                        )}
                        
                        {/* Weather info - only when expanded */}
                        {isSelected && item.weather && WeatherIcon && (
                            <div className="mb-3 md:mb-4 p-2 md:p-3 bg-stone-50 rounded-lg border border-stone-100 flex items-start gap-2 md:gap-3">
                                <div className="p-1.5 md:p-2 bg-white rounded-full shadow-sm flex-shrink-0">
                                    <WeatherIcon className="w-4 h-4 md:w-5 md:h-5 text-stone-600" aria-hidden="true" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-stone-500 mb-0.5">Historical Conditions</h4>
                                    <div className="flex items-baseline gap-2 flex-wrap">
                                        <span className="font-serif font-bold text-stone-800 text-sm md:text-base">{item.weather.condition}</span>
                                        {item.weather.temp && <span className="text-xs text-stone-500 font-mono">{item.weather.temp}</span>}
                                    </div>
                                    <p className="text-xs text-stone-600 mt-1 italic line-clamp-2">{item.weather.description}</p>
                                </div>
                            </div>
                        )}

                        {/* Main text content */}
                        {isSelected ? (
                            <div className="prose prose-stone prose-sm max-w-none whitespace-normal break-words">
                                <TextWithFootnotes text={item.text} highlight={searchQuery} footnotes={footnotes} />
                            </div>
                        ) : (
                            <p className="text-stone-600 text-sm line-clamp-3 md:line-clamp-4 leading-relaxed whitespace-normal break-words">
                                <HighlightedText text={item.text.replace(/NOTE\s*\[?\d+\]?/g, '')} highlight={searchQuery} />
                            </p>
                        )}
                        
                        {/* Search match indicator */}
                        {isMatch && !isSelected && (
                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-100 rounded text-xs text-stone-600">
                                <span className="font-bold text-yellow-700 block mb-1">Found in match:</span>
                                <HighlightedText 
                                    text={
                                        isFuzzyMatch(item.title, searchQuery) ? item.title :
                                        isFuzzyMatch(item.text, searchQuery) ? "Content text" :
                                        "Footnote details"
                                    } 
                                    highlight={searchQuery} 
                                />
                            </div>
                        )}

                        {/* Footnotes Section (Expanded View) */}
                        {isSelected && footnoteIds.length > 0 && (
                            <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-stone-200">
                                <h4 className="text-xs md:text-sm font-bold uppercase tracking-wider text-stone-500 flex items-center gap-2 mb-3">
                                    <BookOpen className="w-4 h-4" aria-hidden="true" /> Sources & Notes
                                </h4>
                                <ul className="space-y-2 md:space-y-3">
                                    {footnoteIds.map(fnId => (
                                        <li key={fnId} className="text-xs md:text-sm text-stone-600 flex gap-2 md:gap-3 items-start group/note">
                                            <span className="flex-none inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold mt-0.5 ring-1 ring-teal-200 group-hover/note:bg-teal-200 transition-colors">
                                                {fnId}
                                            </span>
                                            <span className="leading-relaxed">{footnotes[fnId]}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {!isSelected && (
                        <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-stone-100 text-xs text-stone-400 font-medium flex items-center gap-1">
                            <Info className="w-3 h-3" aria-hidden="true" /> Click to read more
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Lazy-loaded modal */}
            {showImageModal && (
                <Suspense fallback={
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <Loader2 className="w-8 h-8 animate-spin text-white" />
                    </div>
                }>
                    <DraggableImageModal 
                        isOpen={showImageModal} 
                        onClose={handleCloseModal}
                        imageUrl={activeMedia?.url}
                        caption={activeMedia?.caption}
                    />
                </Suspense>
            )}
        </>
    );
});

export default HistoryItem;