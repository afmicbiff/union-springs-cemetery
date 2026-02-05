import React, { useCallback, useMemo } from 'react';
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { X, Users } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useIsMobile } from './utils';

// Reduced motion spring config
const SPRING_CONFIG = { type: "spring", stiffness: 200, damping: 25 };
const SPRING_CONFIG_REDUCED = { type: "tween", duration: 0.2 };

// Memoized era section component
const EraSection = React.memo(function EraSection({ era, names }) {
    return (
        <div className="space-y-2">
            <h4 className="font-bold text-teal-800 text-sm border-b border-teal-100 pb-1">{era}</h4>
            <p className="text-sm text-stone-600 leading-relaxed break-words">{names}</p>
        </div>
    );
});

const MembershipItem = React.memo(function MembershipItem({ isSelected, onToggle, membershipLists }) {
    const isMobile = useIsMobile();
    
    // Check for reduced motion preference
    const prefersReducedMotion = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    }, []);

    const handleToggle = useCallback(() => {
        onToggle('members');
    }, [onToggle]);

    const handleClose = useCallback((e) => {
        e.stopPropagation();
        onToggle(null);
    }, [onToggle]);

    const animationConfig = prefersReducedMotion ? SPRING_CONFIG_REDUCED : SPRING_CONFIG;
    
    const cardWidth = isSelected 
        ? (isMobile ? "100%" : "40rem") 
        : (isMobile ? "100%" : "16rem");

    const listCount = membershipLists?.length || 0;

    return (
        <motion.div
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
                    : "bg-stone-100/80 border-stone-200 h-64 hover:bg-white"
            )}
            onClick={handleToggle}
        >
            {/* Connector Point - Desktop only */}
            {!isSelected && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex-col items-center gap-1 hidden md:flex">
                    <Badge variant="outline" className="bg-stone-800 text-stone-100 border-stone-700 font-serif">
                        Members
                    </Badge>
                    <div className="w-0.5 h-6 bg-stone-300" aria-hidden="true" />
                    <div 
                        className="w-4 h-4 rounded-full border-4 bg-stone-800 border-stone-400 group-hover:border-teal-500 shadow-sm transition-colors" 
                        aria-label="Membership records section"
                    />
                </div>
            )}

            <div className="flex flex-col h-full p-4 md:p-6">
                <div className="flex justify-between items-start mb-3 md:mb-4">
                    <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold uppercase tracking-wider mb-1 block text-stone-500">
                            Records
                        </span>
                        <h3 className={cn(
                            "font-serif font-bold text-stone-900 leading-tight whitespace-normal", 
                            isSelected ? "text-xl md:text-2xl" : "text-base md:text-lg line-clamp-2"
                        )}>
                            Membership Rolls
                        </h3>
                    </div>
                    {isSelected && (
                        <button 
                            onClick={handleClose}
                            className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 flex-shrink-0 touch-manipulation"
                            aria-label="Close details"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1 md:pr-2 custom-scrollbar">
                    {isSelected ? (
                        <div className="flex flex-col gap-4 md:gap-6 whitespace-normal">
                            {membershipLists.map((list, i) => (
                                <EraSection key={list.era || i} era={list.era} names={list.names} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 whitespace-normal">
                            <p className="text-stone-600 text-sm break-words">
                                Historical membership records from 1895 through the 1990s.
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                                <Users className="w-4 h-4 text-stone-400" aria-hidden="true" />
                                <span className="text-xs text-stone-500">Contains {listCount} era lists</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
});

export default MembershipItem;