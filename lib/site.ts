// Canonical identity of the public site: the one place that knows where this
// app is deployed.
//
// Everything that has to emit an ABSOLUTE url goes through here — canonical
// tags, Open Graph, the sitemap, JSON-LD @id values. Relative urls are fine in
// the page itself and wrong in all of those: a crawler resolves them against
// whatever host it happened to fetch, and a canonical pointing at the wrong
// host is worse than none at all (it asks Google to drop the real page).

/**
 * Deployment origin, no trailing slash.
 *
 * `NEXT_PUBLIC_*` is inlined at build time, so a deployed bundle carries the
 * value of the build that produced it — a preview build with the production
 * url would emit canonicals pointing away from itself. Set it per environment.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://empire-jp.sunsec.dev"
).replace(/\/+$/, "");

export const SITE_NAME = "Empire Events";

/** Content is English, aimed at Japan. Used for `<html lang>`, `og:locale`
 *  and the `inLanguage` of the structured data — keep the three in step. */
export const SITE_LOCALE = "en-JP";
/** Open Graph wants the underscore form of the same tag. */
export const OG_LOCALE = "en_JP";

export const SITE_DESCRIPTION =
  "Discover club nights, festivals and live shows across Japan, and get your ticket in seconds. Empire Events is where organizers sell tickets and fans find their next night out.";

/**
 * Resolve a path or partial url to an absolute one.
 *
 * Media is the reason this is not a plain concatenation: uploaded covers come
 * back from the API already absolute (R2 or the API origin), while seeded
 * covers are site-relative paths under `/public`. Both land in `EventItem.image`
 * and both have to end up absolute in `og:image`, which rejects a relative url
 * outright.
 */
export function absoluteUrl(pathOrUrl: string | undefined | null): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/** The site-wide sharing image, used wherever a page has nothing better. */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/empire-logo.png`;
