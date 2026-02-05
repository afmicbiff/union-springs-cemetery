import React, { memo, useState, useEffect, useRef } from 'react';

/**
 * LazyLoad - Intersection Observer based lazy loading wrapper
 * Only renders children when they enter the viewport
 * Reduces initial JavaScript execution and DOM size
 */
const LazyLoad = memo(function LazyLoad({ 
  children, 
  rootMargin = "200px",
  threshold = 0,
  placeholder = null,
  className = "",
  minHeight = "100px",
  once = true
}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Skip if already intersected and once mode
    if (once && hasIntersected) return;

    // Use IntersectionObserver for efficient viewport detection
    const observer = new IntersectionObserver(
      ([entry]) => {
        const intersecting = entry.isIntersecting;
        setIsIntersecting(intersecting);
        if (intersecting) {
          setHasIntersected(true);
          if (once) {
            observer.unobserve(element);
          }
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold, once, hasIntersected]);

  const shouldRender = once ? hasIntersected : isIntersecting;

  return (
    <div 
      ref={ref} 
      className={className}
      style={{ minHeight: shouldRender ? undefined : minHeight }}
    >
      {shouldRender ? children : placeholder}
    </div>
  );
});

export default LazyLoad;

/**
 * LazyComponent - HOC for lazy loading any component
 */
export function withLazyLoad(Component, options = {}) {
  return memo(function LazyLoadedComponent(props) {
    return (
      <LazyLoad {...options}>
        <Component {...props} />
      </LazyLoad>
    );
  });
}