import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { X, ChevronRight, Info, BookOpen, CloudLightning, CloudSnow, Sun, Cloud } from 'lucide-react';
import { cn } from "@/lib/utils";
import { isFuzzyMatch } from './utils';

const HighlightedText = ({ text, highlight }) => {
    if (!highlight || !text) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
        <span>
            {parts.map((part, i) => 
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <mark key={i} className="bg-yellow-200 text-stone-900 rounded-sm px-0.5">{part}</mark>
                ) : (
                    part
                )
            )}
        </span>
    );
};

const TextWithFootnotes = ({ text, highlight, footnotes }) => {
    const parts = text.split(/(NOTE\s*\d+)/g);
    return (
        <span className="leading-relaxed text-stone-700">
            {parts.map((part, index) => {
                const noteMatch = part.match(/NOTE\s*(\d+)/);
                if (noteMatch) {
                    const noteId = parseInt(noteMatch[1]);
                    const noteContent = footnotes[noteId];
                    return (
                        <Popover key={index}>
                            <PopoverTrigger asChild>
                                <button 
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center justify-center mx-1 h-5 w-5 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold hover:bg-teal-200 transition-colors align-top mt-1 cursor-pointer ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                }
                return <HighlightedText key={index} text={part} highlight={highlight} />;
            })}
        </span>
    );
};

const HistoryItem = React.memo(({ item, isSelected, isMatch, searchQuery, onToggle, footnotes, id }) => {
    const hasFootnotes = /NOTE\s*\d+/.test(item.text);

    const getWeatherIcon = (iconName) => {
        switch(iconName) {
            case 'cloud-lightning': return CloudLightning;
            case 'snowflake': return CloudSnow;
            case 'sun': return Sun;
            default: return Cloud;
        }
    };

    const WeatherIcon = item.weather ? getWeatherIcon(item.weather.icon) : null;

    return (
        <motion.div
            id={id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
                opacity: 1, 
                scale: 1,
                flexBasis: isSelected ? "40rem" : "16rem",
                minWidth: isSelected ? "40rem" : "16rem"
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
                "relative flex flex-col transition-all duration-300 ease-in-out cursor-pointer group",
                "rounded-xl border shadow-sm hover:shadow-md",
                isSelected 
                    ? "bg-white border-teal-500 z-20 h-[70vh] md:h-[60vh] overflow-hidden" 
                    : "bg-white/80 border-stone-200 h-64 hover:bg-white hover:border-teal-300",
                isMatch && !isSelected && "ring-2 ring-yellow-400 ring-offset-2"
            )}
            onClick={() => onToggle(item.id)}
        >
            {/* Connector Line Point */}
            {!isSelected && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                    <Badge variant="outline" className="bg-stone-100 border-stone-300 text-stone-600 font-serif flex items-center gap-1">
                        {item.year}
                        {item.weather && <WeatherIcon className="w-3 h-3 text-stone-400" />}
                    </Badge>
                    <div className="w-0.5 h-6 bg-stone-300" />
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className={cn(
                                "w-4 h-4 rounded-full border-4 shadow-sm transition-colors cursor-help",
                                isMatch ? "bg-yellow-400 border-yellow-200" : "bg-stone-100 border-stone-400 group-hover:border-teal-500"
                            )} />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="font-serif font-bold">{item.title}</p>
                            <p className="text-xs text-stone-500">{item.year}</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            )}

            {/* Card Content */}
            <div className="flex flex-col h-full p-6">
                {/* Card Header */}
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <span className={cn("text-xs font-bold uppercase tracking-wider mb-1 block", isSelected ? "text-teal-600" : "text-stone-500")}>
                            {item.year}
                        </span>
                        <h3 className={cn("font-serif font-bold text-stone-900 leading-tight whitespace-normal", isSelected ? "text-2xl" : "text-lg line-clamp-2")}>
                            <HighlightedText text={item.title} highlight={searchQuery} />
                        </h3>
                        {hasFootnotes && !isSelected && (
                            <div className="flex items-center gap-1 mt-1 text-teal-600 text-xs">
                                <BookOpen className="w-3 h-3" />
                                <span className="font-medium">Has Footnotes</span>
                            </div>
                        )}
                    </div>
                    {isSelected ? (
                         <button 
                            onClick={(e) => { e.stopPropagation(); onToggle(null); }}
                            className="p-1 rounded-full hover:bg-stone-100 text-stone-400"
                         >
                            <X className="w-5 h-5" />
                         </button>
                    ) : (
                        <div className="p-2 bg-stone-50 rounded-full text-stone-400 group-hover:text-teal-600 group-hover:bg-teal-50 transition-colors">
                            <ChevronRight className="w-4 h-4" />
                        </div>
                    )}
                </div>

                {/* Card Body */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {isSelected && item.weather && (
                        <div className="mb-4 p-3 bg-stone-50 rounded-lg border border-stone-100 flex items-start gap-3">
                            <div className="p-2 bg-white rounded-full shadow-sm">
                                <WeatherIcon className="w-5 h-5 text-stone-600" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-0.5">Historical Conditions</h4>
                                <div className="flex items-baseline gap-2">
                                    <span className="font-serif font-bold text-stone-800">{item.weather.condition}</span>
                                    {item.weather.temp && <span className="text-xs text-stone-500 font-mono">{item.weather.temp}</span>}
                                </div>
                                <p className="text-xs text-stone-600 mt-1 italic">{item.weather.description}</p>
                            </div>
                        </div>
                    )}



                    {isSelected ? (
                        <div className="prose prose-stone prose-sm max-w-none whitespace-normal">
                            <TextWithFootnotes text={item.text} highlight={searchQuery} footnotes={footnotes} />
                        </div>
                    ) : (
                        <p className="text-stone-600 text-sm line-clamp-4 leading-relaxed whitespace-normal">
                            <HighlightedText text={item.text.replace(/NOTE \d+/g, '')} highlight={searchQuery} />
                        </p>
                    )}
                    
                    {/* Show matching footnote context if found */}
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
                </div>
                
                {!isSelected && (
                    <div className="mt-4 pt-4 border-t border-stone-100 text-xs text-stone-400 font-medium flex items-center gap-1">
                        <Info className="w-3 h-3" /> Click to read more
                    </div>
                )}
            </div>
        </motion.div>
    );
});

HistoryItem.displayName = 'HistoryItem';
export default HistoryItem;