// JSON-LD builders (schema.org).
//
// This is the highest-value SEO work on a ticketing site: an `Event` with
// dates, venue and offers is what makes Google render the date, location and
// "from ¥X" row under the result instead of a plain blue link. Nothing else
// here moves the needle as much.
//
// Two rules the rest of this file exists to keep:
//
//   1. Structured data must describe what is actually on the page. Marking up
//      a price or a date the user can't see is a manual-action risk, not a
//      clever trick — so every field below comes from the same `EventItem` the
//      page renders.
//   2. Emit nothing rather than something wrong. A guessed timezone or an
//      invented availability is worse than an absent field, because Google
//      will happily show the wrong one.

import type { EventItem } from "@/lib/types";
import { SITE_LOCALE, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

/** A JSON-LD node. Deliberately loose — schema.org is open-world and the
 *  shapes below are already validated by being built in one place. */
export type JsonLdNode = Record<string, unknown>;

export const eventUrl = (slug: string) => `${SITE_URL}/events/${slug}`;

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/**
 * `EventItem.date` is a NAIVE ISO string — "2026-08-15T20:00:00", no `Z`, no
 * offset (empireJP-BE serializes wall-clock verbatim; see its DECISIONS.md).
 *
 * That is exactly what schema.org wants here. ISO 8601 without an offset means
 * "local time at the event's location", which is precisely what a door time
 * is. Appending a `Z`, or running it through `new Date()` in the browser,
 * would reinterpret a 20:00 Tokyo doors as 20:00 UTC and publish a start time
 * five hours out. So: string operations only, no Date parsing.
 */
export function startDateOf(event: EventItem): string {
  return event.date;
}

/**
 * End of the night, derived from the start date and `endTime`.
 *
 * `endTime <= startTime` means the show runs past midnight, so the end lands
 * on the following day — the same rule the BE applies when it computes
 * `ended`. Getting this wrong publishes an event that finishes before it
 * starts, which is the one thing rich results will reject outright.
 */
export function endDateOf(event: EventItem): string | undefined {
  const datePart = event.date.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart) || !event.endTime) return undefined;

  const crossesMidnight = event.endTime <= event.startTime;
  const [y, m, d] = datePart.split("-").map(Number);
  // Date.UTC is zone-independent by construction — safe for "+1 day" on a
  // value that carries no zone of its own.
  const ms = Date.UTC(y, m - 1, d) + (crossesMidnight ? 86_400_000 : 0);
  const end = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  const endDay = `${end.getUTCFullYear()}-${p(end.getUTCMonth() + 1)}-${p(end.getUTCDate())}`;
  return `${endDay}T${event.endTime}:00`;
}

// ---------------------------------------------------------------------------
// Event
// ---------------------------------------------------------------------------

/**
 * Ticket availability, as schema.org sees it.
 *
 * `salesClosed` is deliberately mapped to SoldOut rather than omitted: from a
 * buyer's point of view arriving at a page that will not sell them a ticket is
 * the same outcome, and it stops Google advertising a purchase that can't
 * happen.
 */
function availabilityOf(event: EventItem): string {
  if (event.ended || event.salesClosed) return "https://schema.org/SoldOut";
  const anyLeft = event.tiers.some((t) => !t.soldOut && t.available > 0);
  return anyLeft ? "https://schema.org/InStock" : "https://schema.org/SoldOut";
}

/** AggregateOffer across the tiers a buyer could actually pick. Falls back to
 *  every tier when all are gone, so the price range still describes the show
 *  rather than disappearing the moment it sells out. */
function offersOf(event: EventItem): JsonLdNode | undefined {
  if (event.tiers.length === 0) return undefined;
  const sellable = event.tiers.filter((t) => !t.soldOut && t.available > 0);
  const priced = (sellable.length > 0 ? sellable : event.tiers).map((t) => t.price);
  if (priced.length === 0) return undefined;

  return {
    "@type": "AggregateOffer",
    priceCurrency: event.currency ?? "USD",
    lowPrice: Math.min(...priced),
    highPrice: Math.max(...priced),
    offerCount: priced.length,
    availability: availabilityOf(event),
    url: eventUrl(event.slug),
  };
}

/** Performers, when the lineup is real people rather than a placeholder. */
function performersOf(event: EventItem): JsonLdNode[] | undefined {
  const named = event.lineup.filter((p) => p.name.trim().length > 0);
  if (named.length === 0) return undefined;
  // PerformingGroup rather than Person: an act may be a duo, a band or a DJ
  // collective, and the data doesn't say which.
  return named.map((p) => ({ "@type": "PerformingGroup", name: p.name }));
}

/**
 * The `Event` node.
 *
 * `eventAttendanceMode` is stated explicitly because Google defaults an
 * unmarked event to *online* in some surfaces, which for a club night is the
 * opposite of true.
 */
export function eventJsonLd(event: EventItem): JsonLdNode {
  const url = eventUrl(event.slug);
  const image = absoluteUrl(event.image);
  const endDate = endDateOf(event);
  const offers = offersOf(event);
  const performer = performersOf(event);
  const description =
    event.description.find((p) => p.trim().length > 0) ?? event.tagline;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": `${url}#event`,
    name: event.title,
    url,
    startDate: startDateOf(event),
    ...(endDate ? { endDate } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(description ? { description } : {}),
    ...(image ? { image: [image] } : {}),
    inLanguage: SITE_LOCALE,
    location: {
      "@type": "Place",
      name: event.venue,
      address: {
        "@type": "PostalAddress",
        // `area` is the district ("Shibuya", "Colombo 07") — the finest-grained
        // location text available, since there is no street field.
        ...(event.area ? { streetAddress: event.area } : {}),
        addressLocality: event.city,
        // addressCountry is deliberately ABSENT. `City` is a free-form string
        // (lib/types.ts) and the catalog currently spans Colombo as well as
        // Japan, so there is nothing to derive it from. Asserting a country
        // here would publish a false location on every event outside it —
        // worse than an incomplete address, because Google would believe it.
        // Add it when the API sends a country, not before.
      },
    },
    ...(performer ? { performer } : {}),
    organizer: {
      "@type": "Organization",
      name: event.organizer.name,
    },
    ...(offers ? { offers } : {}),
    // Only stated when the organizer set one — "0" would claim an all-ages
    // event, which is a different promise from "unspecified".
    ...(event.ageLimit > 0
      ? { typicalAgeRange: `${event.ageLimit}-` }
      : {}),
  };
}

// ---------------------------------------------------------------------------
// Site-level nodes
// ---------------------------------------------------------------------------

export function organizationJsonLd(): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/empire-logo.png`,
  };
}

/**
 * The site node, with the search box Google may surface under the brand
 * result. `/events?q=` is a real, working route — declaring a search action
 * that 404s is a way to lose the feature entirely.
 */
export function webSiteJsonLd(): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}#website`,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: SITE_LOCALE,
    publisher: { "@id": `${SITE_URL}#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/events?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Trail shown in place of the raw url in results. Positions are 1-based. */
export function breadcrumbJsonLd(
  trail: Array<{ name: string; path: string }>,
): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`,
    })),
  };
}
