import React from 'react';

export default function VirtualTableBody({ items, rowHeight = 56, overscan = 6, colCount = 1, renderRow, scrollContainerRef }) {
  const [scrollTop, setScrollTop] = React.useState(0);
  const total = items.length;

  const getHeight = () => {
    const el = scrollContainerRef?.current;
    if (!el) return 400;
    return el.clientHeight || 400;
  };

  const height = getHeight();
  const viewportCount = Math.ceil(height / rowHeight);
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const end = Math.min(total, start + viewportCount + overscan * 2);

  React.useEffect(() => {
    const el = scrollContainerRef?.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener('scroll', onScroll);
    // Initialize
    setScrollTop(el.scrollTop || 0);
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollContainerRef]);

  const topSpacer = start * rowHeight;
  const bottomSpacer = (total - end) * rowHeight;

  return (
    <>
      {topSpacer > 0 && (
        <tr style={{ height: topSpacer }}>
          <td colSpan={colCount} />
        </tr>
      )}
      {items.slice(start, end).map((item, idx) => renderRow(item, start + idx))}
      {bottomSpacer > 0 && (
        <tr style={{ height: bottomSpacer }}>
          <td colSpan={colCount} />
        </tr>
      )}
    </>
  );
}