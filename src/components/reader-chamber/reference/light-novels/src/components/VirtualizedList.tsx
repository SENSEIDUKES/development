import React, { useState, useEffect, useRef, useMemo } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number; // estimated average height of each item in pixels
  renderItem: (item: T, index: number) => React.ReactNode;
  containerHeight?: string | number; // CSS height, e.g., "500px" or 500 (representing height in px)
  className?: string;
  emptyPlaceholder?: React.ReactNode;
  timelineLine?: boolean; // If true, renders the continuous timeline connecting line vertically
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  renderItem,
  containerHeight = 400,
  className = "",
  emptyPlaceholder,
  timelineLine = false,
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [measuredHeight, setMeasuredHeight] = useState(
    typeof containerHeight === 'number' ? containerHeight : 400
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      setScrollTop(el.scrollTop);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });

    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver((entries) => {
        for (const entry of entries) {
          // Fallback to client height if bounding height is 0
          const contentHeight = entry.contentRect.height;
          setMeasuredHeight(contentHeight || el.clientHeight || 400);
        }
      })
      : null;
    observer?.observe(el);

    // Initial estimation
    setMeasuredHeight(el.clientHeight || (typeof containerHeight === 'number' ? containerHeight : 400));

    return () => {
      el.removeEventListener('scroll', handleScroll);
      observer?.disconnect();
    };
  }, [containerHeight]);

  const totalHeight = items.length * itemHeight;
  const overscan = 5; // render extra items above and below the visible region to prevent flicker

  const { startIndex, endIndex } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(items.length - 1, Math.floor((scrollTop + measuredHeight) / itemHeight) + overscan);
    return { startIndex: start, endIndex: end };
  }, [scrollTop, measuredHeight, items.length, itemHeight]);

  const visibleItems = useMemo(() => {
    const subset: { item: T; index: number }[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      if (items[i] !== undefined) {
        subset.push({ item: items[i], index: i });
      }
    }
    return subset;
  }, [startIndex, endIndex, items]);

  if (items.length === 0) {
    return <>{emptyPlaceholder}</>;
  }

  const heightVal = typeof containerHeight === 'number' ? `${containerHeight}px` : containerHeight;

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto custom-scrollbar relative ${className}`}
      style={{ height: heightVal }}
    >
      <div style={{ height: totalHeight, width: '100%', position: 'relative' }}>
        {/* Continuous background vertical timeline line */}
        {timelineLine && (
          <div 
            className="absolute left-2.5 top-0 bottom-0 w-[1.5px] bg-neutral-900 pointer-events-none" 
            style={{ height: totalHeight }}
          />
        )}
        <div
          style={{
            transform: `translateY(${startIndex * itemHeight}px)`,
            left: 0,
            right: 0,
            position: 'absolute',
          }}
          className="space-y-4"
        >
          {visibleItems.map(({ item, index }) => renderItem(item, index))}
        </div>
      </div>
    </div>
  );
}
