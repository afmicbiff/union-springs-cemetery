import React, { useState, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls } from 'framer-motion';
import { X, Download, Maximize2, ZoomIn, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";

// Lazy load jsPDF only when needed
const loadJsPDF = () => import('jspdf').then(m => m.jsPDF);

export default function DraggableImageModal({ isOpen, onClose, imageUrl, caption }) {
    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
        <DraggableModalContent onClose={onClose} imageUrl={imageUrl} caption={caption} />,
        document.body
    );
}

function DraggableModalContent({ onClose, imageUrl, caption }) {
    const [zIndex, setZIndex] = useState(100);
    const [size, setSize] = useState({ width: 600, height: 500 });
    const [isDownloading, setIsDownloading] = useState(false);
    const [imageError, setImageError] = useState(false);
    const dragControls = useDragControls();
    
    // Magnifier State
    const [isMagnifying, setIsMagnifying] = useState(false);
    const [magnifierState, setMagnifierState] = useState({ show: false, x: 0, y: 0, width: 0, height: 0 });
    const imageRef = useRef(null);

    // Calculate initial position (centered)
    const initialPosition = useMemo(() => {
        if (typeof window === 'undefined') return { x: 100, y: 100 };
        return {
            x: Math.max(20, (window.innerWidth - 600) / 2),
            y: Math.max(20, (window.innerHeight - 500) / 2)
        };
    }, []);

    // Check if mobile
    const isMobile = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth < 768;
    }, []);

    const handleDownloadPDF = useCallback(async () => {
        if (!imageUrl || isDownloading) return;
        
        setIsDownloading(true);
        try {
            const jsPDF = await loadJsPDF();
            const doc = new jsPDF();
            
            // Create an image element to get dimensions
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = imageUrl;
            });
            
            const pdfWidth = doc.internal.pageSize.getWidth() - 20;
            const pdfHeight = (img.height * pdfWidth) / img.width;
            
            doc.addImage(imageUrl, 'JPEG', 10, 10, pdfWidth, Math.min(pdfHeight, 250));
            
            if (caption) {
                doc.setFontSize(10);
                doc.text(caption, 10, Math.min(pdfHeight + 20, 270), { maxWidth: pdfWidth });
            }
            
            doc.save("historical-image.pdf");
        } catch (error) {
            console.error('PDF download failed:', error);
            // Fallback: open image in new tab
            window.open(imageUrl, '_blank');
        } finally {
            setIsDownloading(false);
        }
    }, [imageUrl, caption, isDownloading]);

    const handleFocus = useCallback(() => {
        setZIndex(prev => prev + 1);
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (!isMagnifying || !imageRef.current) return;
        
        const imgRect = imageRef.current.getBoundingClientRect();
        const x = e.clientX - imgRect.left;
        const y = e.clientY - imgRect.top;

        if (x < 0 || y < 0 || x > imgRect.width || y > imgRect.height) {
            setMagnifierState(prev => ({ ...prev, show: false }));
            return;
        }

        setMagnifierState({
            show: true,
            x,
            y,
            width: imgRect.width,
            height: imgRect.height,
            imgOffsetLeft: imageRef.current.offsetLeft,
            imgOffsetTop: imageRef.current.offsetTop
        });
    }, [isMagnifying]);

    const handleMouseLeave = useCallback(() => {
        setMagnifierState(prev => ({ ...prev, show: false }));
    }, []);

    const toggleMagnify = useCallback(() => {
        setIsMagnifying(prev => !prev);
    }, []);

    const handleImageError = useCallback(() => {
        setImageError(true);
    }, []);

    const handleResize = useCallback((w, h) => {
        setSize({ width: Math.max(300, w), height: Math.max(200, h) });
    }, []);

    // Mobile-optimized modal (fullscreen)
    if (isMobile) {
        return (
            <div 
                className="fixed inset-0 z-50 bg-black flex flex-col"
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                {/* Header */}
                <div className="flex-shrink-0 bg-stone-900 p-3 flex justify-between items-center safe-area-inset-top">
                    <span className="text-sm font-medium text-white truncate flex-1 mr-4">{caption || 'Image Viewer'}</span>
                    <div className="flex gap-2">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 text-white hover:bg-white/20"
                            onClick={handleDownloadPDF}
                            disabled={isDownloading}
                            aria-label="Download PDF"
                        >
                            {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 text-white hover:bg-white/20"
                            onClick={onClose}
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Image */}
                <div className="flex-1 flex items-center justify-center overflow-hidden p-4">
                    {imageError ? (
                        <div className="text-white text-center">
                            <p className="text-lg mb-2">Failed to load image</p>
                            <Button variant="outline" onClick={() => window.open(imageUrl, '_blank')}>
                                Open in new tab
                            </Button>
                        </div>
                    ) : (
                        <img 
                            src={imageUrl} 
                            alt={caption || "Historical image"} 
                            className="max-w-full max-h-full object-contain"
                            onError={handleImageError}
                            loading="eager"
                        />
                    )}
                </div>

                {/* Caption */}
                {caption && !imageError && (
                    <div className="flex-shrink-0 bg-stone-900 p-3 text-center safe-area-inset-bottom">
                        <p className="text-sm text-stone-300 font-serif">{caption}</p>
                    </div>
                )}
            </div>
        );
    }

    // Desktop draggable modal
    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/30 z-40"
                onClick={onClose}
            />
            
            <motion.div
                drag
                dragListener={false}
                dragControls={dragControls}
                dragMomentum={false}
                initial={{ opacity: 0, scale: 0.9, x: initialPosition.x, y: initialPosition.y }}
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
                <div 
                    className="bg-stone-100 p-2 border-b border-stone-200 flex justify-between items-center cursor-move select-none"
                    onPointerDown={(e) => { handleFocus(); dragControls.start(e); }}
                >
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider px-2">Image Viewer</span>
                    <div className="flex gap-1">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className={`h-6 w-6 ${isMagnifying ? 'bg-teal-100 text-teal-700' : ''}`}
                            onClick={toggleMagnify} 
                            title="Toggle Magnifying Glass"
                            aria-label={isMagnifying ? "Disable magnifier" : "Enable magnifier"}
                        >
                            <ZoomIn className="w-3 h-3" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={handleDownloadPDF} 
                            title="Download PDF"
                            disabled={isDownloading}
                            aria-label="Download as PDF"
                        >
                            {isDownloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 hover:bg-red-100 hover:text-red-600" 
                            onClick={onClose}
                            aria-label="Close"
                        >
                            <X className="w-3 h-3" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div 
                    className="flex-1 bg-stone-900 flex items-center justify-center overflow-hidden relative group"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                >
                    {imageError ? (
                        <div className="text-white text-center p-4">
                            <p className="mb-2">Failed to load image</p>
                            <Button variant="outline" size="sm" onClick={() => window.open(imageUrl, '_blank')}>
                                Open in new tab
                            </Button>
                        </div>
                    ) : (
                        <img 
                            ref={imageRef}
                            src={imageUrl} 
                            alt={caption || "Historical image"} 
                            className={`max-w-full max-h-full object-contain ${isMagnifying ? 'cursor-none' : ''}`}
                            onDragStart={(e) => e.preventDefault()}
                            onError={handleImageError}
                            loading="eager"
                        />
                    )}
                    
                    {/* Magnifier lens */}
                    {isMagnifying && magnifierState.show && !imageError && (
                        <div 
                            style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                transform: `translate(${magnifierState.x + magnifierState.imgOffsetLeft - 100}px, ${magnifierState.y + magnifierState.imgOffsetTop - 100}px)`,
                                width: '200px',
                                height: '200px',
                                borderRadius: '50%',
                                border: '3px solid #14b8a6',
                                boxShadow: '0 0 20px rgba(0,0,0,0.4)',
                                pointerEvents: 'none',
                                backgroundImage: `url("${imageUrl}")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundColor: '#000',
                                backgroundSize: `${magnifierState.width * 3}px ${magnifierState.height * 3}px`,
                                backgroundPosition: `-${magnifierState.x * 3 - 100}px -${magnifierState.y * 3 - 100}px`,
                                zIndex: 999
                            }}
                            aria-hidden="true"
                        />
                    )}

                    {/* Resize Handle */}
                    <ResizeHandle onResize={handleResize} size={size} />
                </div>

                {/* Footer */}
                {caption && !imageError && (
                    <div className="p-3 bg-white border-t border-stone-200 text-sm text-stone-600 font-serif text-center">
                        {caption}
                    </div>
                )}
            </motion.div>
        </>
    );
}

const ResizeHandle = React.memo(function ResizeHandle({ onResize, size }) {
    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = size.width;
        const startHeight = size.height;

        const handleMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;
            onResize(startWidth + deltaX, startHeight + deltaY);
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [onResize, size]);

    return (
        <div 
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-teal-500/50 hover:bg-teal-600 rounded-tl-md z-50 flex items-center justify-center"
            onMouseDown={handleMouseDown}
            aria-label="Resize"
        >
            <Maximize2 className="w-2 h-2 text-white rotate-90" aria-hidden="true" />
        </div>
    );
});