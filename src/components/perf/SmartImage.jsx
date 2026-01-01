import React from "react";

export default function SmartImage({
  src,
  alt = "",
  width,
  height,
  aspectRatio, // e.g. "3/2"
  style,
  srcSet,
  sizes,
  srcSetVariants,
  ...rest
}) {
  const hasDims = Number(width) > 0 && Number(height) > 0;
  const ratioStyle = aspectRatio ? { aspectRatio, width: "100%", height: "auto" } : null;

  const wrapperStyle = {
    display: "block",
    width: "100%",
    ...(ratioStyle || {}),
    ...style,
  };

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

  return (
    <img
      src={src}
      alt={alt}
      width={hasDims ? width : undefined}
      height={hasDims ? height : undefined}
      loading="lazy"
      decoding="async"
      style={wrapperStyle}
      srcSet={computedSrcSet}
      sizes={sizes}
      {...rest}
    />
  );
}