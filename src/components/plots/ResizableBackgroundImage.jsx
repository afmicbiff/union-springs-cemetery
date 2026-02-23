import React, { memo } from 'react';

const ResizableBackgroundImage = memo(function ResizableBackgroundImage({ src, contain }) {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      <img
        src={src}
        alt=""
        className={`w-full h-full select-none ${contain ? 'object-contain' : 'object-cover'}`}
        draggable={false}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
});

export default ResizableBackgroundImage;