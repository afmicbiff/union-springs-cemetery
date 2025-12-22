import React from 'react';
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { X, Users } from 'lucide-react';
import { cn } from "@/lib/utils";

const MembershipItem = React.memo(({ isSelected, onToggle, membershipLists }) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
                opacity: 1, 
                scale: 1,
                flexBasis: isSelected ? (isMobile ? "100%" : "40rem") : (isMobile ? "100%" : "16rem"),
                minWidth: isSelected ? (isMobile ? "100%" : "40rem") : (isMobile ? "100%" : "16rem")
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
                "relative w-full md:w-auto flex flex-col transition-all duration-300 ease-in-out cursor-pointer group",
                "rounded-xl border shadow-md hover:shadow-xl hover:-translate-y-2",
                isSelected 
                    ? "bg-white border-teal-500 z-20 h-[70vh] md:h-[60vh] overflow-hidden" 
                    : "bg-stone-100/80 border-stone-200 h-64 hover:bg-white"
            )}
            onClick={() => onToggle('members')}
        >
            {!isSelected && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                    <Badge variant="outline" className="bg-stone-800 text-stone-100 border-stone-700 font-serif">
                        Members
                    </Badge>
                    <div className="w-0.5 h-6 bg-stone-300" />
                    <div className="w-4 h-4 rounded-full border-4 bg-stone-800 border-stone-400 group-hover:border-teal-500 shadow-sm transition-colors" />
                </div>
            )}

             <div className="flex flex-col h-full p-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider mb-1 block text-stone-500">
                            Records
                        </span>
                        <h3 className={cn("font-serif font-bold text-stone-900 leading-tight whitespace-normal", isSelected ? "text-2xl" : "text-lg line-clamp-2")}>
                            Membership Rolls
                        </h3>
                    </div>
                    {isSelected && (
                         <button 
                            onClick={(e) => { e.stopPropagation(); onToggle(null); }}
                            className="p-1 rounded-full hover:bg-stone-100 text-stone-400"
                         >
                            <X className="w-5 h-5" />
                         </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar">
                    {isSelected ? (
                        <div className="flex flex-col gap-6 whitespace-normal">
                            {membershipLists.map((list, i) => (
                                <div key={i} className="space-y-2">
                                    <h4 className="font-bold text-teal-800 text-sm border-b border-teal-100 pb-1">{list.era}</h4>
                                    <p className="text-sm text-stone-600 leading-relaxed break-words">{list.names}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 whitespace-normal">
                            <p className="text-stone-600 text-sm break-words">Historical membership records from 1895 through the 1990s.</p>
                            <div className="flex items-center gap-2 mt-2">
                                <Users className="w-4 h-4 text-stone-400" />
                                <span className="text-xs text-stone-500">Contains {membershipLists.length} era lists</span>
                            </div>
                        </div>
                    )}
                </div>
             </div>
        </motion.div>
    );
});

MembershipItem.displayName = 'MembershipItem';
export default MembershipItem;