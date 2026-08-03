import type { MetadataRoute } from "next";
import { getEvents } from "@/lib/api";
import { ARTISTS } from "@/lib/artists";
import { SITE_URL } from "@/lib/site";
import { createLogger } from "@/lib/logger";

const log = createLogger("sitemap");

/** Re-generated hourly. Events are added and sell out continuously, and a
 *  sitemap that lags by a deploy cycle is a sitemap crawlers learn to ignore. */
export const revalidate = 3600;

/**
 * The PUBLIC catalog caps `limit` at 50 — not the 100 the dashboard endpoints
 * allow (`listEventsQuerySchema` in empireJP-BE). Asking for more is a 400,
 * which silently emptied this sitemap of every event.
 *
 * MAX_PAGES bounds the walk so a pagination bug can't spin here forever;
 * 50 × 100 is far more events than the catalog will hold before this needs a
 * proper sitemap index anyway.
 */
const PAGE_SIZE = 50;
const MAX_PAGES = 100;

const staticRoutes: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/events", changeFrequency: "daily", priority: 0.9 },
  { path: "/artists", changeFrequency: "weekly", priority: 0.7 },
  { path: "/organizers", changeFrequency: "monthly", priority: 0.6 },
  { path: "/about", changeFrequency: "yearly", priority: 0.3 },
  { path: "/help", changeFrequency: "monthly", priority: 0.3 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.1 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.1 },
  { path: "/refunds", changeFrequency: "yearly", priority: 0.1 },
];

/**
 * Every public event, past ones included.
 *
 * Past events stay in the sitemap deliberately: the site still renders them
 * (labelled as ended), they hold their inbound links, and removing a url that
 * returns 200 just tells Google the sitemap is unreliable. `upcoming` is left
 * off the query for that reason.
 */
async function eventEntries(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const { events, meta } = await getEvents(
        { page, limit: PAGE_SIZE },
        revalidate,
      );
      for (const event of events) {
        entries.push({
          url: `${SITE_URL}/events/${event.slug}`,
          // No per-event updatedAt in the payload; the start date is the
          // honest signal we do have, and inventing a lastModified is how a
          // sitemap stops being trusted.
          changeFrequency: event.ended ? "yearly" : "daily",
          priority: event.ended ? 0.3 : 0.8,
        });
      }
      if (events.length < PAGE_SIZE || page >= (meta?.totalPages ?? page)) break;
    }
  } catch (err) {
    // A sitemap missing its events is bad; a 500 that makes Search Console
    // drop the whole file is worse. Degrade to the static routes and say so.
    log.error("could not list events for the sitemap", {
      cause: err instanceof Error ? err.message : String(err),
      collected: entries.length,
    });
  }
  return entries;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  return [
    ...staticRoutes.map((r) => ({
      url: `${SITE_URL}${r.path}`,
      lastModified: now,
      changeFrequency: r.changeFrequency,
      priority: r.priority,
    })),
    ...ARTISTS.map((a) => ({
      url: `${SITE_URL}/artists/${a.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...(await eventEntries()),
  ];
}
