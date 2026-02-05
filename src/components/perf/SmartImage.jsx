import React, { memo, useState, useCallback } from "react";

/**
 * SmartImage - Optimized image component for mobile performance
 * Features:
 * - WebP format with fallback
 * - Responsive srcSet for different screen sizes
 * - Lazy loading with native browser support
 * - Blur-up placeholder effect
 * - Aspect ratio preservation to prevent CLS
 */
const SmartImage = memo(function SmartImage({
  src,
  alt = "",
  width,
  height,
  aspectRatio,
  className = "",
  style,
  srcSet,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  srcSetVariants,
  webpSrc,
  webpSrcSet,
  priority = false,
  placeholder = "blur",
  blurDataURL,
  onLoad,
  ...rest
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const hasDims = Number(width) > 0 && Number(height) > 0;
  
  // Compute aspect ratio style to prevent CLS
  const ratioStyle = aspectRatio 
    ? { aspectRatio, width: "100%", height: "auto" } 
    : hasDims 
      ? { aspectRatio: `${width}/${height}`, width: "100%", height: "auto" }
      : null;

  const wrapperStyle = {
    display: "block",
    ...(ratioStyle || {}),
    ...style,
  };

  // Build srcSet from variants or use provided
  const computedSrcSet = React.useMemo(() => {
    if (srcSet) return srcSet;
    if (!srcSetVariants) return undefined;
    const parts = [];
    if (srcSetVariants.small) parts.push(`${srcSetVariants.small} 320w`);
    if (srcSetVariants.medium) parts.push(`${srcSetVariants.medium} 640w`);
    if (srcSetVariants.large) parts.push(`${srcSetVariants.large} 1024w`);
    if (srcSetVariants.original) parts.push(`${srcSetVariants.original} 1280w`);
    return parts.length ? parts.join(", ") : undefined;
  }, [srcSet, srcSetVariants]);

  // Build WebP srcSet if webp variants provided
  const computedWebpSrcSet = React.useMemo(() => {
    if (webpSrcSet) return webpSrcSet;
    if (!srcSetVariants) return undefined;
    const parts = [];
    // Auto-generate WebP URLs if source supports it
    const toWebp = (url) => {
      if (!url) return null;
      if (url.includes('.webp')) return url;
      // For URLs that support format conversion
      if (url.includes('supabase.co') || url.includes('base44.app')) {
        return url.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      }
      return null;
    };
    if (srcSetVariants.small) {
      const webp = toWebp(srcSetVariants.small);
      if (webp) parts.push(`${webp} 320w`);
    }
    if (srcSetVariants.medium) {
      const webp = toWebp(srcSetVariants.medium);
      if (webp) parts.push(`${webp} 640w`);
    }
    if (srcSetVariants.large) {
      const webp = toWebp(srcSetVariants.large);
      if (webp) parts.push(`${webp} 1024w`);
    }
    return parts.length ? parts.join(", ") : undefined;
  }, [webpSrcSet, srcSetVariants]);

  const handleLoad = useCallback((e) => {
    setIsLoaded(true);
    onLoad?.(e);
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  // Blur placeholder styles
  const blurStyles = placeholder === "blur" && !isLoaded && blurDataURL ? {
    backgroundImage: `url(${blurDataURL})`,
    backgroundSize: "cover",
    filter: "blur(20px)",
    transform: "scale(1.1)",
  } : {};

  const imgClassName = `${className} ${
    placeholder === "blur" && !isLoaded ? "opacity-0" : "opacity-100"
  } transition-opacity duration-300`;

  // Use picture element for WebP with fallback
  const hasWebp = webpSrc || computedWebpSrcSet;

  if (hasWebp) {
    return (
      <picture style={wrapperStyle}>
        <source
          type="image/webp"
          srcSet={computedWebpSrcSet || webpSrc}
          sizes={sizes}
        />
        <source
          type="image/jpeg"
          srcSet={computedSrcSet || src}
          sizes={sizes}
        />
        <img
          src={hasError ? src : (webpSrc || src)}
          alt={alt}
          width={hasDims ? width : undefined}
          height={hasDims ? height : undefined}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          fetchpriority={priority ? "high" : "auto"}
          className={imgClassName}
          style={{ ...blurStyles, width: "100%", height: "auto" }}
          onLoad={handleLoad}
          onError={handleError}
          {...rest}
        />
      </picture>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={hasDims ? width : undefined}
      height={hasDims ? height : undefined}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchpriority={priority ? "high" : "auto"}
      style={{ ...wrapperStyle, ...blurStyles }}
      srcSet={computedSrcSet}
      sizes={sizes}
      className={imgClassName}
      onLoad={handleLoad}
      onError={handleError}
      {...rest}
    />
  );
});

export default SmartImage;

// Pre-built responsive size presets
export const IMAGE_SIZES = {
  thumbnail: "(max-width: 640px) 80px, 120px",
  card: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  hero: "(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 60vw",
  full: "100vw",
};

// Helper to generate srcSet variants from a base URL
export function generateSrcSetVariants(baseUrl, sizes = [320, 640, 1024, 1280]) {
  if (!baseUrl) return null;
  
  // For Supabase/Base44 URLs that support transformations
  if (baseUrl.includes('supabase.co') || baseUrl.includes('base44.app')) {
    const [base, query] = baseUrl.split('?');
    const params = new URLSearchParams(query || '');
    
    return {
      small: `${base}?${new URLSearchParams({ ...Object.fromEntries(params), width: sizes[0] })}`,
      medium: `${base}?${new URLSearchParams({ ...Object.fromEntries(params), width: sizes[1] })}`,
      large: `${base}?${new URLSearchParams({ ...Object.fromEntries(params), width: sizes[2] })}`,
      original: baseUrl,
    };
  }
  
  return { original: baseUrl };
}