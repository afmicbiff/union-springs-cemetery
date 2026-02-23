import React, { memo } from 'react';

const ResizableBackgroundImage = memo(function ResizableBackgroundImage({ src, contain }) {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none bg-white flex items-center justify-center" style={{ zIndex: 0 }}>
      <img
        src={src}
        alt=""
        className={`select-none ${contain ? 'object-contain' : 'object-cover'}`}
        style={{ width: '85%', height: '85%', objectFit: contain ? 'contain' : 'cover' }}
        draggable={false}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
});

export default ResizableBackgroundImage;