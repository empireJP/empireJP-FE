/**
 * Renders a real event poster image, cropped with object-cover.
 * The dominant accent color sits behind it as a graceful loading base.
 */
export function EventCover({
  src,
  alt,
  accent,
  className = "",
  rounded = "rounded-2xl",
  priority = false,
}: {
  src: string;
  alt: string;
  accent?: string;
  className?: string;
  rounded?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden ${rounded} ${className}`}
      style={{ backgroundColor: accent ?? "var(--surface-3)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="h-full w-full object-cover"
      />
    </div>
  );
}
