// The catalog carries no coordinates — only "venue / area / city" strings — so
// the event page's location map resolves that text to a point here, server-side.
//
// Nominatim needs no key but asks for at most one request a second and a
// User-Agent that identifies the caller. Both shape this module: the response is
// cached for a month (a venue does not move), and the query chain stops at the
// first hit instead of firing every variant.
import { createLogger } from "./logger";

const log = createLogger("geocode");

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

/** 30 days. The cost of a miss is a live call to a service that asks us not to
 *  make many, and the answer is the same every time. */
const REVALIDATE_SECONDS = 60 * 60 * 24 * 30;

/** Nominatim rejects requests without one and asks that it name the app. */
const USER_AGENT = "empireJP-FE (+https://github.com/empireJP)";

/** `City` is Colombo-only, so every venue is Sri Lankan. Bias the search rather
 *  than pasting the country into the query — it keeps "Port City" off Dubai. */
const COUNTRY_CODES = "lk";

export interface VenuePoint {
  lat: number;
  lon: number;
  /** What Nominatim actually matched. Logged, never shown — the UI already has
   *  the venue name, and this is often a whole postal address. */
  matched: string;
}

interface NominatimPlace {
  lat?: string;
  lon?: string;
  display_name?: string;
}

export interface VenueParts {
  venue: string;
  area: string;
  city: string;
}

/**
 * Coordinates for a venue, or `null` if nothing in OSM matches it. Callers must
 * handle `null`: several of our venues are named grounds that only exist inside
 * a district OSM knows, and the odd one exists nowhere at all.
 */
export async function geocodeVenue(place: VenueParts): Promise<VenuePoint | null> {
  // Most specific first, then widen. Landing on the district is still a useful
  // map; landing on the city is at least honest about the neighbourhood.
  const queries = [
    `${place.venue}, ${place.area}, ${place.city}`,
    `${place.area}, ${place.city}`,
    place.city,
  ];

  for (const query of queries) {
    const point = await lookup(query);
    if (point) {
      log.debug("geocoded venue", { query, matched: point.matched });
      return point;
    }
  }

  // Not an error — the map falls back to its placeholder and "Open in Maps"
  // still works — but the fallback is indistinguishable from a real map at a
  // glance, so the reason has to be written down somewhere.
  log.warn("no coordinates for venue, map falls back to placeholder", {
    venue: place.venue,
    area: place.area,
    city: place.city,
  });
  return null;
}

async function lookup(query: string): Promise<VenuePoint | null> {
  const url =
    `${NOMINATIM_URL}?format=jsonv2&limit=1&countrycodes=${COUNTRY_CODES}` +
    `&q=${encodeURIComponent(query)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" },
      next: { revalidate: REVALIDATE_SECONDS },
    });
  } catch (err) {
    log.error("geocoder unreachable", {
      query,
      cause: err instanceof Error ? err.message : String(err),
    });
    return null;
  }

  if (!res.ok) {
    // 403/429 here means we have annoyed Nominatim — worth seeing in a log.
    log.warn("geocoder returned an error status", { query, status: res.status });
    return null;
  }

  const body = (await res.json().catch(() => null)) as NominatimPlace[] | null;
  const hit = Array.isArray(body) ? body[0] : undefined;
  const lat = Number(hit?.lat);
  const lon = Number(hit?.lon);
  // An empty array is the ordinary "no match" answer, and drives the next query
  // in the chain — nothing to log at this level.
  if (!hit || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return { lat, lon, matched: hit.display_name ?? query };
}
