import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls } from 'framer-motion';
import { X, Download, Maximize2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";

export default function DraggableImageModal({ isOpen, onClose, imageUrl, caption }) {
    if (!isOpen) return null;

    return createPortal(
        <DraggableModalContent onClose={onClose} imageUrl={imageUrl} caption={caption} />,
        document.body
    );
}

function DraggableModalContent({ onClose, imageUrl, caption }) {
    const [zIndex, setZIndex] = useState(100);
    const [size, setSize] = useState({ width: 600, height: 500 });
    const containerRef = useRef(null);

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        
        const imgProps = doc.getImageProperties(imageUrl);
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        doc.addImage(imageUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        if (caption) {
            doc.setFontSize(10);
            doc.text(caption, 10, pdfHeight + 10);
        }
        
        doc.save("historical-image.pdf");
    };

    // Bring to front on click
    const handleFocus = () => {
        setZIndex(prev => prev + 1);
    };

    return (
        <motion.div
            drag
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.9, x: window.innerWidth / 2 - 300, y: window.innerHeight / 2 - 250 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ 
                width: size.width, 
                height: size.height,
                zIndex: zIndex,
                position: 'fixed',
                top: 0,
                left: 0
            }}
            className="bg-white rounded-lg shadow-2xl border border-stone-200 flex flex-col overflow-hidden"
            onPointerDown={handleFocus}
        >
            {/* Header / Drag Handle */}
            <div className="bg-stone-100 p-2 border-b border-stone-200 flex justify-between items-center cursor-move select-none"
                 onPointerDown={(e) => handleFocus()}
            >
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider px-2">Image Viewer</span>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDownloadPDF} title="Download PDF">
                        <Download className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-red-100 hover:text-red-600" onClick={onClose}>
                        <X className="w-3 h-3" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 bg-stone-900 flex items-center justify-center overflow-hidden relative group">
                <img 
                    src={imageUrl} 
                    alt={caption} 
                    className="max-w-full max-h-full object-contain pointer-events-none" 
                />
                
                {/* Resize Handles - Simple 4 corners implementation */}
                <ResizeHandle onResize={(w, h) => setSize({ width: Math.max(300, w), height: Math.max(200, h) })} size={size} position="br" />
            </div>

            {/* Footer */}
            {caption && (
                <div className="p-3 bg-white border-t border-stone-200 text-sm text-stone-600 font-serif text-center">
                    {caption}
                </div>
            )}
        </motion.div>
    );
}

function ResizeHandle({ onResize, size, position }) {
    const handleMouseDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = size.width;
        const startHeight = size.height;

        const handleMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;
            
            // Only implementing bottom-right resize for simplicity and robustness in this constrained environment
            // Full multi-directional resize requires complex coordinate math relative to the dragged position
            onResize(startWidth + deltaX, startHeight + deltaY);
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <div 
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-teal-500/50 hover:bg-teal-600 rounded-tl-md z-50 flex items-center justify-center"
            onMouseDown={handleMouseDown}
        >
            <Maximize2 className="w-2 h-2 text-white rotate-90" />
        </div>
    );
}