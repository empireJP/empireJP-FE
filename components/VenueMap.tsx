import { geocodeVenue, type VenuePrecision } from "@/lib/geocode";
import { GlobeIcon, PinIcon } from "./Icons";

/**
 * The event's location.
 *
 * The rule this component is built around: **never draw a guess as though it
 * were a fact.** A buyer reads a pin as "the doors are here" and plans a
 * journey around it, so every state below says how much it actually knows —
 * through the zoom, the marker and a line of text, not just one of the three.
 *
 * Where that knowledge comes from, in order:
 *
 *   1. `latitude`/`longitude` on the event — the point the organizer chose in
 *      the dashboard's location picker. Authoritative: a human pointed at it.
 *      This is the normal case and it costs no network call.
 *   2. Failing that, the venue text looked up in OSM (`lib/geocode`), which
 *      reports whether it matched the venue, the area, or only the city.
 *   3. Failing that, nothing — and the panel says so, rather than drawing a
 *      pin on an abstract grid, which is what it used to do.
 *
 * (1) is new. The coordinates existed all along but were serialized only to
 * the dashboard, so the storefront re-derived a location it had already been
 * given — and drew whatever it found with total confidence.
 */

/** `exact` is the organizer's own pin; the rest are degrees of inference. */
type Confidence = "exact" | VenuePrecision;

/** How wide a frame each level of confidence has earned, in degrees either
 *  side of the point: ~450 m for a known address, ~2 km for a district, ~9 km
 *  for a whole city. The zoom is the honest part — a city centroid framed to
 *  one street corner is a lie the caption can't undo. */
const HALF_SPAN_DEG: Record<Confidence, number> = {
  exact: 0.004,
  venue: 0.004,
  area: 0.02,
  city: 0.08,
};

/** What the panel tells the buyer. `null` means the map shows what it says on
 *  the tin and needs no caveat. */
const CAVEAT: Record<Confidence, string | null> = {
  exact: null,
  // A name match is usually right, but "usually" is doing work: OSM has more
  // than one venue by the same name and we took the first.
  venue: "Location matched from the venue address.",
  area: "Approximate — showing the area, not the exact venue.",
  city: "Approximate — showing the city, not the exact venue.",
};

/** OSM's own tiles are light, and this app is dark-only. Inverting and rotating
 *  the hue back is the cheapest dark basemap that needs no tile key and no map
 *  library; the extra tweaks stop the result reading as pure grey. */
const DARK_TILES = "invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.95) saturate(0.75)";

interface Located {
  lat: number;
  lon: number;
  confidence: Confidence;
}

export interface VenueMapProps {
  venue: string;
  area: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
}

/** Coordinates are only worth handing to Google when they beat the words. At
 *  area or city level its own search will do better than our centroid, so let
 *  it — the chip should take you to the venue, not to the middle of town. */
function mapsHref(place: VenueMapProps, at: Located | null): string {
  const precise = at !== null && (at.confidence === "exact" || at.confidence === "venue");
  const query = precise
    ? `${at.lat},${at.lon}`
    : `${place.venue} ${place.area} ${place.city}`;
  return `https://maps.google.com/?q=${encodeURIComponent(query)}`;
}

export async function VenueMap(place: VenueMapProps) {
  const { venue, area, city, latitude, longitude } = place;

  // The organizer's own choice wins. Both halves must be present — a lone
  // latitude is a bug upstream, not half a location.
  let at: Located | null =
    typeof latitude === "number" && typeof longitude === "number"
      ? { lat: latitude, lon: longitude, confidence: "exact" }
      : null;

  if (!at) {
    const point = await geocodeVenue({ venue, area, city });
    if (point) at = { lat: point.lat, lon: point.lon, confidence: point.precision };
  }

  const span = at ? HALF_SPAN_DEG[at.confidence] : 0;
  const embedSrc = at
    ? "https://www.openstreetmap.org/export/embed.html?" +
      new URLSearchParams({
        bbox: [at.lon - span, at.lat - span, at.lon + span, at.lat + span].join(","),
        layer: "mapnik",
      }).toString()
    : null;

  const caveat = at ? CAVEAT[at.confidence] : null;
  // Only a point trusted to the doorstep gets a hard pin. Anything vaguer gets
  // a soft disc, which reads as a region rather than an address.
  const pinpoint = at !== null && (at.confidence === "exact" || at.confidence === "venue");

  return (
    <figure className="mt-4">
      <div className="relative h-64 overflow-hidden rounded-2xl border border-line">
        {embedSrc ? (
          <iframe
            title={
              pinpoint
                ? `Map showing ${venue}, ${area}`
                : `Map showing the area around ${venue}, ${area}`
            }
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
            {/* No marker here, deliberately. This grid stands in for a map we
                could not draw, and the pin that used to sit dead centre on it
                made it look like a located one. */}
            <p className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-muted">
              We couldn&rsquo;t place this venue on a map.
            </p>
          </>
        )}

        {/* The bbox is centred on the point, so the middle of the frame *is* the
            location. Non-interactive, or it would eat drags meant for the map. */}
        {at && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {pinpoint ? (
              <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-white shadow-[var(--shadow-pop)] ring-4 ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]">
                <PinIcon width={18} height={18} />
              </span>
            ) : (
              // A soft disc rather than a pin: it covers ground instead of
              // pointing at a spot, which is exactly what we know.
              <span className="block h-20 w-20 rounded-full bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_45%,transparent)]" />
            )}
          </div>
        )}

        <a
          href={mapsHref(place, at)}
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

      {/* Outside the frame rather than floating over the tiles: it qualifies the
          whole panel, and a caption that can be mistaken for part of the map is
          the thing this component exists to avoid. */}
      {caveat && <figcaption className="mt-2 text-xs text-faint">{caveat}</figcaption>}
    </figure>
  );
}
