import React, { memo, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import FullscreenImageViewer from './FullscreenImageViewer';

const ResizableBackgroundImage = memo(function ResizableBackgroundImage({ src, contain, children }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <>
      <div className="absolute inset-0 w-full h-full pointer-events-none bg-white flex items-end justify-center" style={{ zIndex: 0 }}>
        <img
          src={src}
          alt=""
          className={`select-none ${contain ? 'object-contain' : 'object-cover'}`}
          style={{ width: '65%', height: '65%', objectFit: contain ? 'contain' : 'cover' }}
          draggable={false}
          loading="lazy"
          decoding="async"
        />
      </div>
      {/* Expand button — outside the pointer-events-none container */}
      <button
        onClick={() => setIsFullscreen(true)}
        className="fixed bottom-6 right-6 bg-white/95 hover:bg-white border border-gray-300 shadow-xl rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
        style={{ zIndex: 50 }}
        title="Expand aerial view"
      >
        <Maximize2 className="w-4 h-4" />
        Expand Image
      </button>

      <FullscreenImageViewer
        src={src}
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
      >
        {children}
      </FullscreenImageViewer>
    </>
  );
});

export default ResizableBackgroundImage;