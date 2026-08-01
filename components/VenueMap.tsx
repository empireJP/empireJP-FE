import { geocodeVenue, type VenueParts } from "@/lib/geocode";
import { GlobeIcon, PinIcon } from "./Icons";

/** Half a kilometre either side of the venue — close enough to read the street
 *  it is on, wide enough to place it in the neighbourhood. */
const HALF_SPAN_DEG = 0.004;

/** OSM's own tiles are light, and this app is dark-only. Inverting and rotating
 *  the hue back is the cheapest dark basemap that needs no tile key and no map
 *  library; the extra tweaks stop the result reading as pure grey. */
const DARK_TILES = "invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.95) saturate(0.75)";

/**
 * The event's location on a real map. Geocoding can come back empty (see
 * `lib/geocode`), so the decorative grid this replaced is still here as the
 * fallback — an obviously abstract panel beats a map of the wrong place.
 */
export async function VenueMap({ venue, area, city }: VenueParts) {
  const point = await geocodeVenue({ venue, area, city });

  const embedSrc = point
    ? "https://www.openstreetmap.org/export/embed.html?" +
      new URLSearchParams({
        bbox: [
          point.lon - HALF_SPAN_DEG,
          point.lat - HALF_SPAN_DEG,
          point.lon + HALF_SPAN_DEG,
          point.lat + HALF_SPAN_DEG,
        ].join(","),
        layer: "mapnik",
      }).toString()
    : null;

  return (
    <div className="relative mt-4 h-64 overflow-hidden rounded-2xl border border-line">
      {embedSrc ? (
        <iframe
          title={`Map showing ${venue}, ${area}`}
          src={embedSrc}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 h-full w-full border-0"
          style={{ filter: DARK_TILES }}
        />
      ) : (
        <>
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, var(--surface-2), var(--surface-3))" }}
          />
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
              backgroundSize: "34px 34px",
            }}
          />
        </>
      )}

      {/* The bbox is centred on the point, so the middle of the frame *is* the
          venue. Non-interactive, or it would eat drags meant for the map. */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-white shadow-[var(--shadow-pop)] ring-4 ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]">
          <PinIcon width={18} height={18} />
        </span>
      </div>

      <a
        href={`https://maps.google.com/?q=${encodeURIComponent(`${venue} ${area} ${city}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-surface/90 px-2.5 py-1.5 text-xs font-semibold text-fg backdrop-blur-sm transition-colors hover:bg-surface"
      >
        <GlobeIcon width={14} height={14} /> Open in Maps
      </a>

      {embedSrc && (
        // ODbL attribution. The embed carries its own, bottom-right, where the
        // Open in Maps chip now sits — so state it ourselves.
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 left-3 rounded-md bg-surface/80 px-2 py-1 text-[10px] font-medium text-muted backdrop-blur-sm transition-colors hover:text-fg"
        >
          © OpenStreetMap
        </a>
      )}
    </div>
  );
}
