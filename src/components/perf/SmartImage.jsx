import React from "react";

export default function SmartImage({
  src,
  alt = "",
  width,
  height,
  aspectRatio, // e.g. "3/2"
  style,
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

  return (
    <img
      src={src}
      alt={alt}
      width={hasDims ? width : undefined}
      height={hasDims ? height : undefined}
      loading="lazy"
      decoding="async"
      style={wrapperStyle}
      {...rest}
    />
  );
}