import React, { useRef, useState, useEffect } from 'react';
import EmptyState from './EmptyState';

export default function VirtualList({ items = [], rowHeight = 52, overscan = 5, renderRow }) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Measure container height via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height);
    });
    observer.observe(el);
    // Set initial height
    setContainerHeight(el.clientHeight);

    return () => observer.disconnect();
  }, []);

  if (items.length === 0) {
    return <EmptyState icon="train" message="No trains found. Check your connection or filters." />;
  }

  const visibleStart = Math.floor(scrollTop / rowHeight);
  const visibleEnd   = Math.ceil((scrollTop + containerHeight) / rowHeight);
  const renderStart  = Math.max(0, visibleStart - overscan);
  const renderEnd    = Math.min(items.length - 1, visibleEnd + overscan);
  const totalHeight  = items.length * rowHeight;
  const offsetTop    = renderStart * rowHeight;

  const visibleItems = [];
  for (let i = renderStart; i <= renderEnd; i++) {
    visibleItems.push(renderRow(items[i], i));
  }

  return (
    <div
      ref={containerRef}
      style={{ height: '100%', overflowY: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, transform: `translateY(${offsetTop}px)`, width: '100%' }}>
          {visibleItems}
        </div>
      </div>
    </div>
  );
}
