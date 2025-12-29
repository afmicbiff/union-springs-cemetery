import React from "react";

// Simple virtualization for uniform-height rows
export default function VirtualList({ items, itemHeight = 44, overscan = 6, height = 400, renderItem }) {
  const containerRef = React.useRef(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const total = items.length;
  const viewportCount = Math.ceil(height / itemHeight);
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const end = Math.min(total, start + viewportCount + overscan * 2);

  const onScroll = (e) => setScrollTop(e.currentTarget.scrollTop);

  return (
    <div ref={containerRef} onScroll={onScroll} style={{ height, overflow: "auto", position: "relative" }}>
      <div style={{ height: total * itemHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${start * itemHeight}px)` }}>
          {items.slice(start, end).map((item, i) => (
            <div key={item.id || i} style={{ height: itemHeight }}>
              {renderItem(item, start + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}